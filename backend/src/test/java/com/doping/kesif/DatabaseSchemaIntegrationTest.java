package com.doping.kesif;

import com.doping.kesif.catalog.*;
import com.doping.kesif.player.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.sql.*;
import java.util.UUID;
import java.util.concurrent.*;
import javax.sql.DataSource;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIf;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("local")
@EnabledIf(value = "com.doping.kesif.PostgresTestSupport#databaseAvailable", disabledReason = "Docker or explicit test PostgreSQL required")
class DatabaseSchemaIntegrationTest extends PostgresTestSupport {
    @Autowired DataSource dataSource;
    @Autowired PlayerProfileRepository players;
    @Autowired SubjectRepository subjects;
    @Autowired TopicRepository topics;
    @Autowired QuestionRepository questions;
    @Autowired QuestionOptionRepository options;
    @Autowired ObjectMapper mapper;

    @Test @Transactional
    void jpaPersistsAndQueriesCatalogWithJsonAndEnums() {
        PlayerProfile player = players.saveAndFlush(new PlayerProfile("test-" + UUID.randomUUID(), "Test student"));
        assertThat(players.findByExternalUserId(player.getExternalUserId())).isPresent();
        Subject subject = subjects.saveAndFlush(new Subject("M-" + UUID.randomUUID().toString().substring(0,8), "Matematik", true));
        Topic topic = topics.saveAndFlush(new Topic(subject.getId(), (short)8, "ALGEBRA", "Cebir", true));
        var body = mapper.createObjectNode().put("text", "x + 1 = 2");
        Question question = questions.saveAndFlush(new Question(topic.getId(), null, body, null, 1, QuestionStatus.DRAFT));
        options.saveAndFlush(new QuestionOption(question.getId(), "A", body, true));
        assertThat(topics.findBySubjectIdAndGradeLevelAndActiveTrue(subject.getId(), (short)8)).hasSize(1);
        assertThat(options.findByQuestionId(question.getId())).hasSize(1);
        body.put("text", "mutated");
        assertThat(question.getBody().get("text").asText()).isEqualTo("x + 1 = 2");
        assertThat(player.getId()).isNotNull();
        assertThat(player.getCreatedAt()).isNotNull();
    }

    @Test void enforcesRoomCapacityMembershipAndGrade() throws Exception {
        try (Connection c = transaction()) {
            Fixture f = fixture(c);
            rejected(c, "23514", "INSERT INTO kesif.kesif_room_player(room_id,player_id,slot) VALUES (?,?,3)", f.room, f.outsider);
            rejected(c, "23505", "INSERT INTO kesif.kesif_room_player(room_id,player_id,slot) VALUES (?,?,2)", f.room, f.outsider);
            UUID otherTopic = insert(c, "INSERT INTO kesif.kesif_topic(subject_id,grade_level,code,name) VALUES (?,7,'T','Topic') RETURNING id", f.subject);
            rejected(c, "23503", "UPDATE kesif.kesif_room SET topic_id=? WHERE id=?", otherTopic, f.room);
            c.rollback();
        }
    }

    @Test void enforcesAnswerUniquenessMembershipAndTimeoutShape() throws Exception {
        try (Connection c = transaction()) {
            Fixture f = fixture(c);
            String answer = "INSERT INTO kesif.kesif_round_answer(session_id,round_id,player_id,option_key,correct,source,client_request_id,answered_at) VALUES (?,?,?,'A',true,'SUBMITTED',?,now())";
            rejected(c,"23503",answer,f.session,f.round,f.outsider,UUID.randomUUID());
            execute(c,answer,f.session,f.round,f.first,UUID.randomUUID());
            rejected(c,"23505",answer,f.session,f.round,f.first,UUID.randomUUID());
            rejected(c,"23514","INSERT INTO kesif.kesif_round_answer(session_id,round_id,player_id,correct,source,answered_at) VALUES (?,?,?,true,'TIMEOUT',now())",f.session,f.round,f.second);
            c.rollback();
        }
    }

