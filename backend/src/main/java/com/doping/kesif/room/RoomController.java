package com.doping.kesif.room;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import static com.doping.kesif.room.LobbyDtos.*;

@RestController
@RequestMapping("/api/v1/kesif/rooms")
@SecurityRequirement(name="bearerAuth")
public class RoomController {
    private final LobbyService lobby;
    private final LobbyAttemptLimiter limiter;
    public RoomController(LobbyService lobby,LobbyAttemptLimiter limiter) { this.lobby=lobby; this.limiter=limiter; }
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary="Kodlu oda oluştur; clientRequestId ile güvenli tekrar")
    public RoomView create(@AuthenticationPrincipal Jwt jwt,@Valid @RequestBody CreateRoomRequest request) {
        limiter.checkCreation(jwt.getSubject()); return lobby.createCodeRoom(jwt.getSubject(),request);
    }
    @PostMapping("/join")
    @Operation(summary="Oda koduyla, aynı Butik grubundan katıl")
    public RoomView join(@AuthenticationPrincipal Jwt jwt,@Valid @RequestBody JoinRequest request) {
        limiter.check(jwt.getSubject()); return lobby.joinCode(jwt.getSubject(),request.code());
    }
    @GetMapping("/active")
    @Operation(summary="Kendi aktif lobini bul; yoksa 204")
    public ResponseEntity<RoomView> active(@AuthenticationPrincipal Jwt jwt) {
        return lobby.activeRoom(jwt.getSubject()).map(ResponseEntity::ok).orElseGet(()->ResponseEntity.noContent().build());
    }
    @GetMapping("/{id}")
    @Operation(summary="Yetkili katılımcıya lobi snapshot'ı")
    public RoomView get(@AuthenticationPrincipal Jwt jwt,@PathVariable UUID id) { return lobby.getRoom(jwt.getSubject(),id); }
    @PostMapping("/{id}/ready")
    @Operation(summary="Kendi hazır durumunu değiştir; bu adım oyun başlatmaz")
    public RoomView ready(@AuthenticationPrincipal Jwt jwt,@PathVariable UUID id,@Valid @RequestBody ReadyRequest request) { return lobby.ready(jwt.getSubject(),id,request.ready()); }
    @PostMapping("/{id}/leave")
    @Operation(summary="İki kişilik lobiden ayrıl; lobi kapanır")
    public RoomView leave(@AuthenticationPrincipal Jwt jwt,@PathVariable UUID id) { return lobby.leaveOrCancel(jwt.getSubject(),id,false); }
    @PostMapping("/{id}/cancel")
    @Operation(summary="Oda sahibi lobiyi iptal eder")
    public RoomView cancel(@AuthenticationPrincipal Jwt jwt,@PathVariable UUID id) { return lobby.leaveOrCancel(jwt.getSubject(),id,true); }
}
