package com.doping.kesif.auth;

import java.net.URI;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.*;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.*;

/** Resource-server boundary; actual institution claims and issuer remain an integration task. */
@Configuration(proxyBeanMethods = false)
@Profile("!local | prod")
@EnableConfigurationProperties(JwtSettings.class)
public class ExternalJwtConfiguration {
    @Bean
    JwtDecoder externalJwtDecoder(JwtSettings settings) {
        requireHttps(settings.issuer(), "JWT_ISSUER");
        requireHttps(settings.jwkSetUri(), "JWT_JWKS_URI");
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withJwkSetUri(settings.jwkSetUri())
            .jwsAlgorithm(SignatureAlgorithm.RS256).build();
        decoder.setJwtValidator(KesifJwtValidators.forSettings(settings));
        return decoder;
    }

    private static void requireHttps(String value, String name) {
        if (value == null || value.isBlank()) throw new IllegalStateException(name + " must be configured");
        URI uri = URI.create(value);
        if (!"https".equalsIgnoreCase(uri.getScheme()) || uri.getHost() == null || uri.getUserInfo() != null) {
            throw new IllegalStateException(name + " must be an HTTPS URL without credentials");
        }
    }
}
