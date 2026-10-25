package com.doping.kesif.catalog;

import com.doping.kesif.common.persistence.BaseEntity;
import jakarta.persistence.*;
import java.util.Objects;

@Entity
@Table(name = "kesif_subject", schema = "kesif")
public class Subject extends BaseEntity {
    @Column(name = "code", nullable = false, length = 32)
    private String code;

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @Column(name = "active", nullable = false)
    private boolean active;

    protected Subject() { }

    public Subject(String code, String name, boolean active) {
        this.code = Objects.requireNonNull(code, "code");
        this.name = Objects.requireNonNull(name, "name");
        this.active = active;
    }

    public String getCode() { return code; }
    public String getName() { return name; }
    public boolean getActive() { return active; }
}

