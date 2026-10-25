package com.doping.kesif.realtime;

import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.*;
import org.springframework.web.socket.server.HandshakeInterceptor;
import org.springframework.http.server.*;
import org.springframework.web.socket.WebSocketHandler;

@Configuration(proxyBeanMethods=false)
@EnableWebSocket
public class WebSocketConfiguration implements WebSocketConfigurer {
    private final KesifWebSocketHandler handler;
    private final String[] origins;
    public WebSocketConfiguration(KesifWebSocketHandler handler,@Value("${kesif.web.allowed-origins:}") String origins) {
        this.handler=handler;
        this.origins=Arrays.stream(origins.split(",")).map(String::trim).filter(s->!s.isEmpty()).toArray(String[]::new);
    }
    @Override public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(handler,"/api/v1/kesif/ws").setAllowedOrigins(origins).addInterceptors(new HandshakeInterceptor() {
            @Override public boolean beforeHandshake(ServerHttpRequest request,ServerHttpResponse response,WebSocketHandler ws,Map<String,Object> attributes) {
                // Neither URL tokens nor cookies grant identity. Browsers must provide an explicit allowed Origin.
                String origin=request.getHeaders().getOrigin();
                boolean allowed=request.getURI().getRawQuery()==null&&origin!=null&&Arrays.asList(origins).contains(origin);
                if(!allowed) response.setStatusCode(org.springframework.http.HttpStatus.FORBIDDEN);
                return allowed;
            }
            @Override public void afterHandshake(ServerHttpRequest request,ServerHttpResponse response,WebSocketHandler ws,Exception ex) { }
        });
    }
}
