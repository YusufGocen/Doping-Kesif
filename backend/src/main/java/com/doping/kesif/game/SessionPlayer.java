package com.doping.kesif.game;

import com.doping.kesif.common.persistence.BaseEntity;
import jakarta.persistence.*;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "kesif_session_player", schema = "kesif")
public class SessionPlayer extends BaseEntity {
    @Column(name="collection_added_count",nullable=false)
    private short collectionAddedCount;
    public short getCollectionAddedCount() { return collectionAddedCount; }
    public void recordCollectionAdded(short count) { collectionAddedCount=count; }
    @Column(name = "session_id", nullable = false)
    private UUID sessionId;

    @Column(name = "room_id", nullable = false)
    private UUID roomId;

    @Column(name = "player_id", nullable = false)
    private UUID playerId;

    @Column(name = "slot", nullable = false)
    private short slot;

    @Column(name = "correct_count", nullable = false)
    private short correctCount;

    @Column(name = "continue_round_no", nullable = false)
    private short continueRoundNo;

    @Column(name = "active", nullable = false)
    private boolean active;

    protected SessionPlayer() { }

    public SessionPlayer(UUID sessionId, UUID roomId, UUID playerId, short slot, short correctCount, short continueRoundNo, boolean active) {
        this.sessionId = Objects.requireNonNull(sessionId, "sessionId");
        this.roomId = Objects.requireNonNull(roomId, "roomId");
        this.playerId = Objects.requireNonNull(playerId, "playerId");
        this.slot = slot;
        this.correctCount = correctCount;
        this.continueRoundNo = continueRoundNo;
        this.active = active;
    }

    public UUID getSessionId() { return sessionId; }
    public UUID getRoomId() { return roomId; }
    public UUID getPlayerId() { return playerId; }
    public short getSlot() { return slot; }
    public short getCorrectCount() { return correctCount; }
    public short getContinueRoundNo() { return continueRoundNo; }
    public boolean getActive() { return active; }
    public void score() { correctCount++; }
    public void continueAfter(short round) { continueRoundNo=round; }
    public void finish() { active=false; }
}

