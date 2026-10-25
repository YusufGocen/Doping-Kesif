package com.doping.kesif;

import com.doping.kesif.game.*;
import com.doping.kesif.local.LocalDemoSeeder;
import com.fasterxml.jackson.databind.*;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIf;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.*;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.*;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;

@SpringBootTest(properties={"kesif.rewards.enabled=false","kesif.rooms.join-attempts-per-minute=1000","kesif.game.question-duration=PT5M","kesif.game.reveal-duration=PT1M"})
@AutoConfigureMockMvc(print=MockMvcPrint.NONE)
@ActiveProfiles("local")
@EnabledIf(value="com.doping.kesif.PostgresTestSupport#databaseAvailable",disabledReason="Test PostgreSQL required")
class GameIntegrationTest extends PostgresTestSupport {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    @Autowired JdbcTemplate jdbc;
    @Autowired GameService games;
    @Autowired PlatformTransactionManager transactions;
    @MockitoSpyBean Clock clock;
    private final Map<String,String> tokens=new HashMap<>();
    private final List<UUID> rooms=new ArrayList<>();

    @BeforeEach void setup() throws Exception {
        for(String name:List.of("yusuf","ayse","mert")) {
            var response=mvc.perform(post("/api/v1/kesif/dev/auth/token").contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("userKey",name)))).andReturn().getResponse();
            assertThat(response.getStatus()).isEqualTo(200);
            tokens.put(name,mapper.readTree(response.getContentAsString()).get("accessToken").asText());
        }
    }
    @AfterEach void cleanup() {
        reset(clock);
        new TransactionTemplate(transactions).executeWithoutResult(tx->{
            for(UUID room:rooms) {
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
        });
    }

    @Test void onlyOwnerCanStartTwoReadyPlayersAndRetryReturnsSameSession() throws Exception {
        JsonNode room=create(); String path="/rooms/"+room.get("id").asText()+"/start";
        send("yusuf",path,null,409); send("mert",path,null,403);
        joinReady(room); send("ayse",path,null,403);
        JsonNode session=send("yusuf",path,null,200);
        assertThat(send("yusuf",path,null,200).get("id")).isEqualTo(session.get("id"));
        assertThat(jdbc.queryForObject("SELECT count(*) FROM kesif.kesif_round WHERE session_id=?",Integer.class,id(session))).isEqualTo(10);
        assertThat(jdbc.queryForObject("SELECT count(DISTINCT question_reference) FROM kesif.kesif_round WHERE session_id=?",Integer.class,id(session))).isEqualTo(10);
        assertThat(session.get("round").get("correctOptionKey").isNull()).isTrue();
        assertThat(session.get("round").get("answers").isEmpty()).isTrue();
        var active=mvc.perform(get("/api/v1/kesif/sessions/active").header("Authorization","Bearer "+tokens.get("ayse"))).andReturn().getResponse();
        assertThat(active.getStatus()).isEqualTo(200);
        assertThat(mapper.readTree(active.getContentAsString()).get("id")).isEqualTo(session.get("id"));
        assertThat(session.toString()).doesNotContain("correct_option_key","pieceOrder","questionReference");
        send("yusuf","/rooms/"+room.get("id").asText()+"/leave",null,409);
    }

    @Test void fullTenRoundGameAwardsTwentyDistinctPiecesAndReleasesReservations() throws Exception {
        JsonNode game=start(); UUID session=id(game);
        for(int round=1;round<=10;round++) {
            assertThat(game.get("currentRoundNo").asInt()).isEqualTo(round);
            String answer=correct(game);
            JsonNode waiting=answer("yusuf",game,answer,UUID.randomUUID(),200);
            assertThat(waiting.get("round").get("correctOptionKey").isNull()).isTrue();
            assertThat(waiting.get("round").get("answers").isEmpty()).isTrue();
            game=answer("ayse",game,answer,UUID.randomUUID(),200);
            assertThat(game.get("round").get("status").asText()).isEqualTo("REVEAL");
            assertThat(game.get("revealedCount").asInt()).isEqualTo(round*2);
            game=send("yusuf","/sessions/"+session+"/continue",Map.of("roundNo",round),200);
            game=send("ayse","/sessions/"+session+"/continue",Map.of("roundNo",round),200);
        }
        assertThat(game.get("status").asText()).isEqualTo("COMPLETED");
        assertThat(game.get("revealedPieces").size()).isEqualTo(20);
        for(var player:game.get("players")) assertThat(player.get("correctCount").asInt()).isEqualTo(10);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM kesif.kesif_round_answer WHERE session_id=?",Integer.class,session)).isEqualTo(20);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM kesif.kesif_session_player WHERE session_id=? AND active",Integer.class,session)).isZero();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM kesif.kesif_room_player WHERE room_id=? AND active",Integer.class,UUID.fromString(game.get("roomId").asText()))).isZero();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM kesif.kesif_outbox_event WHERE aggregate_id=? AND event_type='GAME_COMPLETED'",Integer.class,session)).isEqualTo(1);
        long seq=game.get("sequence").asLong();
        assertThat(send("ayse","/sessions/"+session+"/continue",Map.of("roundNo",10),200).get("sequence").asLong()).isEqualTo(seq);
        assertThat(getGame("yusuf",session,200).get("sequence").asLong()).isEqualTo(seq);
    }

    @Test void answerRetriesCannotChangeFirstAnswerOrReuseRequestAcrossRounds() throws Exception {
        JsonNode game=start(); UUID request=UUID.randomUUID(); String right=correct(game),wrong=wrong(right);
        answer("yusuf",game,right,request,200);
        long sequence=getGame("yusuf",id(game),200).get("sequence").asLong();
        assertThat(answer("yusuf",game,right,request,200).get("sequence").asLong()).isEqualTo(sequence);
        assertThat(answer("yusuf",game,wrong,request,409).get("code").asText()).isEqualTo("IDEMPOTENCY_CONFLICT");
        assertThat(answer("yusuf",game,wrong,UUID.randomUUID(),409).get("code").asText()).isEqualTo("ANSWER_ALREADY_SUBMITTED");
        game=answer("ayse",game,wrong,UUID.randomUUID(),200);
        assertThat(game.get("revealedCount").asInt()).isEqualTo(1);
        send("yusuf","/sessions/"+id(game)+"/continue",Map.of("roundNo",1),200);
        game=send("ayse","/sessions/"+id(game)+"/continue",Map.of("roundNo",1),200);
        answer("yusuf",game,correct(game),request,409);
    }

    @Test void twoWrongAnswersOpenNoPiecesAndContinueRequiresBothPlayers() throws Exception {
        JsonNode game=start(); String wrong=wrong(correct(game));
        answer("yusuf",game,wrong,UUID.randomUUID(),200);
        game=answer("ayse",game,wrong,UUID.randomUUID(),200);
        assertThat(game.get("revealedCount").asInt()).isZero();
        JsonNode first=send("yusuf","/sessions/"+id(game)+"/continue",Map.of("roundNo",1),200);
        assertThat(first.get("currentRoundNo").asInt()).isEqualTo(1);
        assertThat(send("yusuf","/sessions/"+id(game)+"/continue",Map.of("roundNo",1),200).get("sequence")).isEqualTo(first.get("sequence"));
        JsonNode next=send("ayse","/sessions/"+id(game)+"/continue",Map.of("roundNo",1),200);
        assertThat(next.get("currentRoundNo").asInt()).isEqualTo(2);
        assertThat(send("ayse","/sessions/"+id(game)+"/continue",Map.of("roundNo",1),200).get("currentRoundNo").asInt()).isEqualTo(2);
    }

    @Test void exactDeadlineRecordsTimeoutAndDoesNotAcceptLateAnswer() throws Exception {
        JsonNode game=start(); String right=correct(game);
        answer("yusuf",game,right,UUID.randomUUID(),200);
        Instant deadline=Instant.parse(game.get("round").get("deadlineAt").asText());
        doReturn(deadline).when(clock).instant();
        JsonNode result=answer("ayse",game,right,UUID.randomUUID(),200);
        assertThat(result.get("round").get("status").asText()).isEqualTo("REVEAL");
        assertThat(result.get("revealedCount").asInt()).isEqualTo(1);
        assertThat(result.get("round").get("answers").toString()).contains("TIMEOUT");
        long sequence=result.get("sequence").asLong(); games.processDeadline(id(game));
        assertThat(getGame("yusuf",id(game),200).get("sequence").asLong()).isEqualTo(sequence);
        doReturn(Instant.parse(result.get("round").get("revealDeadlineAt").asText())).when(clock).instant();
        games.processDeadline(id(game));
        assertThat(getGame("yusuf",id(game),200).get("currentRoundNo").asInt()).isEqualTo(2);
    }

    @Test void persistedDeadlinesRecoverAllRoundsAfterLongDowntime() throws Exception {
        JsonNode game=start(); doReturn(Instant.now().plusSeconds(4000)).when(clock).instant();
        games.processDeadline(id(game));
        JsonNode result=getGame("ayse",id(game),200);
        assertThat(result.get("status").asText()).isEqualTo("COMPLETED");
        assertThat(result.get("revealedCount").asInt()).isZero();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM kesif.kesif_round_answer WHERE session_id=? AND source='TIMEOUT'",Integer.class,id(game))).isEqualTo(20);
    }

    @Test void participantsOnlyAndInvalidOptionsHaveNoSideEffects() throws Exception {
        JsonNode game=start(); getGame("mert",id(game),404);
        answer("mert",game,correct(game),UUID.randomUUID(),404);
        answer("yusuf",game,"Z",UUID.randomUUID(),422);
        send("yusuf","/sessions/"+id(game)+"/continue",Map.of("roundNo",1),409);
        var unknown=Map.of("clientRequestId",UUID.randomUUID(),"optionKey","A","correct",true);
        send("yusuf",answerPath(game),unknown,400);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM kesif.kesif_round_answer WHERE session_id=?",Integer.class,id(game))).isZero();
        assertThat(mvc.perform(get("/api/v1/kesif/sessions/"+id(game))).andReturn().getResponse().getStatus()).isEqualTo(401);
    }

    @Test void selectedQuestionSnapshotsSurviveBankEdits() throws Exception {
        JsonNode game=start(); UUID session=id(game);
        UUID question=jdbc.queryForObject("SELECT question_reference::uuid FROM kesif.kesif_round WHERE id=?",UUID.class,UUID.fromString(game.get("round").get("id").asText()));
        String original=jdbc.queryForObject("SELECT body::text FROM kesif.kesif_question WHERE id=?",String.class,question);
        try {
            jdbc.update("UPDATE kesif.kesif_question SET body=CAST(? AS jsonb) WHERE id=?","{\"text\":\"changed\"}",question);
            assertThat(getGame("yusuf",session,200).get("round").get("question")).isEqualTo(game.get("round").get("question"));
        } finally { jdbc.update("UPDATE kesif.kesif_question SET body=CAST(? AS jsonb) WHERE id=?",original,question); }
    }

    @Test void concurrentStartCreatesOneSession() throws Exception {
        JsonNode room=create(); joinReady(room); UUID roomId=id(room);
        var results=concurrent(()->games.start("local:yusuf",roomId),()->games.start("local:yusuf",roomId));
        assertThat(results.get(0).id()).isEqualTo(results.get(1).id());
        assertThat(jdbc.queryForObject("SELECT count(*) FROM kesif.kesif_session WHERE room_id=?",Integer.class,roomId)).isEqualTo(1);
    }

    @Test void concurrentAnswersResolveExactlyOnce() throws Exception {
        JsonNode game=start(); UUID session=id(game),round=UUID.fromString(game.get("round").get("id").asText()); String right=correct(game);
        concurrent(()->games.answer("local:yusuf",session,round,new GameDtos.AnswerRequest(UUID.randomUUID(),right)),
            ()->games.answer("local:ayse",session,round,new GameDtos.AnswerRequest(UUID.randomUUID(),right)));
        JsonNode result=getGame("yusuf",session,200);
        assertThat(result.get("revealedCount").asInt()).isEqualTo(2);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM kesif.kesif_outbox_event WHERE aggregate_id=? AND event_type='ROUND_REVEALED'",Integer.class,session)).isEqualTo(1);
    }

    @Test void concurrentSameRequestWritesOneAnswer() throws Exception {
        JsonNode game=start(); UUID session=id(game),round=UUID.fromString(game.get("round").get("id").asText());
        var request=new GameDtos.AnswerRequest(UUID.randomUUID(),correct(game));
        concurrent(()->games.answer("local:yusuf",session,round,request),()->games.answer("local:yusuf",session,round,request));
        assertThat(jdbc.queryForObject("SELECT count(*) FROM kesif.kesif_round_answer WHERE round_id=?",Integer.class,round)).isEqualTo(1);
    }

    @Test void allTopicsSelectionAlsoProducesTenQuestions() throws Exception {
        JsonNode room=create(false); joinReady(room);
        JsonNode game=send("yusuf","/rooms/"+id(room)+"/start",null,200);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM kesif.kesif_round WHERE session_id=?",Integer.class,id(game))).isEqualTo(10);
    }

    @Test void startRechecksQuestionPoolAndExpiredLobby() throws Exception {
        JsonNode room=create(); joinReady(room);
        List<UUID> hidden=jdbc.queryForList("SELECT id FROM kesif.kesif_question WHERE topic_id=? AND status='PUBLISHED' LIMIT 3",UUID.class,LocalDemoSeeder.ALGEBRA_ID);
        try {
            for(UUID question:hidden) jdbc.update("UPDATE kesif.kesif_question SET status='DRAFT' WHERE id=?",question);
            assertThat(send("yusuf","/rooms/"+id(room)+"/start",null,422).get("code").asText()).isEqualTo("INSUFFICIENT_QUESTIONS");
            assertThat(jdbc.queryForObject("SELECT count(*) FROM kesif.kesif_session WHERE room_id=?",Integer.class,id(room))).isZero();
        } finally { for(UUID question:hidden) jdbc.update("UPDATE kesif.kesif_question SET status='PUBLISHED' WHERE id=?",question); }
        doReturn(Instant.parse(room.get("expiresAt").asText()).plusSeconds(1)).when(clock).instant();
        send("yusuf","/rooms/"+id(room)+"/start",null,410);
    }

    @Test void futureRoundCannotReceiveAnswersAndContinueTimeoutRaceDoesNotSkipRound() throws Exception {
        JsonNode game=start(); UUID session=id(game);
        UUID future=jdbc.queryForObject("SELECT id FROM kesif.kesif_round WHERE session_id=? AND round_no=2",UUID.class,session);
        send("yusuf","/sessions/"+session+"/rounds/"+future+"/answers",Map.of("clientRequestId",UUID.randomUUID(),"optionKey","A"),200);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM kesif.kesif_round_answer WHERE round_id=?",Integer.class,future)).isZero();
        String right=correct(game); answer("yusuf",game,right,UUID.randomUUID(),200);
        game=answer("ayse",game,right,UUID.randomUUID(),200);
        doReturn(Instant.parse(game.get("round").get("revealDeadlineAt").asText())).when(clock).instant();
        concurrent(()->games.next("local:yusuf",session,(short)1),()->{games.processDeadline(session); return games.snapshot("local:ayse",session);});
        assertThat(getGame("yusuf",session,200).get("currentRoundNo").asInt()).isEqualTo(2);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM kesif.kesif_outbox_event WHERE aggregate_id=? AND event_type='QUESTION_OPENED'",Integer.class,session)).isEqualTo(2);
    }

    @ParameterizedTest
    @ValueSource(ints={5,6,7,8})
    void authoredTopicsProduceTenDistinctQuestionsOnlyFromSelectedGradeSubjectAndTopic(int grade) throws Exception {
        var topics=jdbc.queryForList("SELECT id,subject_id FROM kesif.kesif_topic WHERE grade_level=? AND code LIKE 'LOCAL_%' ORDER BY code",grade);
        assertThat(topics).hasSize(8);
        UUID puzzle=jdbc.queryForObject("SELECT id FROM kesif.kesif_puzzle WHERE code='DEMO_HISTORY'",UUID.class);
        for(var topic:topics) {
            var selection=Map.of("groupId","local-group-8a","puzzleId",puzzle,"subjectId",topic.get("subject_id"),"gradeLevel",grade,"topicId",topic.get("id"));
            JsonNode room=send("yusuf","/rooms",Map.of("clientRequestId",UUID.randomUUID(),"selection",selection),201);
            rooms.add(id(room)); joinReady(room);
            JsonNode game=send("yusuf","/rooms/"+id(room)+"/start",null,200);
            assertThat(jdbc.queryForObject("SELECT count(DISTINCT r.question_reference) FROM kesif.kesif_round r JOIN kesif.kesif_question q ON q.id::text=r.question_reference WHERE r.session_id=? AND q.topic_id=?",Integer.class,id(game),topic.get("id"))).isEqualTo(10);
            assertThat(game.get("round").get("correctOptionKey").isNull()).isTrue();
            for(int round=1;round<=10;round++) {
                game=answer("yusuf",game,correct(game),UUID.randomUUID(),200);
                game=answer("ayse",game,correct(game),UUID.randomUUID(),200);
                send("yusuf","/sessions/"+id(game)+"/continue",Map.of("roundNo",round),200);
                game=send("ayse","/sessions/"+id(game)+"/continue",Map.of("roundNo",round),200);
            }
            assertThat(game.get("status").asText()).isEqualTo("COMPLETED");
        }
    }

    private List<GameDtos.SessionView> concurrent(Callable<GameDtos.SessionView> first,Callable<GameDtos.SessionView> second) throws Exception {
        var pool=Executors.newFixedThreadPool(2); var gate=new CountDownLatch(1);
        try {
            var a=pool.submit(()->{gate.await(); return first.call();}); var b=pool.submit(()->{gate.await(); return second.call();}); gate.countDown();
            return List.of(a.get(15,TimeUnit.SECONDS),b.get(15,TimeUnit.SECONDS));
        } finally { pool.shutdownNow(); }
    }
    private JsonNode create() throws Exception { return create(true); }
    private JsonNode create(boolean withTopic) throws Exception {
        UUID puzzle=jdbc.queryForObject("SELECT id FROM kesif.kesif_puzzle WHERE code='DEMO_HISTORY'",UUID.class);
        var selection=new HashMap<String,Object>(Map.of("groupId","local-group-8a","puzzleId",puzzle,"subjectId",LocalDemoSeeder.MATH_ID,"gradeLevel",8));
        if(withTopic) selection.put("topicId",LocalDemoSeeder.ALGEBRA_ID);
        JsonNode room=send("yusuf","/rooms",Map.of("clientRequestId",UUID.randomUUID(),"selection",selection),201); rooms.add(id(room)); return room;
    }
    private void joinReady(JsonNode room) throws Exception {
        send("ayse","/rooms/join",Map.of("code",room.get("joinCode").asText()),200);
        for(String user:List.of("yusuf","ayse")) send(user,"/rooms/"+id(room)+"/ready",Map.of("ready",true),200);
    }
    private JsonNode start() throws Exception { JsonNode room=create(); joinReady(room); return send("yusuf","/rooms/"+id(room)+"/start",null,200); }
    private String correct(JsonNode game) { return jdbc.queryForObject("SELECT correct_option_key FROM kesif.kesif_round WHERE id=?",String.class,UUID.fromString(game.get("round").get("id").asText())); }
    private String wrong(String right) { return right.equals("A")?"B":"A"; }
    private UUID id(JsonNode node) { return UUID.fromString(node.get("id").asText()); }
    private String answerPath(JsonNode game) { return "/sessions/"+id(game)+"/rounds/"+game.get("round").get("id").asText()+"/answers"; }
    private JsonNode answer(String user,JsonNode game,String option,UUID request,int status) throws Exception {
        return send(user,answerPath(game),Map.of("clientRequestId",request,"optionKey",option),status);
    }
    private JsonNode send(String user,String path,Object body,int status) throws Exception {
        var request=post("/api/v1/kesif"+path).header("Authorization","Bearer "+tokens.get(user));
        if(body!=null) request.contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsString(body));
        var response=mvc.perform(request).andReturn().getResponse();
        assertThat(response.getStatus()).as(path+": "+response.getContentAsString()).isEqualTo(status);
        return mapper.readTree(response.getContentAsString());
    }
    private JsonNode getGame(String user,UUID session,int status) throws Exception {
        var response=mvc.perform(get("/api/v1/kesif/sessions/"+session).header("Authorization","Bearer "+tokens.get(user))).andReturn().getResponse();
        assertThat(response.getStatus()).as(response.getContentAsString()).isEqualTo(status); return mapper.readTree(response.getContentAsString());
    }
}
