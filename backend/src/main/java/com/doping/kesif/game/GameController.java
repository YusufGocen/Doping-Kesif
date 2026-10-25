package com.doping.kesif.game;

import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import static com.doping.kesif.game.GameDtos.*;

@RestController
@RequestMapping("/api/v1/kesif")
@SecurityRequirement(name="bearerAuth")
public class GameController {
    private final GameService games;
    public GameController(GameService games) { this.games=games; }
    @PostMapping("/rooms/{id}/start")
    public SessionView start(@AuthenticationPrincipal Jwt jwt,@PathVariable UUID id) { return games.start(jwt.getSubject(),id); }
    @GetMapping("/sessions/{id}")
    public SessionView snapshot(@AuthenticationPrincipal Jwt jwt,@PathVariable UUID id) { return games.snapshot(jwt.getSubject(),id); }
    @GetMapping("/sessions/active")
    public org.springframework.http.ResponseEntity<SessionView> active(@AuthenticationPrincipal Jwt jwt) {
        return games.active(jwt.getSubject()).map(org.springframework.http.ResponseEntity::ok)
            .orElseGet(()->org.springframework.http.ResponseEntity.noContent().build());
    }
    @PostMapping("/sessions/{id}/rounds/{roundId}/answers")
    public SessionView answer(@AuthenticationPrincipal Jwt jwt,@PathVariable UUID id,@PathVariable UUID roundId,
            @Valid @RequestBody AnswerRequest request) { return games.answer(jwt.getSubject(),id,roundId,request); }
    @PostMapping("/sessions/{id}/continue")
    public SessionView next(@AuthenticationPrincipal Jwt jwt,@PathVariable UUID id,@Valid @RequestBody ContinueRequest request) {
        return games.next(jwt.getSubject(),id,request.roundNo());
    }
}
