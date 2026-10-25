package com.doping.kesif.outbox;

import com.doping.kesif.common.persistence.BaseEntity;
import jakarta.persistence.*;
import java.util.Objects;
import java.util.UUID;
import java.time.Instant;
import com.fasterxml.jackson.databind.JsonNode;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "kesif_outbox_event", schema = "kesif")
public class OutboxEvent extends BaseEntity {
    @Column(name = "aggregate_type", nullable = false, length = 40)
    private String aggregateType;

    @Column(name = "aggregate_id", nullable = false)
    private UUID aggregateId;

    @Column(name = "event_type", nullable = false, length = 80)
    private String eventType;

    @Column(name = "sequence_number", nullable = false)
    private long sequenceNumber;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "payload", nullable = false)
    private JsonNode payload;

    @Column(name = "published_at", nullable = true)
    private Instant publishedAt;

    @Column(name = "attempts", nullable = false)
    private int attempts;

    @Column(name = "available_at", nullable = false)
    private Instant availableAt;

    protected OutboxEvent() { }

    public OutboxEvent(String aggregateType, UUID aggregateId, String eventType, long sequenceNumber, JsonNode payload, Instant publishedAt, int attempts, Instant availableAt) {
        this.aggregateType = Objects.requireNonNull(aggregateType, "aggregateType");
        this.aggregateId = Objects.requireNonNull(aggregateId, "aggregateId");
        this.eventType = Objects.requireNonNull(eventType, "eventType");
        this.sequenceNumber = sequenceNumber;
        this.payload = Objects.requireNonNull(payload, "payload").deepCopy();
        this.publishedAt = publishedAt;
        this.attempts = attempts;
        this.availableAt = Objects.requireNonNull(availableAt, "availableAt");
    }

    public String getAggregateType() { return aggregateType; }
    public UUID getAggregateId() { return aggregateId; }
    public String getEventType() { return eventType; }
    public long getSequenceNumber() { return sequenceNumber; }
    public JsonNode getPayload() { return payload == null ? null : payload.deepCopy(); }
    public Instant getPublishedAt() { return publishedAt; }
    public int getAttempts() { return attempts; }
    public Instant getAvailableAt() { return availableAt; }
}

