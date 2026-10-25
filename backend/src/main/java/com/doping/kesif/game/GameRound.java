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
@Table(name = "kesif_round", schema = "kesif")
public class GameRound extends BaseEntity {
    @Column(name = "session_id", nullable = false)
    private UUID sessionId;

    @Column(name = "round_no", nullable = false)
    private short roundNo;

    @Column(name = "question_reference", nullable = false, length = 128)
    private String questionReference;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "question_snapshot", nullable = false)
    private JsonNode questionSnapshot;

    @Column(name = "correct_option_key", nullable = false, length = 8)
    private String correctOptionKey;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 24)
    private RoundStatus status;

    @Column(name = "opened_at", nullable = true)
    private Instant openedAt;

    @Column(name = "deadline_at", nullable = true)
    private Instant deadlineAt;

    @Column(name = "resolved_at", nullable = true)
    private Instant resolvedAt;

    @Column(name = "reveal_deadline_at", nullable = true)
    private Instant revealDeadlineAt;

    protected GameRound() { }

    public GameRound(UUID sessionId, short roundNo, String questionReference, JsonNode questionSnapshot, String correctOptionKey, RoundStatus status, Instant openedAt, Instant deadlineAt, Instant resolvedAt, Instant revealDeadlineAt) {
        this.sessionId = Objects.requireNonNull(sessionId, "sessionId");
        this.roundNo = roundNo;
        this.questionReference = Objects.requireNonNull(questionReference, "questionReference");
        this.questionSnapshot = Objects.requireNonNull(questionSnapshot, "questionSnapshot").deepCopy();
        this.correctOptionKey = Objects.requireNonNull(correctOptionKey, "correctOptionKey");
        this.status = Objects.requireNonNull(status, "status");
        this.openedAt = openedAt;
        this.deadlineAt = deadlineAt;
        this.resolvedAt = resolvedAt;
        this.revealDeadlineAt = revealDeadlineAt;
    }

    public UUID getSessionId() { return sessionId; }
    public short getRoundNo() { return roundNo; }
    public String getQuestionReference() { return questionReference; }
    public JsonNode getQuestionSnapshot() { return questionSnapshot == null ? null : questionSnapshot.deepCopy(); }
    public String getCorrectOptionKey() { return correctOptionKey; }
    public RoundStatus getStatus() { return status; }
    public Instant getOpenedAt() { return openedAt; }
    public Instant getDeadlineAt() { return deadlineAt; }
    public Instant getResolvedAt() { return resolvedAt; }
    public Instant getRevealDeadlineAt() { return revealDeadlineAt; }
    public void open(Instant now, Instant deadline) { status=RoundStatus.QUESTION_OPEN; openedAt=now; deadlineAt=deadline; }
    public void reveal(Instant now, Instant deadline) { status=RoundStatus.REVEAL; resolvedAt=now; revealDeadlineAt=deadline; }
    public void complete() { status=RoundStatus.COMPLETED; }
}

