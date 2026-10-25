package com.doping.kesif.room;

import java.time.Duration;
import jakarta.validation.constraints.NotNull;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties("kesif.rooms")
public record RoomPolicy(@NotNull Duration ttl, @NotNull Duration invitationTtl, String codeSecret) {
    public RoomPolicy {
        for (Duration value : new Duration[]{ttl, invitationTtl}) {
            if (value != null && (value.compareTo(Duration.ofSeconds(30)) < 0 || value.compareTo(Duration.ofHours(1)) > 0))
                throw new IllegalArgumentException("Lobby TTL must be 30 seconds to 1 hour");
        }
    }
}
