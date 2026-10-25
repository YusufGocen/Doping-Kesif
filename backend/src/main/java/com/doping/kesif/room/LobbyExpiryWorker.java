package com.doping.kesif.room;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.*;

@Configuration(proxyBeanMethods=false)
@ConditionalOnProperty(name="kesif.rooms.expiry-enabled",havingValue="true",matchIfMissing=true)
public class LobbyExpiryWorker {
    private final LobbyService lobby;
    public LobbyExpiryWorker(LobbyService lobby) { this.lobby=lobby; }
    @Scheduled(fixedDelayString="${kesif.rooms.expiry-scan-ms:30000}",initialDelayString="${kesif.rooms.expiry-scan-ms:30000}")
    public void expire() { lobby.expireDueRooms(); }
}