    @Test void enforcesRoomCodeAndActiveReservationUniqueness() throws Exception {
        try (Connection c = transaction()) {
            Fixture f = fixture(c);
            String roomSql = "INSERT INTO kesif.kesif_room(owner_player_id,group_external_id,join_method,code_digest,puzzle_id,subject_id,grade_level,rules_snapshot,status,expires_at) VALUES (?,'test-group','CODE',?,?,?,8,'{}'::jsonb,'OPEN',now()+interval '2 minutes') RETURNING id";
            String digest = "test-digest:" + UUID.randomUUID();
            UUID secondRoom = insert(c, roomSql, f.outsider, digest, f.puzzle, f.subject);
            rejected(c,"23505",roomSql,f.first,digest,f.puzzle,f.subject);
            rejected(c,"23505","INSERT INTO kesif.kesif_room_player(room_id,player_id,slot) VALUES (?,?,1)",secondRoom,f.first);
            c.rollback();
        }
    }

    @Test void requiresOwnerMembershipAtTransactionBoundaryAndRejectsEleventhRound() throws Exception {
        try (Connection c = transaction()) {
            Fixture f = fixture(c);
            rejected(c,"23514","INSERT INTO kesif.kesif_round(session_id,round_no,question_reference,question_snapshot,correct_option_key,status) VALUES (?,11,'q-11','{}'::jsonb,'A','PENDING')",f.session);
            insert(c,"INSERT INTO kesif.kesif_room(owner_player_id,group_external_id,join_method,puzzle_id,subject_id,grade_level,rules_snapshot,status,expires_at) VALUES (?,'test-group','INVITATION',?,?,8,'{}'::jsonb,'OPEN',now()+interval '2 minutes') RETURNING id",f.outsider,f.puzzle,f.subject);
            rejected(c,"23503","SET CONSTRAINTS kesif.fk_room_owner_membership IMMEDIATE");
            c.rollback();
        }
    }

    @Test void enforcesPuzzlePermutationAndImmutableQuestionSnapshot() throws Exception {
        try (Connection c = transaction()) {
            Fixture f = fixture(c);
            rejected(c,"23514","UPDATE kesif.kesif_session SET piece_order='[1,1]'::jsonb WHERE id=?",f.session);
            rejected(c,"23514","UPDATE kesif.kesif_session SET piece_order='{}'::jsonb WHERE id=?",f.session);
            rejected(c,"23514","UPDATE kesif.kesif_round SET correct_option_key='B' WHERE id=?",f.round);
            rejected(c,"23514","UPDATE kesif.kesif_round SET question_snapshot=CAST(? AS jsonb) WHERE id=?","{\"text\":\"changed\"}",f.round);
            execute(c,"UPDATE kesif.kesif_round SET status='REVEAL' WHERE id=?",f.round);
            c.rollback();
        }
    }

    @Test void enforcesSinglePiecePerAnswerAndTwentyPieceLimit() throws Exception {
        try (Connection c = transaction()) {
            Fixture f = fixture(c);
            execute(c,"INSERT INTO kesif.kesif_round_answer(session_id,round_id,player_id,option_key,correct,source,client_request_id,answered_at) VALUES (?,?,?,'A',true,'SUBMITTED',?,now())",f.session,f.round,f.first,UUID.randomUUID());
            String unlock="INSERT INTO kesif.kesif_piece_unlock(session_id,round_id,earned_by_player_id,piece_index) VALUES (?,?,?,?)";
            rejected(c,"23514",unlock,f.session,f.round,f.first,21);
            execute(c,unlock,f.session,f.round,f.first,1);
            rejected(c,"23505",unlock,f.session,f.round,f.first,2);
            c.rollback();
        }
    }

