package com.doping.kesif.game;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RoundAnswerRepository extends JpaRepository<RoundAnswer, UUID> {
    java.util.List<RoundAnswer> findByRoundId(UUID roundId);
    java.util.Optional<RoundAnswer> findByPlayerIdAndClientRequestId(UUID playerId, UUID clientRequestId);
}

