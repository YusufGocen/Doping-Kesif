package com.doping.kesif;

import com.doping.kesif.outbox.OutboxPublisher;
import com.doping.kesif.realtime.KesifWebSocketHandler;
import com.doping.kesif.realtime.RealtimeEvent;
import java.util.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIf;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.transaction.annotation.Transactional;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@SpringBootTest
@ActiveProfiles("local")
@Transactional
@EnabledIf(value="com.doping.kesif.PostgresTestSupport#databaseAvailable",disabledReason="Test PostgreSQL required")
class OutboxPublisherTest extends PostgresTestSupport {
    @Autowired JdbcTemplate jdbc;
    @Autowired OutboxPublisher publisher;
    @MockitoSpyBean KesifWebSocketHandler sink;
    private UUID aggregate;
    @BeforeEach void isolate() { aggregate=UUID.randomUUID(); }
    private UUID event(int sequence,String type) {
        return jdbc.queryForObject("INSERT INTO kesif.kesif_outbox_event(aggregate_type,aggregate_id,event_type,sequence_number,payload,created_at) "
            +"VALUES (?,?,?,?,'{\"private\":\"never broadcast\"}'::jsonb,now()-interval '1 day') RETURNING id",UUID.class,type,aggregate,"TEST_EVENT",sequence);
    }
    @Test void failedDispatchRetriesAndBlocksLaterAggregateEvents() {
        UUID first=event(1,"ROOM"),second=event(2,"ROOM");
        doThrow(new IllegalStateException("Simulated sink outage")).when(sink).publish(anySet(),argThat(e->e.eventId().equals(first)));
        assertThat(publisher.publishNext()).isTrue();
        assertThat(jdbc.queryForObject("SELECT attempts FROM kesif.kesif_outbox_event WHERE id=?",Integer.class,first)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT published_at IS NULL FROM kesif.kesif_outbox_event WHERE id=?",Boolean.class,first)).isTrue();
        publisher.publishNext();
        verify(sink,never()).publish(anySet(),argThat(e->e.eventId().equals(second)));
        doCallRealMethod().when(sink).publish(anySet(),any(RealtimeEvent.class));
        jdbc.update("UPDATE kesif.kesif_outbox_event SET available_at=now()-interval '1 second' WHERE id=?",first);
        publisher.publishNext(); publisher.publishNext();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM kesif.kesif_outbox_event WHERE id IN (?,?) AND published_at IS NOT NULL",Integer.class,first,second)).isEqualTo(2);
    }
    @Test void publishedEventsAreNotDispatchedAgainAndPayloadIsNotExposed() {
        UUID id=event(1,"ROOM"); publisher.publishNext(); publisher.publishNext();
        verify(sink,times(1)).publish(anySet(),argThat(e->e.eventId().equals(id)));
        var captor=org.mockito.ArgumentCaptor.forClass(RealtimeEvent.class);
        verify(sink,atLeastOnce()).publish(anySet(),captor.capture());
        assertThat(captor.getAllValues()).allSatisfy(e->assertThat(e.toString()).doesNotContain("never broadcast"));
    }
    @Test void unknownAggregateRemainsPendingWithBackoff() {
        UUID id=event(1,"UNKNOWN"); publisher.publishNext();
        assertThat(jdbc.queryForObject("SELECT attempts FROM kesif.kesif_outbox_event WHERE id=?",Integer.class,id)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT available_at>now() AND published_at IS NULL FROM kesif.kesif_outbox_event WHERE id=?",Boolean.class,id)).isTrue();
    }
}
