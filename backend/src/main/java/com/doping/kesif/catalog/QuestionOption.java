package com.doping.kesif.catalog;

import com.doping.kesif.common.persistence.BaseEntity;
import jakarta.persistence.*;
import java.util.Objects;
import java.util.UUID;
import com.fasterxml.jackson.databind.JsonNode;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "kesif_question_option", schema = "kesif")
public class QuestionOption extends BaseEntity {
    @Column(name = "question_id", nullable = false)
    private UUID questionId;

    @Column(name = "option_key", nullable = false, length = 8)
    private String optionKey;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "body", nullable = false)
    private JsonNode body;

    @Column(name = "correct", nullable = false)
    private boolean correct;

    protected QuestionOption() { }

    public QuestionOption(UUID questionId, String optionKey, JsonNode body, boolean correct) {
        this.questionId = Objects.requireNonNull(questionId, "questionId");
        this.optionKey = Objects.requireNonNull(optionKey, "optionKey");
        this.body = Objects.requireNonNull(body, "body").deepCopy();
        this.correct = correct;
    }

    public UUID getQuestionId() { return questionId; }
    public String getOptionKey() { return optionKey; }
    public JsonNode getBody() { return body == null ? null : body.deepCopy(); }
    public boolean getCorrect() { return correct; }
}

