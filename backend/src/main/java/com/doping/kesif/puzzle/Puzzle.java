package com.doping.kesif.puzzle;

import com.doping.kesif.common.persistence.BaseEntity;
import jakarta.persistence.*;
import java.util.Objects;

@Entity
@Table(name = "kesif_puzzle", schema = "kesif")
public class Puzzle extends BaseEntity {
    @Column(name = "code", nullable = false, length = 64)
    private String code;

    @Column(name = "title", nullable = false, length = 120)
    private String title;

    @Column(name = "asset_key", nullable = false, length = 255)
    private String assetKey;

    @Column(name = "piece_count", nullable = false)
    private short pieceCount;

    @Column(name = "active", nullable = false)
    private boolean active;

    protected Puzzle() { }

    public Puzzle(String code, String title, String assetKey, short pieceCount, boolean active) {
        this.code = Objects.requireNonNull(code, "code");
        this.title = Objects.requireNonNull(title, "title");
        this.assetKey = Objects.requireNonNull(assetKey, "assetKey");
        this.pieceCount = pieceCount;
        this.active = active;
    }

    public String getCode() { return code; }
    public String getTitle() { return title; }
    public String getAssetKey() { return assetKey; }
    public short getPieceCount() { return pieceCount; }
    public boolean getActive() { return active; }
}

