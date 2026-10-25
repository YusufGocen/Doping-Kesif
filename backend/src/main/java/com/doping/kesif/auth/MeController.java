package com.doping.kesif.auth;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/kesif")
@SecurityRequirement(name = "bearerAuth")
public class MeController {
    private final CurrentPlayerService players;
    public MeController(CurrentPlayerService players) { this.players = players; }

    @GetMapping("/me")
    @Operation(summary = "JWT ile doğrulanan öğrencinin Kesif profili")
    public MeResponse me(@AuthenticationPrincipal Jwt jwt, Authentication authentication) {
        var player = players.resolve(jwt.getSubject());
        List<String> roles = authentication.getAuthorities().stream().map(a -> a.getAuthority())
            .filter(a -> a.startsWith("ROLE_")).map(a -> a.substring(5)).sorted().toList();
        return new MeResponse(player.getId(), player.getExternalUserId(), player.getDisplayName(), roles);
    }

    public record MeResponse(UUID id, String externalUserId, String displayName, List<String> roles) { }
}
