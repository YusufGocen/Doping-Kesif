package com.doping.kesif.game;

import java.util.UUID;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface GameSessionRepository extends JpaRepository<GameSession, UUID> {
    Optional<GameSession> findByRoomId(UUID roomId);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select e from GameSession e where e.id = :id")
    Optional<GameSession> findByIdForUpdate(@Param("id") UUID id);
}

