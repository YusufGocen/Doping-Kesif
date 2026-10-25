package com.doping.kesif.room;

import com.doping.kesif.common.persistence.BaseEntity;
import jakarta.persistence.*;
import java.util.Objects;
import java.util.UUID;
import java.time.Instant;

@Entity
@Table(name = "kesif_room_player", schema = "kesif")
public class RoomPlayer extends BaseEntity {
    @Column(name = "room_id", nullable = false)
    private UUID roomId;

    @Column(name = "player_id", nullable = false)
    private UUID playerId;

    @Column(name = "slot", nullable = false)
    private short slot;

    @Column(name = "ready", nullable = false)
    private boolean ready;

    @Column(name = "active", nullable = false)
    private boolean active;

    @Column(name = "last_seen_at", nullable = true)
    private Instant lastSeenAt;

    protected RoomPlayer() { }

    public RoomPlayer(UUID roomId, UUID playerId, short slot, boolean ready, boolean active, Instant lastSeenAt) {
        this.roomId = Objects.requireNonNull(roomId, "roomId");
        this.playerId = Objects.requireNonNull(playerId, "playerId");
        this.slot = slot;
        this.ready = ready;
        this.active = active;
        this.lastSeenAt = lastSeenAt;
    }

    public UUID getRoomId() { return roomId; }
    public UUID getPlayerId() { return playerId; }
    public short getSlot() { return slot; }
    public boolean getReady() { return ready; }
    public boolean getActive() { return active; }
    public Instant getLastSeenAt() { return lastSeenAt; }
    public void markReady(boolean value, Instant now) {
        if (!active) throw new IllegalStateException("Inactive membership");
        ready = value; lastSeenAt = Objects.requireNonNull(now);
    }
    public void release(Instant now) { active = false; ready = false; lastSeenAt = now; }
}