    @Test void enforcesCollectionXpAndOutboxDeduplication() throws Exception {
        try (Connection c = transaction()) {
            Fixture f=fixture(c);
            UUID collection=insert(c,"INSERT INTO kesif.kesif_player_collection(player_id,puzzle_id) VALUES (?,?) RETURNING id",f.first,f.puzzle);
            rejected(c,"23514","UPDATE kesif.kesif_player_collection SET unlocked_count=20 WHERE id=?",collection);
            String piece="INSERT INTO kesif.kesif_collection_piece(collection_id,puzzle_id,piece_index,source_session_id) VALUES (?,?,1,?)";
            execute(c,piece,collection,f.puzzle,f.session);
            rejected(c,"23505",piece,collection,f.puzzle,f.session);
            String xp="INSERT INTO kesif.kesif_xp_ledger(player_id,session_id,event_type,amount,dedupe_key) VALUES (?,?,'SESSION_COMPLETED',1,?)";
            String key="test:"+UUID.randomUUID();
            execute(c,xp,f.first,f.session,key);
            rejected(c,"23505",xp,f.first,f.session,key);
            rejected(c,"23514","UPDATE kesif.kesif_xp_ledger SET amount=2 WHERE dedupe_key=?",key);
            rejected(c,"23514","DELETE FROM kesif.kesif_xp_ledger WHERE dedupe_key=?",key);
            rejected(c,"23503",xp,f.outsider,f.session,"other:"+UUID.randomUUID());
            String outbox="INSERT INTO kesif.kesif_outbox_event(aggregate_type,aggregate_id,event_type,sequence_number,payload) VALUES ('SESSION',?,'TEST',1,'{}'::jsonb)";
            execute(c,outbox,f.session);
            rejected(c,"23505",outbox,f.session);
            c.rollback();
        }
    }

    @Test void sessionPuzzleMustMatchItsSourceRoom() throws Exception {
        try (Connection c = transaction()) {
            Fixture f = fixture(c);
            UUID differentPuzzle = insert(c,"INSERT INTO kesif.kesif_puzzle(code,title,asset_key) VALUES (?,'Other','other.png') RETURNING id",UUID.randomUUID().toString());
            rejected(c,"23503","UPDATE kesif.kesif_session SET puzzle_id=? WHERE id=?",differentPuzzle,f.session);
            c.rollback();
        }
    }

    @Test void concurrentDuplicateAnswersProduceExactlyOneRow() throws Exception {
        Fixture f;
        try(Connection c=transaction()) { f=fixture(c); c.commit(); }
        ExecutorService executor=Executors.newFixedThreadPool(2);
        CountDownLatch start=new CountDownLatch(1);
        try {
            Callable<String> submit=()->{
                start.await(10,TimeUnit.SECONDS);
                try(Connection c=dataSource.getConnection()) {
                    execute(c,"INSERT INTO kesif.kesif_round_answer(session_id,round_id,player_id,option_key,correct,source,client_request_id,answered_at) VALUES (?,?,?,'A',true,'SUBMITTED',?,now())",f.session,f.round,f.first,UUID.randomUUID());
                    return "OK";
                } catch(SQLException e) { return e.getSQLState(); }
            };
            Future<String> a=executor.submit(submit), b=executor.submit(submit);
            start.countDown();
            assertThat(java.util.List.of(a.get(20,TimeUnit.SECONDS),b.get(20,TimeUnit.SECONDS))).containsExactlyInAnyOrder("OK","23505");
            try(Connection c=dataSource.getConnection(); PreparedStatement statement=c.prepareStatement("SELECT count(*) FROM kesif.kesif_round_answer WHERE round_id=?")) {
                statement.setObject(1,f.round);
                try(ResultSet result=statement.executeQuery()) { result.next(); assertThat(result.getInt(1)).isEqualTo(1); }
            }
        } finally {
            executor.shutdownNow();
            try(Connection c=transaction()) {
                execute(c,"DELETE FROM kesif.kesif_round_answer WHERE session_id=?",f.session);
                execute(c,"DELETE FROM kesif.kesif_round WHERE session_id=?",f.session);
                execute(c,"DELETE FROM kesif.kesif_session_player WHERE session_id=?",f.session);
                execute(c,"DELETE FROM kesif.kesif_session WHERE id=?",f.session);
                execute(c,"DELETE FROM kesif.kesif_room_player WHERE room_id=?",f.room);
                execute(c,"DELETE FROM kesif.kesif_room WHERE id=?",f.room);
                execute(c,"DELETE FROM kesif.kesif_puzzle WHERE id=?",f.puzzle);
                execute(c,"DELETE FROM kesif.kesif_subject WHERE id=?",f.subject);
                execute(c,"DELETE FROM kesif.kesif_player_profile WHERE id IN (?,?,?)",f.first,f.second,f.outsider);
                c.commit();
            }
        }
    }

