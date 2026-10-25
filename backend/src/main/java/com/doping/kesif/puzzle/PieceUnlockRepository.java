package com.doping.kesif.puzzle;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PieceUnlockRepository extends JpaRepository<PieceUnlock, UUID> {
    java.util.List<PieceUnlock> findBySessionId(UUID sessionId);
}

