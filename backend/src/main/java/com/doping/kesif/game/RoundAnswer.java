package com.doping.kesif.game;

import com.doping.kesif.common.persistence.BaseEntity;
import jakarta.persistence.*;
import java.util.Objects;
import java.util.UUID;
import java.time.Instant;

@Entity
@Table(name = "kesif_round_answer", schema = "kesif")
public class RoundAnswer extends BaseEntity {
    @Column(name = "session_id", nullable = false)
    private UUID sessionId;

    @Column(name = "round_id", nullable = false)
    private UUID roundId;

    @Column(name = "player_id", nullable = false)
    private UUID playerId;

    @Column(name = "option_key", nullable = true, length = 8)
    private String optionKey;

    @Column(name = "correct", nullable = false)
    private boolean correct;

    @Enumerated(EnumType.STRING)
    @Column(name = "source", nullable = false, length = 24)
    private AnswerSource source;

    @Column(name = "client_request_id", nullable = true)
    private UUID clientRequestId;

    @Column(name = "answered_at", nullable = false)
    private Instant answeredAt;

    protected RoundAnswer() { }

    public RoundAnswer(UUID sessionId, UUID roundId, UUID playerId, String optionKey, boolean correct, AnswerSource source, UUID clientRequestId, Instant answeredAt) {
        this.sessionId = Objects.requireNonNull(sessionId, "sessionId");
        this.roundId = Objects.requireNonNull(roundId, "roundId");
        this.playerId = Objects.requireNonNull(playerId, "playerId");
        this.optionKey = optionKey;
        this.correct = correct;
        this.source = Objects.requireNonNull(source, "source");
        this.clientRequestId = clientRequestId;
        this.answeredAt = Objects.requireNonNull(answeredAt, "answeredAt");
    }

    public UUID getSessionId() { return sessionId; }
    public UUID getRoundId() { return roundId; }
    public UUID getPlayerId() { return playerId; }
    public String getOptionKey() { return optionKey; }
    public boolean getCorrect() { return correct; }
    public AnswerSource getSource() { return source; }
    public UUID getClientRequestId() { return clientRequestId; }
    public Instant getAnsweredAt() { return answeredAt; }
}

