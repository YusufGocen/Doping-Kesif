package com.doping.kesif.auth;

import com.nimbusds.jose.jwk.*;
import com.nimbusds.jose.jwk.source.ImmutableJWKSet;
import com.nimbusds.jose.proc.SecurityContext;
import java.security.*;
import java.security.interfaces.RSAPublicKey;
import java.security.interfaces.RSAPrivateKey;
import java.util.UUID;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.*;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.*;

@Configuration(proxyBeanMethods = false)
@Profile("local & !prod")
@EnableConfigurationProperties(JwtSettings.class)
public class LocalJwtConfiguration {
    @Bean
    RSAKey localSigningKey() throws GeneralSecurityException {
        KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA");
        generator.initialize(2048);
        KeyPair pair = generator.generateKeyPair();
        return new RSAKey.Builder((RSAPublicKey) pair.getPublic()).privateKey((RSAPrivateKey) pair.getPrivate())
            .keyID(UUID.randomUUID().toString()).build();
    }

    @Bean
    JwtEncoder localJwtEncoder(RSAKey localSigningKey) {
        return new NimbusJwtEncoder(new ImmutableJWKSet<SecurityContext>(new JWKSet(localSigningKey)));
    }

    @Bean
    JwtDecoder localJwtDecoder(RSAKey localSigningKey, JwtSettings settings) throws com.nimbusds.jose.JOSEException {
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withPublicKey(localSigningKey.toRSAPublicKey())
            .signatureAlgorithm(SignatureAlgorithm.RS256).build();
        decoder.setJwtValidator(KesifJwtValidators.forSettings(settings));
        return decoder;
    }
}
