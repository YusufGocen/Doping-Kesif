package com.doping.kesif.realtime;

import com.doping.kesif.auth.CurrentPlayerService;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.time.*;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.*;
import org.springframework.web.socket.handler.*;

@Component
public class KesifWebSocketHandler extends TextWebSocketHandler implements EventSink {
    private static final CloseStatus DENIED=new CloseStatus(1008,"Authentication or protocol policy failed");
    private final Map<String,Connection> connections=new ConcurrentHashMap<>();
    private final JwtDecoder decoder;
    private final JwtAuthenticationConverter converter;
    private final CurrentPlayerService identity;
    private final ObjectMapper mapper;
    private final Clock clock;
    public KesifWebSocketHandler(JwtDecoder decoder,JwtAuthenticationConverter converter,CurrentPlayerService identity,ObjectMapper mapper,Clock clock) {
        this.decoder=decoder; this.converter=converter; this.identity=identity; this.mapper=mapper; this.clock=clock;
    }
    private static class Connection {
        final WebSocketSession session;
        final Instant authDeadline;
        volatile UUID player;
        volatile Instant expires;
        Connection(WebSocketSession raw,Instant now) {
            session=new ConcurrentWebSocketSessionDecorator(raw,5000,65536);
            authDeadline=now.plusSeconds(5);
        }
    }
    @Override public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        synchronized(connections) {
            if(connections.size()>=200) { session.close(new CloseStatus(1013,"Connection capacity reached")); return; }
            session.setTextMessageSizeLimit(8192);
            connections.put(session.getId(),new Connection(session,clock.instant()));
        }
    }
    @Override protected void handleTextMessage(WebSocketSession session,TextMessage message) throws Exception {
        Connection connection=connections.get(session.getId()); if(connection==null) return;
        try {
            var frame=mapper.readTree(message.getPayload());
            if(frame==null||!frame.isObject()) { close(connection,DENIED); return; }
            if(connection.player==null) {
                if(!clock.instant().isBefore(connection.authDeadline)||frame.size()!=2||!"AUTH".equals(frame.path("type").asText())
                        ||!frame.path("token").isTextual()) { close(connection,DENIED); return; }
                var jwt=decoder.decode(frame.get("token").asText());
                var authentication=converter.convert(jwt);
                if(authentication==null||authentication.getAuthorities().stream().noneMatch(a->a.getAuthority().equals("ROLE_STUDENT"))
                        ||jwt.getExpiresAt()==null||!jwt.getExpiresAt().isAfter(clock.instant())) { close(connection,DENIED); return; }
                UUID player=identity.resolve(jwt.getSubject()).getId();
                synchronized(connections) {
                    if(connections.values().stream().filter(c->player.equals(c.player)).count()>=4) { close(connection,DENIED); return; }
                    synchronized(connection) {
                        connection.expires=jwt.getExpiresAt(); connection.player=player;
                        // A publisher observing player must wait until READY has been sent.
                        send(connection,mapper.writeValueAsString(Map.of("type","READY","protocolVersion",1,"resyncRequired",true,"expiresAt",connection.expires)));
                    }
                }
            } else {
                if(expired(connection)||frame.size()!=1||!"PING".equals(frame.path("type").asText())) { close(connection,DENIED); return; }
                send(connection,"{\"type\":\"PONG\"}");
            }
        } catch(Exception exception) {
            // Never log incoming frames, tokens, decoder messages, or private claims.
            close(connection,DENIED);
        }
    }
    @Override public void publish(Set<UUID> recipients,RealtimeEvent event) {
        final String json;
        try { json=mapper.writeValueAsString(event); } catch(IOException ex) { throw new IllegalStateException("Event serialization failed"); }
        for(Connection connection:connections.values()) if(connection.player!=null&&recipients.contains(connection.player)) {
            synchronized(connection) {
                if(expired(connection)) close(connection,DENIED);
                else try { send(connection,json); } catch(Exception ex) { close(connection,CloseStatus.SERVER_ERROR); }
            }
        }
    }
    private boolean expired(Connection c) { return c.expires!=null&&!c.expires.isAfter(clock.instant()); }
    private void send(Connection c,String text) throws IOException { c.session.sendMessage(new TextMessage(text)); }
    public void reap() {
        for(Connection c:connections.values()) if((c.player==null&&!c.authDeadline.isAfter(clock.instant()))||expired(c)) close(c,DENIED);
    }
    private void close(Connection c,CloseStatus status) {
        connections.remove(c.session.getId(),c);
        try { c.session.close(status); } catch(IOException ignored) { }
    }
    @Override public void afterConnectionClosed(WebSocketSession session,CloseStatus status) { connections.remove(session.getId()); }
    @Override public void handleTransportError(WebSocketSession session,Throwable error) throws Exception {
        Connection c=connections.get(session.getId()); if(c!=null) close(c,CloseStatus.SERVER_ERROR);
    }
}
