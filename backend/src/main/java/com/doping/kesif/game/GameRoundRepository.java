package com.doping.kesif.game;

import java.util.UUID;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface GameRoundRepository extends JpaRepository<GameRound, UUID> {
    List<GameRound> findBySessionIdOrderByRoundNo(UUID sessionId);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select e from GameRound e where e.id = :id")
    Optional<GameRound> findByIdForUpdate(@Param("id") UUID id);
}

