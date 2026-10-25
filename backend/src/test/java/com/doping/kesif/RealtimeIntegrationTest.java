package com.doping.kesif;

import com.doping.kesif.auth.JwtSettings;
import com.doping.kesif.local.LocalDemoSeeder;
import com.doping.kesif.outbox.OutboxPublisher;
import com.doping.kesif.realtime.KesifWebSocketHandler;
import com.doping.kesif.room.*;
import com.fasterxml.jackson.databind.*;
import java.net.*;
import java.net.http.*;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIf;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import static org.assertj.core.api.Assertions.*;

@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("local")
@EnabledIf(value="com.doping.kesif.PostgresTestSupport#databaseAvailable",disabledReason="Test PostgreSQL required")
class RealtimeIntegrationTest extends PostgresTestSupport {
    @LocalServerPort int port;
    @Autowired ObjectMapper mapper;
    @Autowired JwtEncoder encoder;
    @Autowired JwtSettings settings;
    @Autowired LobbyService lobby;
    @Autowired com.doping.kesif.game.GameService games;
    @Autowired OutboxPublisher publisher;
    @Autowired KesifWebSocketHandler handler;
    @Autowired JdbcTemplate jdbc;
    @Autowired PlatformTransactionManager transactions;
    private final List<Client> clients=new ArrayList<>();
    private final List<UUID> roomIds=new ArrayList<>();
    private final HttpClient http=HttpClient.newHttpClient();

    @AfterEach void cleanup() {
        clients.forEach(c->{if(c.socket!=null&&!c.socket.isOutputClosed()) c.socket.sendClose(1000,"done");});
        new TransactionTemplate(transactions).executeWithoutResult(tx->{
            for(UUID room:roomIds) {
                for(UUID session:jdbc.queryForList("SELECT id FROM kesif.kesif_session WHERE room_id=?",UUID.class,room)) {
                    jdbc.update("DELETE FROM kesif.kesif_outbox_event WHERE aggregate_type='SESSION' AND aggregate_id=?",session);
                    jdbc.update("DELETE FROM kesif.kesif_round_answer WHERE session_id=?",session);
                    jdbc.update("DELETE FROM kesif.kesif_round WHERE session_id=?",session);
                    jdbc.update("DELETE FROM kesif.kesif_session_player WHERE session_id=?",session);
                    jdbc.update("DELETE FROM kesif.kesif_session WHERE id=?",session);
                }
                jdbc.update("DELETE FROM kesif.kesif_outbox_event WHERE aggregate_type='ROOM' AND aggregate_id=?",room);
                jdbc.update("DELETE FROM kesif.kesif_invitation WHERE room_id=?",room);
                jdbc.update("DELETE FROM kesif.kesif_room_player WHERE room_id=?",room);
                jdbc.update("DELETE FROM kesif.kesif_room WHERE id=?",room);
            }
        });
    }

