package com.doping.kesif.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.net.URI;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ProblemDetail;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.web.cors.*;

/** Stateless bearer authentication; only explicitly implemented routes are opened. */
@Configuration(proxyBeanMethods = false)
public class SecurityConfiguration {
    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http, Environment environment, ObjectMapper mapper,
            JwtAuthenticationConverter converter, CorsConfigurationSource corsConfigurationSource) throws Exception {
        boolean local = environment.acceptsProfiles(Profiles.of("local & !prod"));
        AuthenticationEntryPoint unauthenticated = (request, response, exception) -> {
            response.setHeader("WWW-Authenticate", "Bearer");
            writeProblem(mapper, request, response, HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED", "Geçerli bir erişim token'ı gerekli.");
        };
        AccessDeniedHandler denied = (request, response, exception) ->
            writeProblem(mapper, request, response, HttpStatus.FORBIDDEN, "FORBIDDEN", "Bu işlem için yetkiniz yok.");
        http.csrf(csrf -> csrf.disable())
            .cors(cors -> cors.configurationSource(corsConfigurationSource))
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .requestCache(cache -> cache.disable())
            .exceptionHandling(errors -> errors.authenticationEntryPoint(unauthenticated).accessDeniedHandler(denied))
            .oauth2ResourceServer(oauth -> oauth.jwt(jwt -> jwt.jwtAuthenticationConverter(converter))
                .authenticationEntryPoint(unauthenticated).accessDeniedHandler(denied))
            .authorizeHttpRequests(auth -> {
                auth.requestMatchers(HttpMethod.GET, "/actuator/health", "/actuator/health/**").permitAll();
                // Upgrade is public; the first frame must authenticate within five seconds.
                auth.requestMatchers(HttpMethod.GET,"/api/v1/kesif/ws").permitAll();
                if (local) {
                    auth.requestMatchers(HttpMethod.GET, "/swagger-ui.html", "/swagger-ui/**", "/v3/api-docs", "/v3/api-docs/**").permitAll();
                    auth.requestMatchers(HttpMethod.POST, "/api/v1/kesif/dev/auth/token").permitAll();
                    auth.requestMatchers(HttpMethod.GET, "/api/v1/kesif/dev/auth/users").permitAll();
                }
                auth.requestMatchers(HttpMethod.GET, "/api/v1/kesif/me", "/api/v1/kesif/catalog/**",
                    "/api/v1/kesif/puzzles", "/api/v1/kesif/groups", "/api/v1/kesif/groups/*/friends").hasRole("STUDENT");
                auth.requestMatchers(HttpMethod.GET,"/api/v1/kesif/rooms/active","/api/v1/kesif/rooms/*","/api/v1/kesif/invitations/incoming").hasRole("STUDENT");
                auth.requestMatchers(HttpMethod.POST,"/api/v1/kesif/rooms","/api/v1/kesif/rooms/join",
                    "/api/v1/kesif/rooms/*/ready","/api/v1/kesif/rooms/*/leave","/api/v1/kesif/rooms/*/cancel",
                    "/api/v1/kesif/invitations","/api/v1/kesif/invitations/*/accept","/api/v1/kesif/invitations/*/reject",
                    "/api/v1/kesif/invitations/*/cancel").hasRole("STUDENT");
                auth.requestMatchers(HttpMethod.GET,"/api/v1/kesif/sessions/*").hasRole("STUDENT");
                auth.requestMatchers(HttpMethod.POST,"/api/v1/kesif/rooms/*/start","/api/v1/kesif/sessions/*/rounds/*/answers",
                    "/api/v1/kesif/sessions/*/continue").hasRole("STUDENT");
                auth.requestMatchers(HttpMethod.GET,"/api/v1/kesif/collections","/api/v1/kesif/collections/*",
                    "/api/v1/kesif/progress","/api/v1/kesif/history","/api/v1/kesif/sessions/*/result").hasRole("STUDENT");
                auth.anyRequest().denyAll();
            });
        return http.build();
    }

    @Bean
    JwtAuthenticationConverter jwtAuthenticationConverter(@Value("${kesif.security.roles-claim:roles}") String rolesClaim) {
        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(jwt -> {
            Object roles = jwt.getClaims().get(rolesClaim);
            if (!(roles instanceof Collection<?> values)) return List.of();
            return values.stream().filter(String.class::isInstance).map(String.class::cast)
                .filter(Set.of("STUDENT", "ADMIN")::contains).distinct()
                .map(role -> (org.springframework.security.core.GrantedAuthority) new SimpleGrantedAuthority("ROLE_" + role)).toList();
        });
        return converter;
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource(@Value("${kesif.web.allowed-origins:}") String origins) {
        CorsConfiguration cors = new CorsConfiguration();
        cors.setAllowedOrigins(Arrays.stream(origins.split(",")).map(String::trim).filter(s -> !s.isEmpty()).toList());
        cors.setAllowedMethods(List.of("GET", "POST", "OPTIONS"));
        cors.setAllowedHeaders(List.of("Authorization", "Content-Type"));
        cors.setAllowCredentials(false);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", cors);
        return source;
    }

    private static void writeProblem(ObjectMapper mapper, HttpServletRequest request, HttpServletResponse response,
                                     HttpStatus status, String code, String detail) throws IOException {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(status, detail);
        problem.setInstance(URI.create(request.getRequestURI()));
        problem.setProperty("code", code);
        response.setStatus(status.value());
        response.setContentType("application/problem+json");
        mapper.writeValue(response.getOutputStream(), problem);
    }
}
