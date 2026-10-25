package com.doping.kesif.invitation;

import com.doping.kesif.room.LobbyService;
import com.doping.kesif.room.LobbyAttemptLimiter;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import static com.doping.kesif.room.LobbyDtos.*;

@RestController
@RequestMapping("/api/v1/kesif/invitations")
@SecurityRequirement(name="bearerAuth")
public class InvitationController {
    private final LobbyService lobby;
    private final LobbyAttemptLimiter limiter;
    public InvitationController(LobbyService lobby,LobbyAttemptLimiter limiter) { this.lobby=lobby; this.limiter=limiter; }
    @PostMapping @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary="Aynı Butik grubundan bir arkadaşına davet gönder")
    public InvitationView invite(@AuthenticationPrincipal Jwt jwt,@Valid @RequestBody CreateInvitationRequest request) {
        limiter.checkCreation(jwt.getSubject()); return lobby.invite(jwt.getSubject(),request);
    }
    @GetMapping("/incoming")
    @Operation(summary="Yalnız kendi geçerli bekleyen davetlerin")
    public List<InvitationView> incoming(@AuthenticationPrincipal Jwt jwt,@RequestParam(defaultValue="0") @Min(0) @Max(10000) int page,
            @RequestParam(defaultValue="20") @Min(1) @Max(100) int size) { return lobby.incoming(jwt.getSubject(),page,size); }
    @PostMapping("/{id}/accept")
    @Operation(summary="Yalnız davet edilen öğrenci kabul eder")
    public RoomView accept(@AuthenticationPrincipal Jwt jwt,@PathVariable UUID id) { return lobby.accept(jwt.getSubject(),id); }
    @PostMapping("/{id}/reject")
    public InvitationView reject(@AuthenticationPrincipal Jwt jwt,@PathVariable UUID id) { return lobby.respond(jwt.getSubject(),id,false); }
    @PostMapping("/{id}/cancel")
    public InvitationView cancel(@AuthenticationPrincipal Jwt jwt,@PathVariable UUID id) { return lobby.respond(jwt.getSubject(),id,true); }
}
