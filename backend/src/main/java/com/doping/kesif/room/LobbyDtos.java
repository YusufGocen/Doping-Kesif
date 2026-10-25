package com.doping.kesif.room;

import com.doping.kesif.invitation.InvitationStatus;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.*;

public final class LobbyDtos {
    private LobbyDtos() { }
    public record Selection(@NotBlank @Size(max=128) String groupId, @NotNull UUID puzzleId,
        @NotNull UUID subjectId, @NotNull @Min(5) @Max(8) Integer gradeLevel, UUID topicId) { }
    public record CreateRoomRequest(@NotNull UUID clientRequestId,@NotNull @Valid Selection selection) { }
    public record CreateInvitationRequest(@NotNull UUID clientRequestId,@NotNull @Valid Selection selection,
        @NotBlank @Size(max=128) String inviteeExternalUserId) { }
    public record JoinRequest(@NotBlank @Size(max=16) String code) { }
    public record ReadyRequest(@NotNull Boolean ready) { }
    public record PlayerView(UUID playerId,String displayName,int slot,boolean ready,boolean active) { }
    public record RoomView(UUID id,UUID ownerPlayerId,JoinMethod joinMethod,RoomStatus status,
        Selection selection,Instant expiresAt,List<PlayerView> players,boolean readyToStart,long sequence,String joinCode) { }
    public record InvitationView(UUID id,UUID roomId,UUID inviterId,UUID inviteeId,InvitationStatus status,
        Instant expiresAt,Selection selection) { }
}