    @Test void validStudentAuthenticatesAndCanPing() throws Exception {
        Client client=authenticated("local:yusuf");
        client.send(Map.of("type","PING")); assertThat(client.next().path("type").asText()).isEqualTo("PONG");
    }
    @Test void forgedTokensAndWrongRolesAreClosed() throws Exception {
        Client forged=connect("http://localhost:5173",""); forged.send(Map.of("type","AUTH","token","invalid"));
        assertThat(forged.closed.get(5,TimeUnit.SECONDS)).isEqualTo(1008);
        Client admin=connect("http://localhost:5173",""); admin.send(Map.of("type","AUTH","token",token("local:yusuf",List.of("ADMIN"),Instant.now().plusSeconds(60))));
        assertThat(admin.closed.get(5,TimeUnit.SECONDS)).isEqualTo(1008);
    }
    @Test void expiredTokenIsRejectedEvenWithinJwtClockSkew() throws Exception {
        Client client=connect("http://localhost:5173","");
        client.send(Map.of("type","AUTH","token",token("local:yusuf",List.of("STUDENT"),Instant.now().minusSeconds(1))));
        assertThat(client.closed.get(5,TimeUnit.SECONDS)).isEqualTo(1008);
    }
    @Test void unexpectedFramesAndClientSelectedSubscriptionsAreDenied() throws Exception {
        Client client=authenticated("local:yusuf"); client.send(Map.of("type","SUBSCRIBE","playerId",UUID.randomUUID()));
        assertThat(client.closed.get(5,TimeUnit.SECONDS)).isEqualTo(1008);
        Client unauth=connect("http://localhost:5173",""); unauth.send(Map.of("type","PING"));
        assertThat(unauth.closed.get(5,TimeUnit.SECONDS)).isEqualTo(1008);
    }
    @Test void originAndQueryTokenAreRejectedAtHandshake() {
        assertThatThrownBy(()->connect("https://untrusted.invalid","")).hasCauseInstanceOf(WebSocketHandshakeException.class);
        assertThatThrownBy(()->connect("http://localhost:5173","?token=forbidden")).hasCauseInstanceOf(WebSocketHandshakeException.class);
    }
    @Test void roomEventsReachOnlyParticipantsWithoutPrivatePayload() throws Exception {
        Client owner=authenticated("local:yusuf"),guest=authenticated("local:ayse"),outsider=authenticated("local:mert");
        var room=room(); lobby.joinCode("local:ayse",room.joinCode());
        drain();
        JsonNode event=owner.find("ROOM_PLAYER_JOINED");
        assertThat(event.get("aggregateId").asText()).isEqualTo(room.id().toString());
        assertThat(event.has("payload")).isFalse(); assertThat(event.toString()).doesNotContain(room.joinCode(),"correctOptionKey");
        assertThat(guest.find("ROOM_PLAYER_JOINED").get("sequence")).isEqualTo(event.get("sequence"));
        // A ping response is a barrier after all synchronous server sends, without arbitrary sleeps.
        outsider.send(Map.of("type","PING")); assertThat(outsider.next().path("type").asText()).isEqualTo("PONG");
    }
    @Test void pendingInviteeReceivesInvitationWithoutJoiningRoom() throws Exception {
        Client invitee=authenticated("local:ayse");
        UUID puzzle=jdbc.queryForObject("SELECT id FROM kesif.kesif_puzzle WHERE code='DEMO_HISTORY'",UUID.class);
        var invitation=lobby.invite("local:yusuf",new LobbyDtos.CreateInvitationRequest(UUID.randomUUID(),
            new LobbyDtos.Selection("local-group-8a",puzzle,LocalDemoSeeder.MATH_ID,8,LocalDemoSeeder.ALGEBRA_ID),"local:ayse"));
        roomIds.add(invitation.roomId()); drain();
        assertThat(invitee.find("INVITATION_RECEIVED").get("aggregateId").asText()).isEqualTo(invitation.roomId().toString());
        assertThat(lobby.incoming("local:ayse",0,20)).extracting(i->i.id()).contains(invitation.id());
    }
    @Test void sessionNotificationsAndReconnectRecoverAuthoritativeState() throws Exception {
        Client owner=authenticated("local:yusuf"),guest=authenticated("local:ayse");
        var room=room(); lobby.joinCode("local:ayse",room.joinCode());
        lobby.ready("local:yusuf",room.id(),true); lobby.ready("local:ayse",room.id(),true);
        var game=games.start("local:yusuf",room.id()); drain();
        assertThat(owner.find("QUESTION_OPENED").get("aggregateId").asText()).isEqualTo(game.id().toString());
        guest.socket.sendClose(1000,"reconnect").get(5,TimeUnit.SECONDS); guest.closed.get(5,TimeUnit.SECONDS);
        String option=game.round().question().get("options").get(0).get("key").asText();
        games.answer("local:yusuf",game.id(),game.round().id(),new com.doping.kesif.game.GameDtos.AnswerRequest(UUID.randomUUID(),option));
        drain();
        Client reconnected=authenticated("local:ayse");
        var recovered=games.active("local:ayse").orElseThrow();
        assertThat(recovered.id()).isEqualTo(game.id()); assertThat(recovered.sequence()).isGreaterThan(game.sequence());
        assertThat(recovered.players()).anyMatch(p->p.answered());
        assertThat(recovered.round().correctOptionKey()).isNull();
        reconnected.send(Map.of("type","PING")); assertThat(reconnected.next().path("type").asText()).isEqualTo("PONG");
    }

