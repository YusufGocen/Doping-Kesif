package com.doping.kesif.collection;

import com.doping.kesif.common.persistence.BaseEntity;
import jakarta.persistence.*;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "kesif_collection_piece", schema = "kesif")
public class CollectionPiece extends BaseEntity {
    @Column(name = "collection_id", nullable = false)
    private UUID collectionId;

    @Column(name = "puzzle_id", nullable = false)
    private UUID puzzleId;

    @Column(name = "piece_index", nullable = false)
    private short pieceIndex;

    @Column(name = "source_session_id", nullable = false)
    private UUID sourceSessionId;

    protected CollectionPiece() { }

    public CollectionPiece(UUID collectionId, UUID puzzleId, short pieceIndex, UUID sourceSessionId) {
        this.collectionId = Objects.requireNonNull(collectionId, "collectionId");
        this.puzzleId = Objects.requireNonNull(puzzleId, "puzzleId");
        this.pieceIndex = pieceIndex;
        this.sourceSessionId = Objects.requireNonNull(sourceSessionId, "sourceSessionId");
    }

    public UUID getCollectionId() { return collectionId; }
    public UUID getPuzzleId() { return puzzleId; }
    public short getPieceIndex() { return pieceIndex; }
    public UUID getSourceSessionId() { return sourceSessionId; }
}

