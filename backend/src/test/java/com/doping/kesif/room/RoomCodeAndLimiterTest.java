package com.doping.kesif.room;

import com.doping.kesif.common.api.KesifApiException;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;

class RoomCodeAndLimiterTest {
    @Test void codesAreStableForRetriesAndDifferentForOtherRequests() {
        String secret=Base64.getEncoder().encodeToString(new byte[32]);
        RoomCodeCodec codec=new RoomCodeCodec(secret,false);
        UUID owner=UUID.randomUUID(),request=UUID.randomUUID();
        String code=codec.codeFor(owner,request);
        assertThat(code).matches("[A-HJ-NP-Z2-9]{8}");
        assertThat(new RoomCodeCodec(secret,false).codeFor(owner,request)).isEqualTo(code);
        assertThat(codec.codeFor(owner,UUID.randomUUID())).isNotEqualTo(code);
        assertThat(codec.digest(" "+code.toLowerCase(Locale.ROOT)+" ")).isEqualTo(codec.digest(code));
        assertThat(codec.digest(code)).doesNotContain(code).hasSize(64);
    }
    @Test void invalidCodesAndMissingProductionSecretsAreRejected() {
        RoomCodeCodec codec=new RoomCodeCodec(null,true);
        assertThatThrownBy(()->codec.digest("IIIIIIII")).isInstanceOf(KesifApiException.class);
        assertThatThrownBy(()->new RoomCodeCodec(null,false)).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(()->new RoomCodeCodec("short",false)).isInstanceOf(IllegalStateException.class);
    }
    @Test void attemptLimitIsPerStudentAndExpires() {
        var clock=org.mockito.Mockito.mock(Clock.class);
        Instant now=Instant.parse("2026-10-21T12:00:00Z");
        org.mockito.Mockito.when(clock.instant()).thenReturn(now);
        LobbyAttemptLimiter limiter=new LobbyAttemptLimiter(clock,10);
        for(int i=0;i<10;i++) limiter.check("student-a");
        assertThatThrownBy(()->limiter.check("student-a")).isInstanceOfSatisfying(KesifApiException.class,e->assertThat(e.getStatus().value()).isEqualTo(429));
        limiter.check("student-b");
        org.mockito.Mockito.when(clock.instant()).thenReturn(now.plusSeconds(60));
        limiter.check("student-a");
    }
    @Test void creationSpamAndJoinAttemptsHaveSeparatePerStudentWindows() {
        LobbyAttemptLimiter limiter=new LobbyAttemptLimiter(Clock.systemUTC(),2);
        limiter.checkCreation("student-a"); limiter.checkCreation("student-a");
        assertThatThrownBy(()->limiter.checkCreation("student-a")).isInstanceOfSatisfying(KesifApiException.class,
            e->assertThat(e.getCode()).isEqualTo("LOBBY_CREATION_RATE_LIMITED"));
        limiter.check("student-a"); limiter.checkCreation("student-b");
    }
}
