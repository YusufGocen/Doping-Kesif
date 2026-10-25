package com.doping.kesif;

import com.doping.kesif.game.GameService;
import com.doping.kesif.reward.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;
import java.util.concurrent.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIf;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.*;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.*;
import org.springframework.transaction.annotation.*;
import org.springframework.transaction.support.TransactionTemplate;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc(print=MockMvcPrint.NONE)
@ActiveProfiles("local")
@EnabledIf(value="com.doping.kesif.PostgresTestSupport#databaseAvailable",disabledReason="Test PostgreSQL required")
@Transactional
class RewardIntegrationTest extends PostgresTestSupport {
    @Autowired RewardFinalizer finalizer;
    @Autowired RewardPolicy policy;
    @Autowired ProgressService progress;
    @Autowired GameService games;
    @Autowired JdbcTemplate jdbc;
    @Autowired ObjectMapper mapper;
    @Autowired MockMvc mvc;
    @Autowired PlatformTransactionManager transactions;

    @Test void completedGameAwardsSharedPiecesAndOwnCorrectXpOnce() throws Exception {
        Fixture f=fixture(); UUID session=session(f,range(1,10));
        finalizer.finalizeSession(session); finalizer.finalizeSession(session);
        for(UUID player:List.of(f.first,f.second)) {
            assertThat(xp(player)).isEqualTo(20);
            assertThat(count("SELECT unlocked_count FROM kesif.kesif_player_collection WHERE player_id=? AND puzzle_id=?",player,f.puzzle)).isEqualTo(10);
        }
        var result=progress.result(f.subject,session);
        assertThat(result.rewardsFinalized()).isTrue();
        assertThat(result.players()).allSatisfy(p->{ assertThat(p.collectionAddedCount()).isEqualTo(10); assertThat(p.earnedXp()).isEqualTo(20); });
        assertThat(count("SELECT count(*) FROM kesif.kesif_outbox_event WHERE aggregate_id=? AND event_type='REWARDS_FINALIZED'",session)).isEqualTo(1);
    }

    @Test void multipleGamesUnionPiecesAndAwardCompletionBonusOnlyOnce() throws Exception {
        Fixture f=fixture();
        UUID first=session(f,range(1,10)); finalizer.finalizeSession(first);
        UUID second=session(f,range(11,20)); finalizer.finalizeSession(second);
        UUID third=session(f,range(1,10)); finalizer.finalizeSession(third);
        var collection=progress.collection(f.subject,f.puzzle);
        assertThat(collection.collection().unlockedCount()).isEqualTo(20);
        assertThat(collection.pieces()).hasSize(20).doesNotHaveDuplicates();
        assertThat(collection.collection().completedAt()).isNotNull();
        assertThat(xp(f.first)).isEqualTo(110);
        assertThat(count("SELECT count(*) FROM kesif.kesif_xp_ledger WHERE player_id=? AND event_type='COLLECTION_COMPLETED'",f.first)).isEqualTo(1);
        assertThat(progress.result(f.subject,third).players()).allSatisfy(p->assertThat(p.collectionAddedCount()).isZero());
        assertThat(count("SELECT count(*) FROM kesif.kesif_collection_piece WHERE source_session_id=?",third)).isZero();
        assertThat(progress.result(f.subject,first).players()).allSatisfy(p->assertThat(p.collectionAddedCount()).isEqualTo(10));
    }

    @Test void zeroCorrectGameReceivesOnlyCompletionXpAndNoPieces() throws Exception {
        Fixture f=fixture(); UUID session=session(f,new int[0]); finalizer.finalizeSession(session);
        assertThat(xp(f.first)).isEqualTo(10);
        assertThat(progress.collection(f.subject,f.puzzle).pieces()).isEmpty();
        assertThat(count("SELECT count(*) FROM kesif.kesif_xp_ledger WHERE player_id=?",f.first)).isEqualTo(1);
    }

