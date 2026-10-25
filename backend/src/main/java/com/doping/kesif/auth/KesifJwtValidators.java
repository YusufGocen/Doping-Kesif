package com.doping.kesif.auth;

import org.springframework.security.oauth2.core.*;
import org.springframework.security.oauth2.jwt.*;

public final class KesifJwtValidators {
    private KesifJwtValidators() { }

    public static OAuth2TokenValidator<Jwt> forSettings(JwtSettings settings) {
        OAuth2TokenValidator<Jwt> requiredClaims = jwt -> {
            String subject = jwt.getSubject();
            boolean valid = subject != null && !subject.isBlank() && subject.length() <= 128
                && jwt.getExpiresAt() != null && jwt.getAudience() != null && jwt.getAudience().contains(settings.audience());
            return valid ? OAuth2TokenValidatorResult.success()
                : OAuth2TokenValidatorResult.failure(new OAuth2Error("invalid_token", "Required JWT claims are invalid", null));
        };
        return new DelegatingOAuth2TokenValidator<>(JwtValidators.createDefaultWithIssuer(settings.issuer()), requiredClaims);
    }
}
