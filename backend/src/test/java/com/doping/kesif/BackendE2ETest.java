package com.doping.kesif;

import com.doping.kesif.local.LocalQuestionBank;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.WebSocket;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.condition.EnabledIf;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import static org.assertj.core.api.Assertions.assertThat;

/** Real HTTP + scheduled outbox + real WebSocket; no MockMvc, mocks or direct game service calls. */
@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT, properties={
    "kesif.game.question-duration=PT5M", "kesif.game.reveal-duration=PT1M"})
@ActiveProfiles("local")
@DirtiesContext(classMode=DirtiesContext.ClassMode.AFTER_CLASS)
@EnabledIf(value="com.doping.kesif.PostgresTestSupport#databaseAvailable", disabledReason="Test PostgreSQL required")
class BackendE2ETest {
    @LocalServerPort int port;
    @Autowired ObjectMapper mapper;
    @Autowired JdbcTemplate jdbc;
    @Autowired PlatformTransactionManager transactions;
    private final HttpClient http=HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
    private final Map<String,String> tokens=new HashMap<>();
    private final List<SocketClient> sockets=new ArrayList<>();
    private UUID puzzleId;

    @DynamicPropertySource static void database(DynamicPropertyRegistry registry) {
        PostgresTestSupport.database(registry);
        registry.add("kesif.realtime.worker-enabled",()->"true");
    }

    @AfterEach void cleanup() {
        sockets.forEach(c->c.socket.abort());
        // Preserve append-only XP and its source history; hide only this test's private puzzle.
        if(puzzleId!=null) new TransactionTemplate(transactions).executeWithoutResult(tx->{
            for(UUID room:jdbc.queryForList("SELECT id FROM kesif.kesif_room WHERE puzzle_id=?",UUID.class,puzzleId)) {
                if(jdbc.queryForObject("SELECT count(*) FROM kesif.kesif_xp_ledger x JOIN kesif.kesif_session s ON s.id=x.session_id WHERE s.room_id=?",Integer.class,room)>0) continue;
                for(UUID session:jdbc.queryForList("SELECT id FROM kesif.kesif_session WHERE room_id=?",UUID.class,room)) {
                    jdbc.update("DELETE FROM kesif.kesif_outbox_event WHERE aggregate_type='SESSION' AND aggregate_id=?",session);
                    jdbc.update("DELETE FROM kesif.kesif_piece_unlock WHERE session_id=?",session);
                    jdbc.update("DELETE FROM kesif.kesif_round_answer WHERE session_id=?",session);
                    jdbc.update("DELETE FROM kesif.kesif_round WHERE session_id=?",session);
                    jdbc.update("DELETE FROM kesif.kesif_session_player WHERE session_id=?",session);
                    jdbc.update("DELETE FROM kesif.kesif_session WHERE id=?",session);
                }
                jdbc.update("DELETE FROM kesif.kesif_outbox_event WHERE aggregate_type='ROOM' AND aggregate_id=?",room);
                jdbc.update("DELETE FROM kesif.kesif_invitation WHERE room_id=?",room);
                jdbc.update("DELETE FROM kesif.kesif_room_player WHERE room_id=?",room);
                jdbc.update("DELETE FROM kesif.kesif_room WHERE id=?",room);
            }
            jdbc.update("UPDATE kesif.kesif_puzzle SET active=false WHERE id=?",puzzleId);
        });
    }

