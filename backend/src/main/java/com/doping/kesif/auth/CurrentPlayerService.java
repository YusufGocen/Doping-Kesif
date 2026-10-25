package com.doping.kesif.auth;

import com.doping.kesif.player.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CurrentPlayerService {
    private final PlayerProfileRepository players;
    public CurrentPlayerService(PlayerProfileRepository players) { this.players = players; }

    @Transactional
    public PlayerProfile resolve(String trustedSubject) {
        return players.findByExternalUserId(trustedSubject).orElseGet(() -> {
            players.ensureProfileExists(trustedSubject);
            return players.findByExternalUserId(trustedSubject).orElseThrow();
        });
    }
}
