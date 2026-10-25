package com.doping.kesif.reward;

import com.doping.kesif.game.*;
import com.doping.kesif.outbox.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.*;
import java.time.*;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class RewardFinalizer {
    @PersistenceContext private EntityManager em;
    private final GameSessionRepository sessions;
    private final SessionPlayerRepository players;
    private final XpLedgerEntryRepository xp;
    private final OutboxEventRepository outbox;
    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;
    private final Clock clock;
    public RewardFinalizer(GameSessionRepository sessions,SessionPlayerRepository players,XpLedgerEntryRepository xp,
            OutboxEventRepository outbox,JdbcTemplate jdbc,ObjectMapper mapper,Clock clock) {
        this.sessions=sessions; this.players=players; this.xp=xp; this.outbox=outbox; this.jdbc=jdbc; this.mapper=mapper; this.clock=clock;
    }

    /** Internal retry/repair entry point. Room lock is shared with all game mutations. */
    public void finalizeSession(UUID id) {
        em.flush();
        List<?> roomIds=em.createNativeQuery("SELECT room_id FROM kesif.kesif_session WHERE id=:id").setParameter("id",id).getResultList();
        if(roomIds.isEmpty()) throw new IllegalArgumentException("Session missing");
        em.createNativeQuery("SELECT id FROM kesif.kesif_room WHERE id=:id FOR UPDATE").setParameter("id",roomIds.getFirst()).getSingleResult();
        GameSession session=sessions.findById(id).orElseThrow(); em.refresh(session);
        if(session.getStatus()!=SessionStatus.COMPLETED) throw new IllegalStateException("Only completed games can award rewards");
        if(session.getRewardsFinalizedAt()!=null) return;
        var rules=session.getRulesSnapshot().get("rewards");
        // Old sessions and explicitly disabled rollouts must not receive a newly invented reward policy.
        if(rules==null) return;
        if(rules.path("version").asInt()!=1||!"SHARED_UNION".equals(rules.path("collectionMapping").asText()))
            throw new IllegalStateException("Unsupported stored reward policy");
        Instant now=clock.instant().truncatedTo(java.time.temporal.ChronoUnit.MICROS);
        // Stable global player ordering prevents deadlocks between sessions sharing collections.
        var roster=players.findBySessionId(id).stream().sorted(Comparator.comparing(p->p.getPlayerId().toString())).toList();
        for(SessionPlayer player:roster) {
            jdbc.update("INSERT INTO kesif.kesif_player_collection(player_id,puzzle_id) VALUES (?,?) ON CONFLICT(player_id,puzzle_id) DO NOTHING",
                player.getPlayerId(),session.getPuzzleId());
            UUID collection=jdbc.queryForObject("SELECT id FROM kesif.kesif_player_collection WHERE player_id=? AND puzzle_id=? FOR UPDATE",
                UUID.class,player.getPlayerId(),session.getPuzzleId());
            int before=jdbc.queryForObject("SELECT count(*) FROM kesif.kesif_collection_piece WHERE collection_id=?",Integer.class,collection);
            int added=jdbc.update("INSERT INTO kesif.kesif_collection_piece(collection_id,puzzle_id,piece_index,source_session_id) "
                +"SELECT ?,?,piece_index,session_id FROM kesif.kesif_piece_unlock WHERE session_id=? "
                +"ON CONFLICT(collection_id,piece_index) DO NOTHING",collection,session.getPuzzleId(),id);
            int count=before+added;
            jdbc.update("UPDATE kesif.kesif_player_collection SET unlocked_count=?,completed_at=CASE WHEN ?=20 THEN COALESCE(completed_at,?) ELSE NULL END, "
                +"updated_at=?,version=version+1 WHERE id=?",count,count,java.sql.Timestamp.from(now),java.sql.Timestamp.from(now),collection);
            player.recordCollectionAdded((short)added);
            award(session,player,XpEventType.SESSION_COMPLETED,rules.path("completionXp").asInt(),"session:"+id+":"+player.getPlayerId()+":completed");
            award(session,player,XpEventType.CORRECT_ANSWER,Math.multiplyExact(player.getCorrectCount(),rules.path("correctAnswerXp").asInt()),
                "session:"+id+":"+player.getPlayerId()+":correct");
            if(before<20&&count==20) award(session,player,XpEventType.COLLECTION_COMPLETED,rules.path("collectionCompletionXp").asInt(),"collection:"+collection+":completed");
        }
        session.finalizeRewards(now);
        outbox.save(new OutboxEvent("SESSION",id,"REWARDS_FINALIZED",session.nextEventSequence(),mapper.valueToTree(Map.of("sessionId",id)),null,0,now));
        em.flush();
    }
    private void award(GameSession session,SessionPlayer player,XpEventType type,int amount,String key) {
        if(amount<0) throw new IllegalStateException("Invalid stored XP");
        if(amount>0) xp.save(new XpLedgerEntry(player.getPlayerId(),session.getId(),type,amount,key));
    }
}
