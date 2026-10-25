package com.doping.kesif.game;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.*;

public final class GameDtos {
    private GameDtos() { }
    public record AnswerRequest(@NotNull UUID clientRequestId, @NotBlank @Size(max=8) String optionKey) { }
    public record ContinueRequest(@Min(1) @Max(10) short roundNo) { }
    public record PlayerView(UUID playerId, short slot, short correctCount, boolean answered, boolean continuing) { }
    public record AnswerView(UUID playerId, String optionKey, boolean correct, AnswerSource source) { }
    public record RoundView(UUID id, short roundNo, RoundStatus status, JsonNode question,
            Instant deadlineAt, Instant revealDeadlineAt, String correctOptionKey, List<AnswerView> answers) { }
    public record SessionView(UUID id, UUID roomId, UUID puzzleId, SessionStatus status, short currentRoundNo,
            short revealedCount, List<Short> revealedPieces, List<PlayerView> players, RoundView round, long sequence) { }
}
