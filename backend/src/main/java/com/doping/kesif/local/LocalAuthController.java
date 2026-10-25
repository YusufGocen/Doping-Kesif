package com.doping.kesif.local;

import com.doping.kesif.auth.JwtSettings;
import com.doping.kesif.common.api.KesifApiException;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.time.*;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.http.*;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/kesif/dev/auth")
@Profile("local & !prod")
public class LocalAuthController {
    private final LocalIdentityDirectory directory;
    private final JwtEncoder encoder;
    private final JwtSettings settings;
    private final Duration ttl;
    public LocalAuthController(LocalIdentityDirectory directory, JwtEncoder encoder, JwtSettings settings,
            @Value("${kesif.local.token-ttl:PT15M}") Duration ttl) {
        if (ttl.isNegative() || ttl.isZero() || ttl.compareTo(Duration.ofHours(1)) > 0) throw new IllegalArgumentException("Local token TTL must be between 0 and 1 hour");
        this.directory = directory; this.encoder = encoder; this.settings = settings; this.ttl = ttl;
    }

    @GetMapping("/users")
    @Operation(summary = "Yalnız local: hazır test hesapları")
    public ResponseEntity<List<UserView>> users() {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(directory.users().stream()
            .map(u -> new UserView(u.userKey(), u.displayName())).toList());
    }

    @PostMapping("/token")
    @Operation(summary = "Yalnız local: seçilen test hesabı için kısa ömürlü JWT")
    public ResponseEntity<TokenResponse> token(@Valid @RequestBody TokenRequest request) {
        var user = directory.findByKey(request.userKey()).orElseThrow(() ->
            new KesifApiException(HttpStatus.BAD_REQUEST, "UNKNOWN_DEMO_USER", "Hazır test hesaplarından birini seçin."));
        Instant now = Instant.now();
        JwtClaimsSet claims = JwtClaimsSet.builder().issuer(settings.issuer()).audience(List.of(settings.audience()))
            .subject(user.externalUserId()).issuedAt(now).expiresAt(now.plus(ttl)).claim("roles", List.of("STUDENT")).build();
        String token = encoder.encode(JwtEncoderParameters.from(JwsHeader.with(SignatureAlgorithm.RS256).build(), claims)).getTokenValue();
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
            .body(new TokenResponse(token, "Bearer", ttl.toSeconds(), now.plus(ttl)));
    }

    public record TokenRequest(@NotBlank String userKey) { }
    public record TokenResponse(String accessToken, String tokenType, long expiresIn, Instant expiresAt) { }
    public record UserView(String userKey, String displayName) { }
}
