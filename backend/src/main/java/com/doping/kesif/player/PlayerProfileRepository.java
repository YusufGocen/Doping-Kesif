package com.doping.kesif.player;

import java.util.UUID;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;

public interface PlayerProfileRepository extends JpaRepository<PlayerProfile, UUID> {
    Optional<PlayerProfile> findByExternalUserId(String externalUserId);

    @Modifying
    @Query(value = "INSERT INTO kesif.kesif_player_profile(external_user_id) VALUES (:subject) ON CONFLICT (external_user_id) DO NOTHING", nativeQuery = true)
    int ensureProfileExists(@Param("subject") String subject);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from PlayerProfile p where p.id = :id")
    Optional<PlayerProfile> findByIdForUpdate(@Param("id") UUID id);
}

