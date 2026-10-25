package com.doping.kesif.collection;

import com.doping.kesif.common.persistence.BaseEntity;
import jakarta.persistence.*;
import java.util.Objects;
import java.util.UUID;
import java.time.Instant;

@Entity
@Table(name = "kesif_player_collection", schema = "kesif")
public class PlayerCollection extends BaseEntity {
    @Column(name = "player_id", nullable = false)
    private UUID playerId;

    @Column(name = "puzzle_id", nullable = false)
    private UUID puzzleId;

    @Column(name = "unlocked_count", nullable = false)
    private short unlockedCount;

    @Column(name = "completed_at", nullable = true)
    private Instant completedAt;

    protected PlayerCollection() { }

    public PlayerCollection(UUID playerId, UUID puzzleId, short unlockedCount, Instant completedAt) {
        this.playerId = Objects.requireNonNull(playerId, "playerId");
        this.puzzleId = Objects.requireNonNull(puzzleId, "puzzleId");
        this.unlockedCount = unlockedCount;
        this.completedAt = completedAt;
    }

    public UUID getPlayerId() { return playerId; }
    public UUID getPuzzleId() { return puzzleId; }
    public short getUnlockedCount() { return unlockedCount; }
    public Instant getCompletedAt() { return completedAt; }
}

