package com.doping.kesif.room;

import java.util.UUID;
import java.util.Optional;
import java.util.List;
import java.time.Instant;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface KesifRoomRepository extends JpaRepository<KesifRoom, UUID> {
    Optional<KesifRoom> findByCodeDigestAndStatus(String codeDigest, RoomStatus status);
    Optional<KesifRoom> findByOwnerPlayerIdAndCreationRequestId(UUID ownerPlayerId, UUID creationRequestId);
    Optional<KesifRoom> findByCodeDigestAndStatusIn(String digest, List<RoomStatus> statuses);
    List<KesifRoom> findByStatusInAndExpiresAtBeforeOrderByExpiresAt(List<RoomStatus> statuses, Instant now, Pageable page);
    List<KesifRoom> findByJoinMethodAndStatusIn(JoinMethod method, List<RoomStatus> statuses);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select e from KesifRoom e where e.id = :id")
    Optional<KesifRoom> findByIdForUpdate(@Param("id") UUID id);
}

