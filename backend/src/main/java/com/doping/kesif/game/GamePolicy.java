package com.doping.kesif.game;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("kesif.game")
public record GamePolicy(Duration questionDuration, Duration revealDuration) {
    public GamePolicy {
        for(Duration duration:new Duration[]{questionDuration,revealDuration})
            if(duration==null||duration.compareTo(Duration.ofSeconds(1))<0||duration.compareTo(Duration.ofMinutes(10))>0||duration.toNanos()%1_000_000!=0)
                throw new IllegalArgumentException("Explicit game durations between 1 second and 10 minutes required");
    }
}