    @ParameterizedTest(name="Complete two-player API game; invitation={0}")
    @ValueSource(booleans={false,true})
    void completeGameThroughHttpAndWebSocketIncludingReconnectAndRewards(boolean invitation) throws Exception {
        for(String user:List.of("yusuf","ayse","mert","emir")) {
            tokens.put(user,request(null,"POST","/dev/auth/token",Map.of("userKey",user),200).path("accessToken").asText());
        }
        request(null,"GET","/catalog/grades",null,401);
        request("yusuf","GET","/me",null,200);
        request("ayse","GET","/me",null,200);
        JsonNode ownerBefore=request("yusuf","GET","/progress",null,200);
        JsonNode guestBefore=request("ayse","GET","/progress",null,200);
        var subjects=request("yusuf","GET","/catalog/subjects?grade=5",null,200);
        JsonNode subject=find(subjects,"code","LOCAL_TURKISH");
        var topics=request("yusuf","GET","/catalog/topics?grade=5&subjectId="+subject.path("id").asText(),null,200);
        JsonNode topic=find(topics,"code","LOCAL_TURKISH_5_WORDS");
        assertThat(topic.path("availableQuestionCount").asInt()).isEqualTo(10);
        var authored=LocalQuestionBank.load(mapper).subjects().stream().filter(s->s.code().equals("TURKISH"))
            .flatMap(s->s.topics().stream()).filter(t->t.code().equals("TURKISH_5_WORDS")).findFirst().orElseThrow();

        // Test-only fixture setup. Every state transition below goes through authenticated network APIs.
        puzzleId=UUID.randomUUID();
        jdbc.update("INSERT INTO kesif.kesif_puzzle(id,code,title,asset_key,piece_count,active) VALUES (?,?,?,'test/e2e',20,true)",
            puzzleId,"E2E_"+puzzleId,"E2E "+puzzleId);
        assertThat(find(request("yusuf","GET","/puzzles",null,200),"id",puzzleId.toString()).isMissingNode()).isFalse();
        SocketClient owner=connect("yusuf");
        SocketClient guest=connect("ayse");
        var selection=Map.of("groupId","local-group-8a","puzzleId",puzzleId,"subjectId",subject.path("id").asText(),
            "gradeLevel",5,"topicId",topic.path("id").asText());
        String roomId;
        if(invitation) {
            var body=Map.of("clientRequestId",UUID.randomUUID(),"selection",selection,"inviteeExternalUserId","local:ayse");
            JsonNode invite=request("yusuf","POST","/invitations",body,201);
            roomId=invite.path("roomId").asText();
            assertThat(request("yusuf","POST","/invitations",body,201).path("id")).isEqualTo(invite.path("id"));
            assertThat(find(request("ayse","GET","/invitations/incoming",null,200),"id",invite.path("id").asText()).isMissingNode()).isFalse();
            guest.event("INVITATION_RECEIVED",roomId);
            request("ayse","POST","/invitations/"+invite.path("id").asText()+"/accept",null,200);
        } else {
            var body=Map.of("clientRequestId",UUID.randomUUID(),"selection",selection);
            JsonNode room=request("yusuf","POST","/rooms",body,201);
            roomId=room.path("id").asText();
            assertThat(request("yusuf","POST","/rooms",body,201).path("id")).isEqualTo(room.path("id"));
            request("emir","POST","/rooms/join",Map.of("code",room.path("joinCode").asText()),403);
            request("ayse","POST","/rooms/join",Map.of("code",room.path("joinCode").asText()),200);
            request("mert","POST","/rooms/join",Map.of("code",room.path("joinCode").asText()),409);
        }
        for(String user:List.of("yusuf","ayse")) request(user,"POST","/rooms/"+roomId+"/ready",Map.of("ready",true),200);
        request("ayse","POST","/rooms/"+roomId+"/start",null,403);
        JsonNode game=request("yusuf","POST","/rooms/"+roomId+"/start",null,200);
        String session=game.path("id").asText();
        assertThat(request("yusuf","POST","/rooms/"+roomId+"/start",null,200).path("id").asText()).isEqualTo(session);
        owner.event("QUESTION_OPENED",session);
        assertThat(request("ayse","GET","/sessions/active",null,200).path("id").asText()).isEqualTo(session);
        request("mert","GET","/sessions/"+session,null,404);
        request("yusuf","GET","/sessions/"+session+"/result",null,409);
        var seen=new java.util.HashSet<String>();
        for(int round=1;round<=10;round++) {
            assertThat(game.path("currentRoundNo").asInt()).isEqualTo(round);
            JsonNode current=game.path("round");
            String text=current.path("question").path("body").path("text").asText();
            assertThat(seen.add(text)).isTrue();
            var item=authored.questions().stream().filter(q->q.text().equals(text)).findFirst().orElseThrow();
            String correctText=item.options().get(item.correctIndex());
            String correctKey="";
            for(var option:current.path("question").path("options")) {
                if(option.path("body").path("text").asText().equals(correctText)) correctKey=option.path("key").asText();
            }
            assertThat(correctKey).isNotBlank();
            assertThat(current.path("correctOptionKey").isNull()).isTrue();
            assertThat(current.path("answers").isEmpty()).isTrue();
            String answerPath="/sessions/"+session+"/rounds/"+current.path("id").asText()+"/answers";
            var answer=Map.of("clientRequestId",UUID.randomUUID(),"optionKey",correctKey);
            JsonNode waiting=request("yusuf","POST",answerPath,answer,200);
            assertThat(waiting.path("round").path("correctOptionKey").isNull()).isTrue();
            assertThat(request("yusuf","POST",answerPath,answer,200).path("sequence")).isEqualTo(waiting.path("sequence"));
            if(round==5) {
                guest.socket.sendClose(1000,"reconnect test").get(5,TimeUnit.SECONDS);
                guest=connect("ayse");
                JsonNode restored=request("ayse","GET","/sessions/active",null,200);
                assertThat(restored.path("id").asText()).isEqualTo(session);
                assertThat(restored.path("currentRoundNo").asInt()).isEqualTo(5);
                assertThat(restored.path("sequence").asLong()).isGreaterThanOrEqualTo(waiting.path("sequence").asLong());
            }
            game=request("ayse","POST",answerPath,Map.of("clientRequestId",UUID.randomUUID(),"optionKey",correctKey),200);
            assertThat(game.path("round").path("status").asText()).isEqualTo("REVEAL");
            assertThat(game.path("revealedCount").asInt()).isEqualTo(round*2);
            assertThat(game.path("round").path("answers").size()).isEqualTo(2);
            request("yusuf","POST","/sessions/"+session+"/continue",Map.of("roundNo",round),200);
            game=request("ayse","POST","/sessions/"+session+"/continue",Map.of("roundNo",round),200);
        }
        assertThat(seen).hasSize(10);
        assertThat(game.path("status").asText()).isEqualTo("COMPLETED");
        guest.event("GAME_COMPLETED",session);
        owner.event("REWARDS_FINALIZED",session);
        for(String user:List.of("yusuf","ayse")) {
            JsonNode result=request(user,"GET","/sessions/"+session+"/result",null,200);
            assertThat(result.path("rewardsFinalized").asBoolean()).isTrue();
            assertThat(result.path("revealedCount").asInt()).isEqualTo(20);
            for(var player:result.path("players")) {
                assertThat(player.path("correctCount").asInt()).isEqualTo(10);
                assertThat(player.path("earnedXp").asInt()).isEqualTo(80);
                assertThat(player.path("collectionAddedCount").asInt()).isEqualTo(20);
            }
            JsonNode collection=request(user,"GET","/collections/"+puzzleId,null,200);
            assertThat(collection.path("collection").path("unlockedCount").asInt()).isEqualTo(20);
            assertThat(collection.path("pieces").size()).isEqualTo(20);
            assertThat(find(request(user,"GET","/history?size=100",null,200).path("items"),"sessionId",session).path("earnedXp").asInt()).isEqualTo(80);
            JsonNode progress=request(user,"GET","/progress",null,200);
            JsonNode before=user.equals("yusuf")?ownerBefore:guestBefore;
            assertThat(progress.path("totalXp").asLong()-before.path("totalXp").asLong()).isEqualTo(80);
            assertThat(progress.path("completedGames").asLong()-before.path("completedGames").asLong()).isEqualTo(1);
            request(user,"GET","/sessions/"+session+"/result",null,200);
            request(user,"POST","/sessions/"+session+"/continue",Map.of("roundNo",10),200);
            assertThat(request(user,"GET","/progress",null,200)).isEqualTo(progress);
            request(user,"GET","/sessions/active",null,204);
            request(user,"GET","/rooms/active",null,204);
        }
        request("mert","GET","/sessions/"+session+"/result",null,404);
    }

