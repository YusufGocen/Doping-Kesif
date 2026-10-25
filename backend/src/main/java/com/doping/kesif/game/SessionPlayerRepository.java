package com.doping.kesif.game;

import java.util.UUID;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SessionPlayerRepository extends JpaRepository<SessionPlayer, UUID> {
    List<SessionPlayer> findBySessionId(UUID sessionId);
}