    private Connection transaction() throws SQLException {
        Connection c=dataSource.getConnection(); c.setAutoCommit(false); return c;
    }
    private static void rejected(Connection c,String sqlState,String sql,Object...args) throws SQLException {
        Savepoint savepoint=c.setSavepoint();
        try { assertThatThrownBy(()->execute(c,sql,args)).isInstanceOf(SQLException.class).satisfies(e->assertThat(((SQLException)e).getSQLState()).isEqualTo(sqlState)); }
        finally { c.rollback(savepoint); c.releaseSavepoint(savepoint); }
    }
    private static void execute(Connection c,String sql,Object...args) throws SQLException {
        try(PreparedStatement s=c.prepareStatement(sql)) { bind(s,args); s.executeUpdate(); }
    }
    private static UUID insert(Connection c,String sql,Object...args) throws SQLException {
        try(PreparedStatement s=c.prepareStatement(sql)) {
            bind(s,args);
            try(ResultSet r=s.executeQuery()) { r.next(); return r.getObject(1,UUID.class); }
        }
    }
    private static void bind(PreparedStatement s,Object[] args) throws SQLException {
        for(int i=0;i<args.length;i++) s.setObject(i+1,args[i]);
    }
    private static Fixture fixture(Connection c) throws SQLException {
        UUID first=insert(c,"INSERT INTO kesif.kesif_player_profile(external_user_id) VALUES (?) RETURNING id","test:"+UUID.randomUUID());
        UUID second=insert(c,"INSERT INTO kesif.kesif_player_profile(external_user_id) VALUES (?) RETURNING id","test:"+UUID.randomUUID());
        UUID outsider=insert(c,"INSERT INTO kesif.kesif_player_profile(external_user_id) VALUES (?) RETURNING id","test:"+UUID.randomUUID());
        UUID subject=insert(c,"INSERT INTO kesif.kesif_subject(code,name) VALUES (?,'Test') RETURNING id",UUID.randomUUID().toString().substring(0,8));
        UUID puzzle=insert(c,"INSERT INTO kesif.kesif_puzzle(code,title,asset_key) VALUES (?,'Test','test.png') RETURNING id",UUID.randomUUID().toString());
        UUID room=insert(c,"INSERT INTO kesif.kesif_room(owner_player_id,group_external_id,join_method,puzzle_id,subject_id,grade_level,rules_snapshot,status,expires_at) VALUES (?,'test-group','INVITATION',?,?,8,'{}'::jsonb,'FULL',now()+interval '2 minutes') RETURNING id",first,puzzle,subject);
        execute(c,"INSERT INTO kesif.kesif_room_player(room_id,player_id,slot) VALUES (?,?,1),(?,?,2)",room,first,room,second);
        UUID session=insert(c,"INSERT INTO kesif.kesif_session(room_id,puzzle_id,rules_snapshot,status,piece_order) VALUES (?,?,'{}'::jsonb,'READY','[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20]'::jsonb) RETURNING id",room,puzzle);
        execute(c,"INSERT INTO kesif.kesif_session_player(session_id,room_id,player_id,slot) VALUES (?,?,?,1),(?,?,?,2)",session,room,first,session,room,second);
        UUID round=insert(c,"INSERT INTO kesif.kesif_round(session_id,round_no,question_reference,question_snapshot,correct_option_key,status) VALUES (?,1,'test-question','{}'::jsonb,'A','PENDING') RETURNING id",session);
        return new Fixture(first,second,outsider,subject,puzzle,room,session,round);
    }
    private record Fixture(UUID first,UUID second,UUID outsider,UUID subject,UUID puzzle,UUID room,UUID session,UUID round) { }
}
