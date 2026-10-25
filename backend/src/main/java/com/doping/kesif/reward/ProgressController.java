package com.doping.kesif.reward;

import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.constraints.*;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import static com.doping.kesif.reward.ProgressDtos.*;

@RestController
@RequestMapping("/api/v1/kesif")
@SecurityRequirement(name="bearerAuth")
public class ProgressController {
    private final ProgressService progress;
    public ProgressController(ProgressService progress) { this.progress=progress; }
    @GetMapping("/collections")
    public PageView<CollectionView> collections(@AuthenticationPrincipal Jwt jwt,
            @RequestParam(defaultValue="ALL") CollectionFilter filter,@RequestParam(defaultValue="0") @Min(0) @Max(10000) int page,
            @RequestParam(defaultValue="20") @Min(1) @Max(100) int size) {
        return progress.collections(jwt.getSubject(),filter,page,size);
    }
    @GetMapping("/collections/{puzzleId}")
    public CollectionDetail collection(@AuthenticationPrincipal Jwt jwt,@PathVariable UUID puzzleId) { return progress.collection(jwt.getSubject(),puzzleId); }
    @GetMapping("/progress")
    public ProgressView summary(@AuthenticationPrincipal Jwt jwt) { return progress.progress(jwt.getSubject()); }
    @GetMapping("/history")
    public PageView<HistoryView> history(@AuthenticationPrincipal Jwt jwt,@RequestParam(defaultValue="0") @Min(0) @Max(10000) int page,
            @RequestParam(defaultValue="20") @Min(1) @Max(100) int size) { return progress.history(jwt.getSubject(),page,size); }
    @GetMapping("/sessions/{id}/result")
    public ResultView result(@AuthenticationPrincipal Jwt jwt,@PathVariable UUID id) { return progress.result(jwt.getSubject(),id); }
}
