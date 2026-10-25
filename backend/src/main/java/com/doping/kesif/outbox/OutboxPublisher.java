package com.doping.kesif.outbox;

import com.doping.kesif.realtime.*;
import java.time.*;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Single application instance delivery; add a shared broker before running multiple instances. */
@Service
public class OutboxPublisher {
    private final JdbcTemplate jdbc;
    private final EventSink sink;
    private final Clock clock;
    public OutboxPublisher(JdbcTemplate jdbc,EventSink sink,Clock clock) { this.jdbc=jdbc; this.sink=sink; this.clock=clock; }
    private record Pending(UUID id,String type,UUID aggregate,String event,long sequence,Instant created,int attempts) { }
    @Transactional
    public boolean publishNext() {
        Instant now=clock.instant();
        var pending=jdbc.query("SELECT e.* FROM kesif.kesif_outbox_event e WHERE e.published_at IS NULL AND e.available_at<=? "
            +"AND NOT EXISTS(SELECT 1 FROM kesif.kesif_outbox_event earlier WHERE earlier.aggregate_type=e.aggregate_type "
            +"AND earlier.aggregate_id=e.aggregate_id AND earlier.sequence_number<e.sequence_number AND earlier.published_at IS NULL) "
            +"ORDER BY e.created_at,e.id LIMIT 1 FOR UPDATE OF e SKIP LOCKED",
            (rs,n)->new Pending(rs.getObject("id",UUID.class),rs.getString("aggregate_type"),rs.getObject("aggregate_id",UUID.class),
                rs.getString("event_type"),rs.getLong("sequence_number"),rs.getTimestamp("created_at").toInstant(),rs.getInt("attempts")),java.sql.Timestamp.from(now));
        if(pending.isEmpty()) return false;
        Pending event=pending.getFirst();
        try {
            Set<UUID> recipients=recipients(event);
            sink.publish(recipients,new RealtimeEvent("EVENT",event.id,event.type,event.aggregate,event.event,event.sequence,event.created));
            jdbc.update("UPDATE kesif.kesif_outbox_event SET published_at=?,updated_at=?,version=version+1 WHERE id=?",
                java.sql.Timestamp.from(now),java.sql.Timestamp.from(now),event.id);
        } catch(RuntimeException failure) {
            long delay=Math.min(60,1L<<Math.min(6,event.attempts+1));
            jdbc.update("UPDATE kesif.kesif_outbox_event SET attempts=LEAST(attempts+1,1000000),available_at=?,updated_at=?,version=version+1 WHERE id=?",
                java.sql.Timestamp.from(now.plusSeconds(delay)),java.sql.Timestamp.from(now),event.id);
        }
        return true;
    }
    private Set<UUID> recipients(Pending event) {
        List<UUID> result=switch(event.type) {
            case "ROOM"->jdbc.queryForList("SELECT player_id FROM kesif.kesif_room_player WHERE room_id=? UNION "
                +"SELECT invitee_id FROM kesif.kesif_invitation WHERE room_id=?",UUID.class,event.aggregate,event.aggregate);
            case "SESSION"->jdbc.queryForList("SELECT player_id FROM kesif.kesif_session_player WHERE session_id=?",UUID.class,event.aggregate);
            default->throw new IllegalStateException("Unsupported outbox aggregate");
        };
        return new HashSet<>(result);
    }
}
