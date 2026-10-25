package com.doping.kesif.collection;

import java.util.UUID;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PlayerCollectionRepository extends JpaRepository<PlayerCollection, UUID> {
    List<PlayerCollection> findByPlayerId(UUID playerId);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select e from PlayerCollection e where e.id = :id")
    Optional<PlayerCollection> findByIdForUpdate(@Param("id") UUID id);
}