    @Test void fullCollectionHasSeparatePerPlayerBonus() throws Exception {
        Fixture f=fixture(); UUID session=session(f,range(1,20)); finalizer.finalizeSession(session);
        assertThat(xp(f.first)).isEqualTo(80); assertThat(xp(f.second)).isEqualTo(80);
        assertThat(progress.collection(f.subject,f.puzzle).collection().unlockedCount()).isEqualTo(20);
    }

    @Test void legacyGamesAreNotAwardedCurrentDemoPolicy() throws Exception {
        Fixture f=fixture(); UUID session=session(f,range(1,20));
        jdbc.update("UPDATE kesif.kesif_session SET rules_snapshot='{}'::jsonb WHERE id=?",session);
        finalizer.finalizeSession(session);
        assertThat(xp(f.first)).isZero();
        assertThat(progress.result(f.subject,session).rewardsFinalized()).isFalse();
        assertThat(count("SELECT count(*) FROM kesif.kesif_player_collection WHERE player_id=?",f.first)).isZero();
    }

    @Test void storedPolicyControlsXpEvenWhenDifferentFromCurrentSettings() throws Exception {
        Fixture f=fixture(); UUID session=session(f,range(1,2));
        String changed=mapper.writeValueAsString(Map.of("rewards",Map.of("version",1,"collectionMapping","SHARED_UNION","completionXp",3,"correctAnswerXp",7,"collectionCompletionXp",0)));
        jdbc.update("UPDATE kesif.kesif_session SET rules_snapshot=CAST(? AS jsonb) WHERE id=?",changed,session);
        finalizer.finalizeSession(session); assertThat(xp(f.first)).isEqualTo(10);
    }

    @Test void liveGameCompletionFinalizesRewardsInSameTransaction() throws Exception {
        Fixture f=fixture(); UUID session=session(f,range(1,20));
        jdbc.update("UPDATE kesif.kesif_session SET status='IN_PROGRESS',ended_at=NULL,current_round_no=10 WHERE id=?",session);
        jdbc.update("UPDATE kesif.kesif_room SET status='STARTED' WHERE id=(SELECT room_id FROM kesif.kesif_session WHERE id=?)",session);
        jdbc.update("UPDATE kesif.kesif_round SET status='REVEAL',reveal_deadline_at=now()+interval '1 minute' WHERE session_id=? AND round_no=10",session);
        games.next(f.subject,session,(short)10);
        assertThat(xp(f.first)).isZero();
        games.next(f.secondSubject,session,(short)10);
        assertThat(progress.result(f.subject,session).rewardsFinalized()).isTrue();
        assertThat(xp(f.first)).isEqualTo(80);
        assertThat(count("SELECT count(*) FROM kesif.kesif_outbox_event WHERE aggregate_id=? AND event_type='GAME_COMPLETED'",session)).isEqualTo(1);
    }

