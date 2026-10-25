package com.doping.kesif.game;

import com.doping.kesif.common.persistence.BaseEntity;
import jakarta.persistence.*;
import java.util.Objects;
import java.util.UUID;
import java.time.Instant;
import com.fasterxml.jackson.databind.JsonNode;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "kesif_session", schema = "kesif")
public class GameSession extends BaseEntity {
    @Column(name="rewards_finalized_at")
    private Instant rewardsFinalizedAt;
    public Instant getRewardsFinalizedAt() { return rewardsFinalizedAt; }
    public void finalizeRewards(Instant at) {
        if(status!=SessionStatus.COMPLETED||rewardsFinalizedAt!=null) throw new IllegalStateException("Invalid finalization");
        rewardsFinalizedAt=Objects.requireNonNull(at);
    }
    @Column(name = "room_id", nullable = false)
    private UUID roomId;

    @Column(name = "puzzle_id", nullable = false)
    private UUID puzzleId;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "rules_snapshot", nullable = false)
    private JsonNode rulesSnapshot;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 24)
    private SessionStatus status;

    @Column(name = "current_round_no", nullable = false)
    private short currentRoundNo;

    @Column(name = "revealed_count", nullable = false)
    private short revealedCount;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "piece_order", nullable = false)
    private JsonNode pieceOrder;

    @Column(name = "event_sequence", nullable = false)
    private long eventSequence;

    @Column(name = "started_at", nullable = true)
    private Instant startedAt;

    @Column(name = "ended_at", nullable = true)
    private Instant endedAt;

    protected GameSession() { }

    public GameSession(UUID roomId, UUID puzzleId, JsonNode rulesSnapshot, SessionStatus status, short currentRoundNo, short revealedCount, JsonNode pieceOrder, long eventSequence, Instant startedAt, Instant endedAt) {
        this.roomId = Objects.requireNonNull(roomId, "roomId");
        this.puzzleId = Objects.requireNonNull(puzzleId, "puzzleId");
        this.rulesSnapshot = Objects.requireNonNull(rulesSnapshot, "rulesSnapshot").deepCopy();
        this.status = Objects.requireNonNull(status, "status");
        this.currentRoundNo = currentRoundNo;
        this.revealedCount = revealedCount;
        this.pieceOrder = Objects.requireNonNull(pieceOrder, "pieceOrder").deepCopy();
        this.eventSequence = eventSequence;
        this.startedAt = startedAt;
        this.endedAt = endedAt;
    }

    public UUID getRoomId() { return roomId; }
    public UUID getPuzzleId() { return puzzleId; }
    public JsonNode getRulesSnapshot() { return rulesSnapshot == null ? null : rulesSnapshot.deepCopy(); }
    public SessionStatus getStatus() { return status; }
    public short getCurrentRoundNo() { return currentRoundNo; }
    public short getRevealedCount() { return revealedCount; }
    public JsonNode getPieceOrder() { return pieceOrder == null ? null : pieceOrder.deepCopy(); }
    public long getEventSequence() { return eventSequence; }
    public Instant getStartedAt() { return startedAt; }
    public Instant getEndedAt() { return endedAt; }
    public long nextEventSequence() { return ++eventSequence; }
    public short unlockPiece() { return (short)pieceOrder.get(revealedCount++).asInt(); }
    public void advance() { currentRoundNo++; }
    public void complete(Instant now) { status=SessionStatus.COMPLETED; endedAt=now; }
}

