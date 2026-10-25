package com.doping.kesif.catalog;

import com.doping.kesif.common.persistence.BaseEntity;
import jakarta.persistence.*;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "kesif_topic", schema = "kesif")
public class Topic extends BaseEntity {
    @Column(name = "subject_id", nullable = false)
    private UUID subjectId;

    @Column(name = "grade_level", nullable = false)
    private short gradeLevel;

    @Column(name = "code", nullable = false, length = 64)
    private String code;

    @Column(name = "name", nullable = false, length = 150)
    private String name;

    @Column(name = "active", nullable = false)
    private boolean active;

    protected Topic() { }

    public Topic(UUID subjectId, short gradeLevel, String code, String name, boolean active) {
        this.subjectId = Objects.requireNonNull(subjectId, "subjectId");
        this.gradeLevel = gradeLevel;
        this.code = Objects.requireNonNull(code, "code");
        this.name = Objects.requireNonNull(name, "name");
        this.active = active;
    }

    public UUID getSubjectId() { return subjectId; }
    public short getGradeLevel() { return gradeLevel; }
    public String getCode() { return code; }
    public String getName() { return name; }
    public boolean getActive() { return active; }
}

