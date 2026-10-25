package com.doping.kesif;

import com.doping.kesif.local.LocalDemoSeeder;
import com.doping.kesif.room.LobbyService;
import com.fasterxml.jackson.databind.*;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIf;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.*;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.*;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import com.doping.kesif.boutique.BoutiqueGroupGateway;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;

@SpringBootTest(properties="kesif.rooms.join-attempts-per-minute=1000")
@AutoConfigureMockMvc(print=MockMvcPrint.NONE)
@ActiveProfiles("local")
@EnabledIf(value="com.doping.kesif.PostgresTestSupport#databaseAvailable",disabledReason="Test PostgreSQL required")
class LobbyIntegrationTest extends PostgresTestSupport {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    @Autowired JdbcTemplate jdbc;
    @Autowired LobbyService lobby;
    @Autowired PlatformTransactionManager transactions;
    @MockitoSpyBean BoutiqueGroupGateway gateway;
    private final Set<UUID> requestIds=ConcurrentHashMap.newKeySet();
    private final Map<String,String> tokens=new HashMap<>();
    private UUID puzzle;

    @BeforeEach void identities() throws Exception {
        puzzle=jdbc.queryForObject("SELECT id FROM kesif.kesif_puzzle WHERE code='DEMO_HISTORY'",UUID.class);
        for(String user:List.of("yusuf","ayse","mert","zeynep","emir")) {
            MvcResult result=mvc.perform(post("/api/v1/kesif/dev/auth/token").contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("userKey",user)))).andReturn();
            assertThat(result.getResponse().getStatus()).isEqualTo(200);
            tokens.put(user,read(result).get("accessToken").asText());
        }
    }
    @AfterEach void cleanupOnlyThisTestsRequests() {
        new TransactionTemplate(transactions).executeWithoutResult(tx->{
            for(UUID request:requestIds) for(UUID room:jdbc.queryForList("SELECT id FROM kesif.kesif_room WHERE creation_request_id=?",UUID.class,request)) {
                jdbc.update("DELETE FROM kesif.kesif_outbox_event WHERE aggregate_type='ROOM' AND aggregate_id=?",room);
                jdbc.update("DELETE FROM kesif.kesif_invitation WHERE room_id=?",room);
                jdbc.update("DELETE FROM kesif.kesif_room_player WHERE room_id=?",room);
                jdbc.update("DELETE FROM kesif.kesif_room WHERE id=?",room);
            }
        });
    }

    @Test void codeRoomJoinsAndReadyFlagsRecoverFromSnapshots() throws Exception {
        ObjectNode request=creation(); JsonNode room=postOk("yusuf","/rooms",request,201);
        UUID id=uuid(room,"id"); String code=room.get("joinCode").asText();
        assertThat(code).hasSize(8); assertThat(room.get("players").size()).isEqualTo(1);
        JsonNode joined=postOk("ayse","/rooms/join",Map.of("code",code.toLowerCase(Locale.ROOT)),200);
        assertThat(joined.get("status").asText()).isEqualTo("FULL"); assertThat(joined.get("joinCode").isNull()).isTrue();
        JsonNode again=postOk("ayse","/rooms/join",Map.of("code",code),200);
        assertThat(again.get("sequence")).isEqualTo(joined.get("sequence"));
        postOk("yusuf","/rooms/"+id+"/ready",Map.of("ready",true),200);
        assertThat(postOk("ayse","/rooms/"+id+"/ready",Map.of("ready",true),200).get("readyToStart").asBoolean()).isTrue();
        long sequence=getOk("yusuf","/rooms/"+id,200).get("sequence").asLong();
        assertThat(postOk("yusuf","/rooms/"+id+"/ready",Map.of("ready",true),200).get("sequence").asLong()).isEqualTo(sequence);
        assertThat(getOk("ayse","/rooms/active",200).get("id").asText()).isEqualTo(id.toString());
        assertThat(jdbc.queryForObject("SELECT count(*) FROM kesif.kesif_session WHERE room_id=?",Integer.class,id)).isZero();
        assertThat(postOk("ayse","/rooms/"+id+"/ready",Map.of("ready",false),200).get("readyToStart").asBoolean()).isFalse();
    }

    @Test void creationRetryIsStableButChangedPayloadIsRejected() throws Exception {
        ObjectNode request=creation(); JsonNode first=postOk("yusuf","/rooms",request,201);
        JsonNode retry=postOk("yusuf","/rooms",request,201);
        assertThat(retry.get("id")).isEqualTo(first.get("id")); assertThat(retry.get("joinCode")).isEqualTo(first.get("joinCode"));
        ((ObjectNode)request.get("selection")).putNull("topicId");
        assertThat(postOk("yusuf","/rooms",request,409).get("code").asText()).isEqualTo("IDEMPOTENCY_CONFLICT");
        assertThat(jdbc.queryForObject("SELECT count(*) FROM kesif.kesif_outbox_event WHERE aggregate_id=?",Integer.class,uuid(first,"id"))).isEqualTo(1);
    }

    @Test void onlySameGroupMembersAndActualParticipantsCanReadOrJoin() throws Exception {
        JsonNode room=postOk("yusuf","/rooms",creation(),201); String id=room.get("id").asText();
        postOk("emir","/rooms/join",Map.of("code",room.get("joinCode").asText()),403);
        getOk("mert","/rooms/"+id,404);
        postOk("mert","/rooms/"+id+"/ready",Map.of("ready",true),404);
        postOk("ayse","/rooms/join",Map.of("code",room.get("joinCode").asText()),200);
        postOk("ayse","/rooms/"+id+"/cancel",null,403);
        postOk("mert","/rooms/join",Map.of("code",room.get("joinCode").asText()),409);
    }

    @Test void invitedStudentAloneCanAcceptAndOnlyOnce() throws Exception {
        ObjectNode request=creation(); request.put("inviteeExternalUserId","local:ayse");
        JsonNode invite=postOk("yusuf","/invitations",request,201);
        assertThat(postOk("yusuf","/invitations",request,201).get("id")).isEqualTo(invite.get("id"));
        assertThat(getOk("ayse","/invitations/incoming",200).size()).isEqualTo(1);
        assertThat(getOk("mert","/invitations/incoming",200).size()).isZero();
        String accept="/invitations/"+invite.get("id").asText()+"/accept";
        postOk("mert",accept,null,404); postOk("yusuf",accept,null,404);
        JsonNode room=postOk("ayse",accept,null,200);
        assertThat(postOk("ayse",accept,null,200).get("sequence")).isEqualTo(room.get("sequence"));
        assertThat(room.get("players").size()).isEqualTo(2);
        assertThat(getOk("ayse","/invitations/incoming",200).size()).isZero();
    }

    @Test void rejectAndCancelAreIdempotentAndReleaseOwnerReservation() throws Exception {
        ObjectNode request=creation(); request.put("inviteeExternalUserId","local:ayse");
        JsonNode invite=postOk("yusuf","/invitations",request,201); String id=invite.get("id").asText();
        postOk("mert","/invitations/"+id+"/reject",null,404);
        assertThat(postOk("ayse","/invitations/"+id+"/reject",null,200).get("status").asText()).isEqualTo("REJECTED");
        postOk("ayse","/invitations/"+id+"/reject",null,200); getOk("yusuf","/rooms/active",204);
        ObjectNode next=creation(); next.put("inviteeExternalUserId","local:ayse");
        JsonNode second=postOk("yusuf","/invitations",next,201); String secondId=second.get("id").asText();
        postOk("ayse","/invitations/"+secondId+"/cancel",null,404);
        postOk("yusuf","/invitations/"+secondId+"/cancel",null,200);
        postOk("yusuf","/invitations/"+secondId+"/cancel",null,200);
        postOk("ayse","/invitations/"+secondId+"/accept",null,409);
        postOk("yusuf","/rooms",creation(),201);
    }

    @Test void leavingClosesTheTwoPlayerLobbyWithoutReopeningIt() throws Exception {
        JsonNode room=postOk("yusuf","/rooms",creation(),201); UUID id=uuid(room,"id");
        postOk("ayse","/rooms/join",Map.of("code",room.get("joinCode").asText()),200);
        JsonNode left=postOk("ayse","/rooms/"+id+"/leave",null,200);
        assertThat(left.get("status").asText()).isEqualTo("CANCELLED");
        assertThat(postOk("ayse","/rooms/"+id+"/leave",null,200).get("sequence")).isEqualTo(left.get("sequence"));
        assertThat(jdbc.queryForObject("SELECT count(*) FROM kesif.kesif_room_player WHERE room_id=? AND active",Integer.class,id)).isZero();
        postOk("mert","/rooms/join",Map.of("code",room.get("joinCode").asText()),404);
        postOk("yusuf","/rooms",creation(),201);
    }

    @Test void expiryReleasesReservationsAndRejectsAcceptance() throws Exception {
        ObjectNode request=creation(); request.put("inviteeExternalUserId","local:ayse");
        JsonNode invite=postOk("yusuf","/invitations",request,201); UUID id=uuid(invite,"roomId");
        expire(id);
        postOk("ayse","/invitations/"+invite.get("id").asText()+"/accept",null,410);
        assertThat(getOk("ayse","/invitations/incoming",200).size()).isZero();
        assertThat(lobby.expireDueRooms()).isGreaterThanOrEqualTo(1);
        assertThat(getOk("yusuf","/rooms/"+id,200).get("status").asText()).isEqualTo("EXPIRED");
        postOk("yusuf","/rooms",creation(),201);
    }

    @Test void expiredSnapshotCanReleaseTheReservationWithoutWaitingForWorker() throws Exception {
        JsonNode room=postOk("yusuf","/rooms",creation(),201); UUID id=uuid(room,"id"); expire(id);
        assertThat(getOk("yusuf","/rooms/active",200).get("status").asText()).isEqualTo("EXPIRED");
        getOk("yusuf","/rooms/active",204); postOk("yusuf","/rooms",creation(),201);
    }

    @Test void invalidSelectionsAndSelfOrOutsideGroupInvitesLeaveNoRoom() throws Exception {
        ObjectNode bad=creation(); ((ObjectNode)bad.get("selection")).put("gradeLevel",7);
        postOk("yusuf","/rooms",bad,422);
        UUID emptyTopic=UUID.randomUUID();
        jdbc.update("INSERT INTO kesif.kesif_topic(id,subject_id,grade_level,code,name,active) VALUES (?,?,7,?,'Empty test topic',true)",
            emptyTopic,LocalDemoSeeder.MATH_ID,"EMPTY_"+emptyTopic);
        try {
            ObjectNode insufficient=creation(); ((ObjectNode)insufficient.get("selection")).put("gradeLevel",7).put("topicId",emptyTopic.toString());
            assertThat(postOk("yusuf","/rooms",insufficient,422).get("code").asText()).isEqualTo("INSUFFICIENT_QUESTIONS");
        } finally { jdbc.update("DELETE FROM kesif.kesif_topic WHERE id=?",emptyTopic); }
        ObjectNode outside=creation(); outside.put("inviteeExternalUserId","local:emir"); postOk("yusuf","/invitations",outside,403);
        ObjectNode self=creation(); self.put("inviteeExternalUserId","local:yusuf"); postOk("yusuf","/invitations",self,422);
        ObjectNode allTopics=creation(); ((ObjectNode)allTopics.get("selection")).putNull("topicId"); postOk("yusuf","/rooms",allTopics,201);
    }

    @Test void busyInviteeCannotOccupyTwoRooms() throws Exception {
        postOk("ayse","/rooms",creation(),201);
        ObjectNode request=creation(); request.put("inviteeExternalUserId","local:ayse");
        JsonNode invite=postOk("yusuf","/invitations",request,201);
        assertThat(postOk("ayse","/invitations/"+invite.get("id").asText()+"/accept",null,409).get("code").asText()).isEqualTo("PLAYER_BUSY");
        assertThat(jdbc.queryForObject("SELECT status FROM kesif.kesif_invitation WHERE id=?",String.class,uuid(invite,"id"))).isEqualTo("PENDING");
    }

    @Test void invalidPaginationAndReadyBodiesAreRejectedBeforeMutation() throws Exception {
        getOk("ayse","/invitations/incoming?page=2147483647&size=100",400);
        getOk("ayse","/invitations/incoming?page=-1",400);
        getOk("ayse","/invitations/incoming?size=101",400);
        JsonNode room=postOk("yusuf","/rooms",creation(),201);
        String path="/rooms/"+room.get("id").asText()+"/ready";
        postOk("yusuf",path,Map.of(),400);
        postOk("yusuf",path,Map.of("ready",true,"playerId",UUID.randomUUID().toString()),400);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM kesif.kesif_room_player WHERE room_id=? AND ready",Integer.class,uuid(room,"id"))).isZero();
    }

    @RepeatedTest(3) void simultaneousJoinsProduceOnlyOneGuest() throws Exception {
        JsonNode room=postOk("yusuf","/rooms",creation(),201); UUID id=uuid(room,"id"); String code=room.get("joinCode").asText();
        var results=parallel(()->postResult("ayse","/rooms/join",Map.of("code",code)),()->postResult("mert","/rooms/join",Map.of("code",code)));
        assertThat(results.stream().map(r->r.getResponse().getStatus()).toList()).containsExactlyInAnyOrder(200,409);
        for(MvcResult result:results) if(result.getResponse().getStatus()==409) assertThat(read(result).get("code").asText()).isEqualTo("ROOM_FULL");
        assertThat(jdbc.queryForObject("SELECT count(*) FROM kesif.kesif_room_player WHERE room_id=? AND active",Integer.class,id)).isEqualTo(2);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM kesif.kesif_outbox_event WHERE aggregate_id=? AND event_type='ROOM_PLAYER_JOINED'",Integer.class,id)).isEqualTo(1);
    }

    @Test void simultaneousCreationRetriesProduceOneRoom() throws Exception {
        ObjectNode request=creation();
        var results=parallel(()->postResult("yusuf","/rooms",request),()->postResult("yusuf","/rooms",request));
        assertThat(results.stream().map(r->r.getResponse().getStatus()).toList()).containsOnly(201);
        assertThat(read(results.get(0)).get("id")).isEqualTo(read(results.get(1)).get("id"));
        assertThat(jdbc.queryForObject("SELECT count(*) FROM kesif.kesif_room WHERE creation_request_id=?",Integer.class,UUID.fromString(request.get("clientRequestId").asText()))).isEqualTo(1);
    }

    @RepeatedTest(3) void concurrentDoubleAcceptCreatesOneMembershipAndNoSession() throws Exception {
        ObjectNode request=creation(); request.put("inviteeExternalUserId","local:ayse");
        JsonNode invite=postOk("yusuf","/invitations",request,201); String path="/invitations/"+invite.get("id").asText()+"/accept";
        var results=parallel(()->postResult("ayse",path,null),()->postResult("ayse",path,null));
        assertThat(results.stream().map(r->r.getResponse().getStatus()).toList()).containsOnly(200);
        UUID room=uuid(invite,"roomId");
        assertThat(jdbc.queryForObject("SELECT count(*) FROM kesif.kesif_room_player WHERE room_id=?",Integer.class,room)).isEqualTo(2);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM kesif.kesif_outbox_event WHERE aggregate_id=? AND event_type='INVITATION_ACCEPTED'",Integer.class,room)).isEqualTo(1);
    }

    @Test void crossJoiningBusyRoomsDoesNotDeadlock() throws Exception {
        JsonNode a=postOk("yusuf","/rooms",creation(),201),b=postOk("ayse","/rooms",creation(),201);
        var results=parallel(()->postResult("yusuf","/rooms/join",Map.of("code",b.get("joinCode").asText())),
            ()->postResult("ayse","/rooms/join",Map.of("code",a.get("joinCode").asText())));
        assertThat(results.stream().map(r->r.getResponse().getStatus()).toList()).containsOnly(409);
    }

    @Test void crossInvitationsDoNotDeadlockOnPlayerForeignKeys() throws Exception {
        ObjectNode a=creation(); a.put("inviteeExternalUserId","local:ayse");
        ObjectNode b=creation(); b.put("inviteeExternalUserId","local:yusuf");
        var results=parallel(()->postResult("yusuf","/invitations",a),()->postResult("ayse","/invitations",b));
        assertThat(results.stream().map(r->r.getResponse().getStatus()).toList()).containsOnly(201);
    }

    @Test void ownerMembershipIsRecheckedAtCodeJoinAndInvitationAcceptance() throws Exception {
        JsonNode room=postOk("yusuf","/rooms",creation(),201);
        org.mockito.Mockito.doReturn(List.of()).when(gateway).groupsFor("local:yusuf");
        postOk("ayse","/rooms/join",Map.of("code",room.get("joinCode").asText()),403);
        postOk("yusuf","/rooms/"+room.get("id").asText()+"/cancel",null,200);
        org.mockito.Mockito.doCallRealMethod().when(gateway).groupsFor("local:yusuf");
        ObjectNode request=creation(); request.put("inviteeExternalUserId","local:ayse");
        JsonNode invite=postOk("yusuf","/invitations",request,201);
        org.mockito.Mockito.doReturn(List.of()).when(gateway).groupsFor("local:yusuf");
        postOk("ayse","/invitations/"+invite.get("id").asText()+"/accept",null,403);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM kesif.kesif_room_player WHERE room_id=?",Integer.class,uuid(invite,"roomId"))).isEqualTo(1);
    }

    @Test void readinessRechecksBothPlayersCurrentMembership() throws Exception {
        JsonNode room=postOk("yusuf","/rooms",creation(),201); String id=room.get("id").asText();
        postOk("ayse","/rooms/join",Map.of("code",room.get("joinCode").asText()),200);
        org.mockito.Mockito.doReturn(List.of()).when(gateway).groupsFor("local:ayse");
        postOk("yusuf","/rooms/"+id+"/ready",Map.of("ready",true),403);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM kesif.kesif_room_player WHERE room_id=? AND ready",Integer.class,UUID.fromString(id))).isZero();
    }

    @Test void codeIsAbsentFromDatabaseAndOutboxAndOldKeyRoomsAreExpired() throws Exception {
        JsonNode room=postOk("yusuf","/rooms",creation(),201); UUID id=uuid(room,"id"); String code=room.get("joinCode").asText();
        assertThat(jdbc.queryForObject("SELECT code_digest FROM kesif.kesif_room WHERE id=?",String.class,id)).isNotEqualTo(code).hasSize(64);
        assertThat(jdbc.queryForList("SELECT payload::text FROM kesif.kesif_outbox_event WHERE aggregate_id=?",String.class,id)).allSatisfy(payload->assertThat(payload).doesNotContain(code));
        assertThat(room.toString()).doesNotContain("codeDigest","creationRequestId","rulesSnapshot");
        jdbc.update("UPDATE kesif.kesif_room SET code_digest=? WHERE id=?","0".repeat(64),id);
        lobby.expireUnrecoverableCodeRooms();
        assertThat(getOk("yusuf","/rooms/"+id,200).get("status").asText()).isEqualTo("EXPIRED");
    }

    private void expire(UUID id) {
        jdbc.update("UPDATE kesif.kesif_room SET created_at=now()-interval '10 minutes',expires_at=now()-interval '1 minute' WHERE id=?",id);
        jdbc.update("UPDATE kesif.kesif_invitation SET created_at=now()-interval '10 minutes',expires_at=now()-interval '1 minute' WHERE room_id=?",id);
    }
    private ObjectNode creation() {
        UUID request=UUID.randomUUID(); requestIds.add(request);
        ObjectNode body=mapper.createObjectNode().put("clientRequestId",request.toString());
        body.putObject("selection").put("groupId","local-group-8a").put("puzzleId",puzzle.toString())
            .put("subjectId",LocalDemoSeeder.MATH_ID.toString()).put("gradeLevel",8).put("topicId",LocalDemoSeeder.ALGEBRA_ID.toString());
        return body;
    }
    private MvcResult postResult(String user,String path,Object body) throws Exception {
        var request=post("/api/v1/kesif"+path).header("Authorization","Bearer "+tokens.get(user));
        if(body!=null) request.contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsBytes(body));
        return mvc.perform(request).andReturn();
    }
    private JsonNode postOk(String user,String path,Object body,int expected) throws Exception {
        var result=postResult(user,path,body); assertThat(result.getResponse().getStatus()).as(path).isEqualTo(expected); return read(result);
    }
    private JsonNode getOk(String user,String path,int expected) throws Exception {
        var result=mvc.perform(get("/api/v1/kesif"+path).header("Authorization","Bearer "+tokens.get(user))).andReturn();
        assertThat(result.getResponse().getStatus()).as(path).isEqualTo(expected);
        return expected==204?mapper.nullNode():read(result);
    }
    private JsonNode read(MvcResult result) throws Exception { return mapper.readTree(result.getResponse().getContentAsString(StandardCharsets.UTF_8)); }
    private UUID uuid(JsonNode node,String field) { return UUID.fromString(node.get(field).asText()); }
    private List<MvcResult> parallel(Callable<MvcResult> a,Callable<MvcResult> b) throws Exception {
        ExecutorService executor=Executors.newFixedThreadPool(2); CountDownLatch start=new CountDownLatch(1);
        try {
            Future<MvcResult> first=executor.submit(()->{start.await();return a.call();});
            Future<MvcResult> second=executor.submit(()->{start.await();return b.call();}); start.countDown();
            return List.of(first.get(20,TimeUnit.SECONDS),second.get(20,TimeUnit.SECONDS));
        } finally { executor.shutdownNow(); }
    }
}
