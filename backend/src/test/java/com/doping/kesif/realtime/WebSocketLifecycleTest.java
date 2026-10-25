package com.doping.kesif.realtime;

import com.doping.kesif.auth.CurrentPlayerService;
import com.doping.kesif.player.PlayerProfile;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.web.socket.*;
import static org.mockito.Mockito.*;

class WebSocketLifecycleTest {
    private MutableClock clock;
    private KesifWebSocketHandler handler;
    @BeforeEach void setup() {
        clock=new MutableClock();
        JwtDecoder decoder=mock(JwtDecoder.class);
        when(decoder.decode("valid")).thenReturn(Jwt.withTokenValue("valid").header("alg","RS256").subject("student")
            .issuedAt(clock.now.minusSeconds(1)).expiresAt(clock.now.plusSeconds(60)).build());
        var identity=mock(CurrentPlayerService.class); var player=mock(PlayerProfile.class); when(player.getId()).thenReturn(UUID.randomUUID());
        when(identity.resolve("student")).thenReturn(player);
        var converter=new JwtAuthenticationConverter(); converter.setJwtGrantedAuthoritiesConverter(jwt->List.of(new SimpleGrantedAuthority("ROLE_STUDENT")));
        handler=new KesifWebSocketHandler(decoder,converter,identity,new ObjectMapper().registerModule(new JavaTimeModule()),clock);
    }
    @Test void unauthenticatedSocketExpiresAfterFiveSeconds() throws Exception {
        WebSocketSession session=session(); handler.afterConnectionEstablished(session); clock.now=clock.now.plusSeconds(5); handler.reap();
        verify(session).close(argThat(status->status.getCode()==1008));
    }
    @Test void authenticatedSocketClosesAtTokenExpiry() throws Exception {
        WebSocketSession session=session(); handler.afterConnectionEstablished(session); auth(session);
        clock.now=clock.now.plusSeconds(60); handler.reap();
        verify(session).close(argThat(status->status.getCode()==1008));
    }
    @Test void fifthConnectionForSamePlayerIsRejected() throws Exception {
        for(int i=0;i<4;i++) { var session=session(); handler.afterConnectionEstablished(session); auth(session); verify(session,never()).close(any()); }
        var fifth=session(); handler.afterConnectionEstablished(fifth); auth(fifth); verify(fifth).close(argThat(status->status.getCode()==1008));
    }
    private void auth(WebSocketSession session) throws Exception { handler.handleMessage(session,new TextMessage("{\"type\":\"AUTH\",\"token\":\"valid\"}")); }
    private WebSocketSession session() { var session=mock(WebSocketSession.class); when(session.getId()).thenReturn(UUID.randomUUID().toString()); when(session.isOpen()).thenReturn(true); return session; }
    private static class MutableClock extends Clock {
        Instant now=Instant.parse("2026-10-22T07:00:00Z");
        public Instant instant() { return now; }
        public ZoneId getZone() { return ZoneOffset.UTC; }
        public Clock withZone(ZoneId zone) { return this; }
    }
}
