package com.doping.kesif.room;

import com.doping.kesif.common.api.KesifApiException;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.util.*;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.http.HttpStatus;

/** Only a keyed digest is persisted. Creation retries derive the same owner-only code. */
public final class RoomCodeCodec {
    private static final String ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private final byte[] secret;
    public RoomCodeCodec(String configuredSecret, boolean local) {
        if (configuredSecret == null || configuredSecret.isBlank()) {
            if (!local) throw new IllegalStateException("ROOM_CODE_SECRET is required outside local");
            secret = new byte[32]; new SecureRandom().nextBytes(secret);
        } else {
            try { secret = Base64.getDecoder().decode(configuredSecret); }
            catch (IllegalArgumentException e) { throw new IllegalStateException("ROOM_CODE_SECRET must be base64"); }
            if (secret.length < 32) throw new IllegalStateException("ROOM_CODE_SECRET must contain at least 32 bytes");
        }
    }
    public String codeFor(UUID owner, UUID request) {
        byte[] hash = hmac("create:"+owner+":"+request);
        StringBuilder code = new StringBuilder(8);
        for(int i=0;i<8;i++) code.append(ALPHABET.charAt(hash[i] & 31));
        return code.toString();
    }
    public String digest(String raw) {
        String code = raw.strip().toUpperCase(Locale.ROOT);
        if (code.length()!=8 || code.chars().anyMatch(c->ALPHABET.indexOf(c)<0))
            throw new KesifApiException(HttpStatus.BAD_REQUEST,"INVALID_ROOM_CODE","Oda kodu 8 geçerli karakterden oluşmalı.");
        return HexFormat.of().formatHex(hmac("lookup:"+code));
    }
    private byte[] hmac(String value) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256"); mac.init(new SecretKeySpec(secret,"HmacSHA256"));
            return mac.doFinal(value.getBytes(StandardCharsets.UTF_8));
        } catch (GeneralSecurityException e) { throw new IllegalStateException("HMAC unavailable",e); }
    }
}
