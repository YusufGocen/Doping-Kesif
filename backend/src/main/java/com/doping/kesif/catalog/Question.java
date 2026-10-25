package com.doping.kesif.catalog;

import com.doping.kesif.common.persistence.BaseEntity;
import jakarta.persistence.*;
import java.util.Objects;
import java.util.UUID;
import com.fasterxml.jackson.databind.JsonNode;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "kesif_question", schema = "kesif")
public class Question extends BaseEntity {
    @Column(name = "topic_id", nullable = false)
    private UUID topicId;

    @Column(name = "external_question_id", nullable = true, length = 128)
    private String externalQuestionId;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "body", nullable = false)
    private JsonNode body;

    @Column(name = "difficulty_tag", nullable = true, length = 32)
    private String difficultyTag;

    @Column(name = "content_version", nullable = false)
    private int contentVersion;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 24)
    private QuestionStatus status;

    protected Question() { }

    public Question(UUID topicId, String externalQuestionId, JsonNode body, String difficultyTag, int contentVersion, QuestionStatus status) {
        this.topicId = Objects.requireNonNull(topicId, "topicId");
        this.externalQuestionId = externalQuestionId;
        this.body = Objects.requireNonNull(body, "body").deepCopy();
        this.difficultyTag = difficultyTag;
        this.contentVersion = contentVersion;
        this.status = Objects.requireNonNull(status, "status");
    }

    public UUID getTopicId() { return topicId; }
    public String getExternalQuestionId() { return externalQuestionId; }
    public JsonNode getBody() { return body == null ? null : body.deepCopy(); }
    public String getDifficultyTag() { return difficultyTag; }
    public int getContentVersion() { return contentVersion; }
    public QuestionStatus getStatus() { return status; }
}