    @Test void resultAndPersonalHistoryEnforceIdentityAndValidatePagination() throws Exception {
        Fixture f=fixture(); UUID session=session(f,range(1,2)); finalizer.finalizeSession(session);
        mvc.perform(get("/api/v1/kesif/sessions/"+session+"/result").with(auth(f.subject))).andExpect(status().isOk());
        mvc.perform(get("/api/v1/kesif/sessions/"+session+"/result").with(auth("test:outsider:"+UUID.randomUUID()))).andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/kesif/progress")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/kesif/history").param("page","-1").with(auth(f.subject))).andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/kesif/collections").param("size","101").with(auth(f.subject))).andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/kesif/collections").param("filter","UNKNOWN").with(auth(f.subject))).andExpect(status().isBadRequest());
        assertThat(progress.history(f.subject,0,20).total()).isEqualTo(1);
        assertThat(progress.history(f.subject,1,20).items()).isEmpty();
        assertThat(progress.history(f.secondSubject,0,20).items().getFirst().sessionId()).isEqualTo(session);
        assertThat(progress.history("test:new:"+UUID.randomUUID(),0,20).total()).isZero();
        assertThat(progress.progress(f.subject).totalXp()).isEqualTo(12);
    }

    @Test void collectionsFiltersKeepUntouchedAndPartialPuzzlesDistinct() throws Exception {
        Fixture f=fixture();
        jdbc.update("UPDATE kesif.kesif_puzzle SET active=true WHERE id=?",f.puzzle);
        assertThat(progress.collection(f.subject,f.puzzle).collection().unlockedCount()).isZero();
        assertThat(progress.collections(f.subject,ProgressDtos.CollectionFilter.IN_PROGRESS,0,100).items()).isEmpty();
        UUID session=session(f,range(1,2)); finalizer.finalizeSession(session);
        assertThat(progress.collections(f.subject,ProgressDtos.CollectionFilter.IN_PROGRESS,0,100).items()).extracting(ProgressDtos.CollectionView::puzzleId).containsExactly(f.puzzle);
        assertThat(progress.collections(f.secondSubject,ProgressDtos.CollectionFilter.COMPLETED,0,100).items()).isEmpty();
    }

    @Test @Transactional(propagation=Propagation.NOT_SUPPORTED)
    void concurrentFinalizationCommitsOneRewardSet() throws Exception {
        // Unique inactive catalog fixture is retained: append-only XP must never be disabled for cleanup.
        Fixture f=new TransactionTemplate(transactions).execute(tx->fixture());
        UUID session=new TransactionTemplate(transactions).execute(tx->{ try { return session(f,range(1,20)); } catch(Exception ex) { throw new RuntimeException(ex); } });
        var pool=Executors.newFixedThreadPool(2); var gate=new CountDownLatch(1);
        try {
            var a=pool.submit(()->{gate.await(); finalizer.finalizeSession(session); return true;});
            var b=pool.submit(()->{gate.await(); finalizer.finalizeSession(session); return true;}); gate.countDown();
            a.get(15,TimeUnit.SECONDS); b.get(15,TimeUnit.SECONDS);
            assertThat(xp(f.first)).isEqualTo(80);
            assertThat(count("SELECT count(*) FROM kesif.kesif_xp_ledger WHERE session_id=?",session)).isEqualTo(6);
            assertThat(count("SELECT count(*) FROM kesif.kesif_collection_piece WHERE source_session_id=?",session)).isEqualTo(40);
            assertThat(count("SELECT count(*) FROM kesif.kesif_outbox_event WHERE aggregate_id=?",session)).isEqualTo(1);
        } finally { pool.shutdownNow(); }
    }

    @Test @Transactional(propagation=Propagation.NOT_SUPPORTED)
    void failedRewardWriteRollsBackCollectionsAndCanBeRetried() throws Exception {
        Fixture f=new TransactionTemplate(transactions).execute(tx->fixture());
        UUID session=new TransactionTemplate(transactions).execute(tx->{ try { return session(f,range(1,2)); } catch(Exception ex) { throw new RuntimeException(ex); } });
        String bad=mapper.writeValueAsString(Map.of("rewards",Map.of("version",1,"collectionMapping","SHARED_UNION","completionXp",10,"correctAnswerXp",-1,"collectionCompletionXp",50)));
        jdbc.update("UPDATE kesif.kesif_session SET rules_snapshot=CAST(? AS jsonb) WHERE id=?",bad,session);
        assertThatThrownBy(()->finalizer.finalizeSession(session)).isInstanceOf(IllegalStateException.class);
        assertThat(xp(f.first)).isZero();
        assertThat(count("SELECT count(*) FROM kesif.kesif_player_collection WHERE player_id IN (?,?)",f.first,f.second)).isZero();
        assertThat(count("SELECT count(*) FROM kesif.kesif_outbox_event WHERE aggregate_id=?",session)).isZero();
        assertThat(progress.result(f.subject,session).rewardsFinalized()).isFalse();
        jdbc.update("UPDATE kesif.kesif_session SET rules_snapshot=CAST(? AS jsonb) WHERE id=?",mapper.writeValueAsString(Map.of("rewards",policy.snapshot(mapper))),session);
        finalizer.finalizeSession(session);
        assertThat(xp(f.first)).isEqualTo(12);
        assertThat(progress.result(f.subject,session).rewardsFinalized()).isTrue();
    }

    private Fixture fixture() {
        String subject="reward-test:"+UUID.randomUUID(),other="reward-test:"+UUID.randomUUID();
        UUID first=insert("INSERT INTO kesif.kesif_player_profile(external_user_id,display_name) VALUES (?,'First') RETURNING id",subject);
        UUID second=insert("INSERT INTO kesif.kesif_player_profile(external_user_id,display_name) VALUES (?,'Second') RETURNING id",other);
        UUID puzzle=insert("INSERT INTO kesif.kesif_puzzle(code,title,asset_key,active) VALUES (?,'Reward test','test.png',false) RETURNING id",UUID.randomUUID().toString());
        UUID lesson=insert("INSERT INTO kesif.kesif_subject(code,name,active) VALUES (?,'Reward test',false) RETURNING id",UUID.randomUUID().toString().replace("-",""));
        return new Fixture(first,second,puzzle,lesson,subject,other);
    }
    private UUID session(Fixture f,int[] indices) throws Exception {
        UUID room=insert("INSERT INTO kesif.kesif_room(owner_player_id,group_external_id,join_method,puzzle_id,subject_id,grade_level,rules_snapshot,status,expires_at) VALUES (?,'test','INVITATION',?,?,8,'{}'::jsonb,'CLOSED',now()+interval '2 minutes') RETURNING id",f.first,f.puzzle,f.lesson);
        jdbc.update("INSERT INTO kesif.kesif_room_player(room_id,player_id,slot,active) VALUES (?,?,1,false),(?,?,2,false)",room,f.first,room,f.second);
        String rules=mapper.writeValueAsString(Map.of("rewards",policy.snapshot(mapper),"questionMillis",30000,"revealMillis",10000));
        UUID session=insert("INSERT INTO kesif.kesif_session(room_id,puzzle_id,rules_snapshot,status,current_round_no,revealed_count,piece_order,started_at,ended_at) VALUES (?,?,CAST(? AS jsonb),'COMPLETED',10,?,'[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20]'::jsonb,now()-interval '1 minute',now()) RETURNING id",room,f.puzzle,rules,indices.length);
        jdbc.update("INSERT INTO kesif.kesif_session_player(session_id,room_id,player_id,slot,correct_count,active) VALUES (?,?,?,1,?,false),(?,?,?,2,?,false)",session,room,f.first,(indices.length+1)/2,session,room,f.second,indices.length/2);
        for(int round=0;round<10;round++) {
            UUID id=insert("INSERT INTO kesif.kesif_round(session_id,round_no,question_reference,question_snapshot,correct_option_key,status) VALUES (?,?,?,'{}'::jsonb,'A','COMPLETED') RETURNING id",session,round+1,"q:"+round);
            for(int slot=0;slot<2;slot++) {
                int index=round*2+slot; UUID player=slot==0?f.first:f.second; boolean correct=index<indices.length;
                jdbc.update("INSERT INTO kesif.kesif_round_answer(session_id,round_id,player_id,option_key,correct,source,client_request_id,answered_at) VALUES (?,?,?,'A',?,'SUBMITTED',?,now())",session,id,player,correct,UUID.randomUUID());
                if(correct) jdbc.update("INSERT INTO kesif.kesif_piece_unlock(session_id,round_id,earned_by_player_id,piece_index) VALUES (?,?,?,?)",session,id,player,indices[index]);
            }
        }
        return session;
    }
    private org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.JwtRequestPostProcessor auth(String subject) {
        return jwt().jwt(j->j.subject(subject)).authorities(new SimpleGrantedAuthority("ROLE_STUDENT"));
    }
    private int count(String sql,Object... args) { return jdbc.queryForObject(sql,Integer.class,args); }
    private long xp(UUID player) { return jdbc.queryForObject("SELECT COALESCE(sum(amount),0) FROM kesif.kesif_xp_ledger WHERE player_id=?",Long.class,player); }
    private UUID insert(String sql,Object... args) { return jdbc.queryForObject(sql,UUID.class,args); }
    private int[] range(int start,int end) { return java.util.stream.IntStream.rangeClosed(start,end).toArray(); }
    private record Fixture(UUID first,UUID second,UUID puzzle,UUID lesson,String subject,String secondSubject) { }
}
