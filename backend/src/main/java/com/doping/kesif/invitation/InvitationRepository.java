package com.doping.kesif.invitation;

import java.util.UUID;
import java.util.List;
import java.time.Instant;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InvitationRepository extends JpaRepository<Invitation, UUID> {
    List<Invitation> findByInviteeIdAndStatus(UUID inviteeId, InvitationStatus status);
    List<Invitation> findByRoomId(UUID roomId);
    List<Invitation> findByInviteeIdAndStatusAndExpiresAtAfterOrderByCreatedAtDesc(UUID playerId, InvitationStatus status, Instant now, Pageable page);
}

