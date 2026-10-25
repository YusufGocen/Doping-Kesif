package com.doping.kesif.invitation;

import com.doping.kesif.common.persistence.BaseEntity;
import jakarta.persistence.*;
import java.util.Objects;
import java.util.UUID;
import java.time.Instant;

@Entity
@Table(name = "kesif_invitation", schema = "kesif")
public class Invitation extends BaseEntity {
    @Column(name = "room_id", nullable = false)
    private UUID roomId;

    @Column(name = "inviter_id", nullable = false)
    private UUID inviterId;

    @Column(name = "invitee_id", nullable = false)
    private UUID inviteeId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 24)
    private InvitationStatus status;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "responded_at", nullable = true)
    private Instant respondedAt;

    protected Invitation() { }

    public Invitation(UUID roomId, UUID inviterId, UUID inviteeId, InvitationStatus status, Instant expiresAt, Instant respondedAt) {
        this.roomId = Objects.requireNonNull(roomId, "roomId");
        this.inviterId = Objects.requireNonNull(inviterId, "inviterId");
        this.inviteeId = Objects.requireNonNull(inviteeId, "inviteeId");
        this.status = Objects.requireNonNull(status, "status");
        this.expiresAt = Objects.requireNonNull(expiresAt, "expiresAt");
        this.respondedAt = respondedAt;
    }

    public UUID getRoomId() { return roomId; }
    public UUID getInviterId() { return inviterId; }
    public UUID getInviteeId() { return inviteeId; }
    public InvitationStatus getStatus() { return status; }
    public Instant getExpiresAt() { return expiresAt; }
    public Instant getRespondedAt() { return respondedAt; }
    public void respond(InvitationStatus next, Instant now) {
        if (status != InvitationStatus.PENDING || next == InvitationStatus.PENDING) throw new IllegalStateException("Invitation is not pending");
        status = Objects.requireNonNull(next); respondedAt = Objects.requireNonNull(now);
    }
}

