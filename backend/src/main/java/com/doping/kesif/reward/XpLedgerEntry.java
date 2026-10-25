package com.doping.kesif.reward;

import com.doping.kesif.common.persistence.BaseEntity;
import jakarta.persistence.*;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "kesif_xp_ledger", schema = "kesif")
public class XpLedgerEntry extends BaseEntity {
    @Column(name = "player_id", nullable = false)
    private UUID playerId;

    @Column(name = "session_id", nullable = false)
    private UUID sessionId;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false, length = 40)
    private XpEventType eventType;

    @Column(name = "amount", nullable = false)
    private int amount;

    @Column(name = "dedupe_key", nullable = false, length = 200)
    private String dedupeKey;

    protected XpLedgerEntry() { }

    public XpLedgerEntry(UUID playerId, UUID sessionId, XpEventType eventType, int amount, String dedupeKey) {
        this.playerId = Objects.requireNonNull(playerId, "playerId");
        this.sessionId = Objects.requireNonNull(sessionId, "sessionId");
        this.eventType = Objects.requireNonNull(eventType, "eventType");
        this.amount = amount;
        this.dedupeKey = Objects.requireNonNull(dedupeKey, "dedupeKey");
    }

    public UUID getPlayerId() { return playerId; }
    public UUID getSessionId() { return sessionId; }
    public XpEventType getEventType() { return eventType; }
    public int getAmount() { return amount; }
    public String getDedupeKey() { return dedupeKey; }
}

