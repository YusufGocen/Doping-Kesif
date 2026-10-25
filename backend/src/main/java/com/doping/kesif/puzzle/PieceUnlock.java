package com.doping.kesif.puzzle;

import com.doping.kesif.common.persistence.BaseEntity;
import jakarta.persistence.*;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "kesif_piece_unlock", schema = "kesif")
public class PieceUnlock extends BaseEntity {
    @Column(name = "session_id", nullable = false)
    private UUID sessionId;

    @Column(name = "round_id", nullable = false)
    private UUID roundId;

    @Column(name = "earned_by_player_id", nullable = false)
    private UUID earnedByPlayerId;

    @Column(name = "piece_index", nullable = false)
    private short pieceIndex;

    protected PieceUnlock() { }

    public PieceUnlock(UUID sessionId, UUID roundId, UUID earnedByPlayerId, short pieceIndex) {
        this.sessionId = Objects.requireNonNull(sessionId, "sessionId");
        this.roundId = Objects.requireNonNull(roundId, "roundId");
        this.earnedByPlayerId = Objects.requireNonNull(earnedByPlayerId, "earnedByPlayerId");
        this.pieceIndex = pieceIndex;
    }

    public UUID getSessionId() { return sessionId; }
    public UUID getRoundId() { return roundId; }
    public UUID getEarnedByPlayerId() { return earnedByPlayerId; }
    public short getPieceIndex() { return pieceIndex; }
}

