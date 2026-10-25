package com.doping.kesif.collection;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CollectionPieceRepository extends JpaRepository<CollectionPiece, UUID> {
}