    private LobbyDtos.RoomView room() {
        UUID puzzle=jdbc.queryForObject("SELECT id FROM kesif.kesif_puzzle WHERE code='DEMO_HISTORY'",UUID.class);
        var room=lobby.createCodeRoom("local:yusuf",new LobbyDtos.CreateRoomRequest(UUID.randomUUID(),
            new LobbyDtos.Selection("local-group-8a",puzzle,LocalDemoSeeder.MATH_ID,8,LocalDemoSeeder.ALGEBRA_ID)));
        roomIds.add(room.id()); return room;
    }
    private void drain() { for(int i=0;i<2000&&publisher.publishNext();i++) { } }
    private String token(String subject,List<String> roles,Instant expiry) {
        return encoder.encode(JwtEncoderParameters.from(JwsHeader.with(SignatureAlgorithm.RS256).build(),JwtClaimsSet.builder()
            .issuer(settings.issuer()).audience(List.of(settings.audience())).subject(subject).issuedAt(Instant.now().minusSeconds(2))
            .expiresAt(expiry).claim("roles",roles).build())).getTokenValue();
    }
    private Client authenticated(String subject) throws Exception {
        Client client=connect("http://localhost:5173","");
        client.send(Map.of("type","AUTH","token",token(subject,List.of("STUDENT"),Instant.now().plusSeconds(120))));
        JsonNode ready=client.next(); assertThat(ready.path("type").asText()).isEqualTo("READY");
        assertThat(ready.path("resyncRequired").asBoolean()).isTrue(); return client;
    }
    private Client connect(String origin,String query) throws Exception {
        Client client=new Client();
        client.socket=http.newWebSocketBuilder().header("Origin",origin).buildAsync(URI.create("ws://127.0.0.1:"+port+"/api/v1/kesif/ws"+query),client).get(5,TimeUnit.SECONDS);
        clients.add(client); return client;
    }
    private class Client implements WebSocket.Listener {
        WebSocket socket;
        final BlockingQueue<String> messages=new LinkedBlockingQueue<>();
        final CompletableFuture<Integer> closed=new CompletableFuture<>();
        final StringBuilder partial=new StringBuilder();
        @Override public void onOpen(WebSocket ws) { ws.request(1); }
        @Override public CompletionStage<?> onText(WebSocket ws,CharSequence text,boolean last) {
            partial.append(text); if(last) { messages.add(partial.toString()); partial.setLength(0); } ws.request(1); return null;
        }
        @Override public CompletionStage<?> onClose(WebSocket ws,int code,String reason) { closed.complete(code); return null; }
        @Override public void onError(WebSocket ws,Throwable error) { closed.completeExceptionally(error); }
        void send(Object data) throws Exception { socket.sendText(mapper.writeValueAsString(data),true).get(5,TimeUnit.SECONDS); }
        JsonNode next() throws Exception { String message=messages.poll(5,TimeUnit.SECONDS); assertThat(message).as("Expected WebSocket frame").isNotNull(); return mapper.readTree(message); }
        JsonNode find(String event) throws Exception {
            for(int i=0;i<100;i++) { JsonNode frame=next(); if(frame.path("eventType").asText().equals(event)) return frame; }
            throw new AssertionError("Missing event "+event);
        }
    }
}
