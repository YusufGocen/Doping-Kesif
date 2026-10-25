package com.doping.kesif.common.api;

import org.springframework.http.HttpStatus;

public class KesifApiException extends RuntimeException {
    @java.io.Serial
    private static final long serialVersionUID = 1L;
    private final HttpStatus status;
    private final String code;

    public KesifApiException(HttpStatus status, String code, String message) {
        super(message); this.status = status; this.code = code;
    }
    public HttpStatus getStatus() { return status; }
    public String getCode() { return code; }
}
