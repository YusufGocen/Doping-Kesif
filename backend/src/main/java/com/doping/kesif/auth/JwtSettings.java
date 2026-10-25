package com.doping.kesif.auth;

import jakarta.validation.constraints.NotBlank;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties("kesif.security")
public record JwtSettings(@NotBlank String issuer, @NotBlank String audience, String jwkSetUri) { }