    private JsonNode request(String user,String method,String path,Object body,int status) throws Exception {
        var builder=HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+port+"/api/v1/kesif"+path)).timeout(Duration.ofSeconds(15));
        if(user!=null) builder.header("Authorization","Bearer "+tokens.get(user));
        if(body!=null) builder.header("Content-Type","application/json");
        builder.method(method,body==null?HttpRequest.BodyPublishers.noBody():HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(body)));
        var response=http.send(builder.build(),HttpResponse.BodyHandlers.ofString());
        assertThat(response.statusCode()).as(method+" "+path).isEqualTo(status);
        return response.body().isBlank()?mapper.nullNode():mapper.readTree(response.body());
    }
    private JsonNode find(JsonNode array,String field,String value) {
        for(var item:array) if(item.path(field).asText().equals(value)) return item;
        throw new AssertionError("Missing "+field+"="+value);
    }
    private SocketClient connect(String user) throws Exception {
        var client=new SocketClient();
        client.socket=http.newWebSocketBuilder().header("Origin","http://localhost:5173")
            .buildAsync(URI.create("ws://127.0.0.1:"+port+"/api/v1/kesif/ws"),client).get(10,TimeUnit.SECONDS);
        sockets.add(client);
        client.socket.sendText(mapper.writeValueAsString(Map.of("type","AUTH","token",tokens.get(user))),true).get(5,TimeUnit.SECONDS);
        JsonNode ready=client.next(10);
        assertThat(ready.path("type").asText()).isEqualTo("READY");
        assertThat(ready.path("resyncRequired").asBoolean()).isTrue();
        return client;
    }
    private class SocketClient implements WebSocket.Listener {
        WebSocket socket;
        final BlockingQueue<String> messages=new LinkedBlockingQueue<>();
        final StringBuilder partial=new StringBuilder();
        @Override public void onOpen(WebSocket ws) { ws.request(1); }
        @Override public CompletionStage<?> onText(WebSocket ws,CharSequence text,boolean last) {
            partial.append(text); if(last) { messages.add(partial.toString()); partial.setLength(0); } ws.request(1); return null;
        }
        JsonNode next(long seconds) throws Exception {
            String frame=messages.poll(seconds,TimeUnit.SECONDS);
            assertThat(frame).as("WebSocket frame").isNotNull(); return mapper.readTree(frame);
        }
        void event(String type,String aggregate) throws Exception {
            long deadline=System.nanoTime()+TimeUnit.SECONDS.toNanos(15);
            while(System.nanoTime()<deadline) {
                String raw=messages.poll(1,TimeUnit.SECONDS);
                if(raw==null) continue;
                JsonNode frame=mapper.readTree(raw);
                assertThat(frame.has("payload")).isFalse();
                if(frame.path("eventType").asText().equals(type)&&frame.path("aggregateId").asText().equals(aggregate)) return;
            }
            throw new AssertionError("Missing WebSocket event: "+type);
        }
    }
}
