package com.doping.kesif.room;

import com.doping.kesif.common.api.KesifApiException;
import java.time.*;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.beans.factory.annotation.Value;

/** Bounded, per-user local limiter. MVP single-instance; distributed limiting is a later integration. */
@Component
public class LobbyAttemptLimiter {
    private final Clock clock;
    private final int maximum;
    private final Map<String,Window> windows = new LinkedHashMap<>();
    public LobbyAttemptLimiter(Clock clock,@Value("${kesif.rooms.join-attempts-per-minute:10}") int maximum) {
        if(maximum<1||maximum>1000) throw new IllegalArgumentException("Invalid attempt limit");
        this.clock=clock; this.maximum=maximum;
    }
    public void check(String subject) { checkKey("join:"+subject,"ROOM_JOIN_RATE_LIMITED"); }
    public void checkCreation(String subject) { checkKey("create:"+subject,"LOBBY_CREATION_RATE_LIMITED"); }
    private synchronized void checkKey(String subject,String errorCode) {
        Instant now=clock.instant();
        windows.entrySet().removeIf(e -> !e.getValue().until.isAfter(now));
        Window window=windows.get(subject);
        if(window==null) {
            if(windows.size()>=10000) throw limited(errorCode);
            window=new Window(now.plusSeconds(60)); windows.put(subject,window);
        }
        if(++window.attempts>maximum) throw limited(errorCode);
    }
    private KesifApiException limited(String code) { return new KesifApiException(HttpStatus.TOO_MANY_REQUESTS,code,"Çok fazla lobi isteği. Bir süre sonra yeniden deneyin."); }
    private static class Window { final Instant until; int attempts; Window(Instant until){this.until=until;} }
}
