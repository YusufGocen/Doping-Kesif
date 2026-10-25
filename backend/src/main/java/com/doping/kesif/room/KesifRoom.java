package com.doping.kesif.room;

import com.doping.kesif.common.persistence.BaseEntity;
import jakarta.persistence.*;
import java.util.Objects;
import java.util.UUID;
import java.time.Instant;
import com.fasterxml.jackson.databind.JsonNode;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "kesif_room", schema = "kesif")
public class KesifRoom extends BaseEntity {
    @Column(name = "creation_request_id", nullable = false, updatable = false)
    private UUID creationRequestId = UUID.randomUUID();
    @Column(name = "event_sequence", nullable = false)
    private long eventSequence;
    @Column(name = "owner_player_id", nullable = false)
    private UUID ownerPlayerId;

    @Column(name = "group_external_id", nullable = false, length = 128)
    private String groupExternalId;

    @Enumerated(EnumType.STRING)
    @Column(name = "join_method", nullable = false, length = 24)
    private JoinMethod joinMethod;

    @Column(name = "code_digest", nullable = true, length = 128)
    private String codeDigest;

    @Column(name = "puzzle_id", nullable = false)
    private UUID puzzleId;

    @Column(name = "subject_id", nullable = false)
    private UUID subjectId;

    @Column(name = "grade_level", nullable = false)
    private short gradeLevel;

    @Column(name = "topic_id", nullable = true)
    private UUID topicId;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "rules_snapshot", nullable = false)
    private JsonNode rulesSnapshot;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 24)
    private RoomStatus status;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    protected KesifRoom() { }

    public KesifRoom(UUID ownerPlayerId, String groupExternalId, JoinMethod joinMethod, String codeDigest, UUID puzzleId, UUID subjectId, short gradeLevel, UUID topicId, JsonNode rulesSnapshot, RoomStatus status, Instant expiresAt) {
        this.ownerPlayerId = Objects.requireNonNull(ownerPlayerId, "ownerPlayerId");
        this.groupExternalId = Objects.requireNonNull(groupExternalId, "groupExternalId");
        this.joinMethod = Objects.requireNonNull(joinMethod, "joinMethod");
        this.codeDigest = codeDigest;
        this.puzzleId = Objects.requireNonNull(puzzleId, "puzzleId");
        this.subjectId = Objects.requireNonNull(subjectId, "subjectId");
        this.gradeLevel = gradeLevel;
        this.topicId = topicId;
        this.rulesSnapshot = Objects.requireNonNull(rulesSnapshot, "rulesSnapshot").deepCopy();
        this.status = Objects.requireNonNull(status, "status");
        this.expiresAt = Objects.requireNonNull(expiresAt, "expiresAt");
    }

    public UUID getOwnerPlayerId() { return ownerPlayerId; }
    public String getGroupExternalId() { return groupExternalId; }
    public JoinMethod getJoinMethod() { return joinMethod; }
    public String getCodeDigest() { return codeDigest; }
    public UUID getPuzzleId() { return puzzleId; }
    public UUID getSubjectId() { return subjectId; }
    public short getGradeLevel() { return gradeLevel; }
    public UUID getTopicId() { return topicId; }
    public JsonNode getRulesSnapshot() { return rulesSnapshot == null ? null : rulesSnapshot.deepCopy(); }
    public RoomStatus getStatus() { return status; }
    public Instant getExpiresAt() { return expiresAt; }
    public UUID getCreationRequestId() { return creationRequestId; }
    public long getEventSequence() { return eventSequence; }
    public void identifyCreation(UUID requestId) {
        if (getId() != null) throw new IllegalStateException("Creation identity is immutable");
        creationRequestId = Objects.requireNonNull(requestId);
    }
    public void changeLobbyStatus(RoomStatus next) {
        if (status == RoomStatus.STARTED || status == RoomStatus.CLOSED) throw new IllegalStateException("Lobby already started");
        status = Objects.requireNonNull(next);
    }
    public long nextEventSequence() { return ++eventSequence; }
    public void completeGame() {
        if(status!=RoomStatus.STARTED) throw new IllegalStateException("Game not started");
        status=RoomStatus.CLOSED;
    }
}

