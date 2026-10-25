package com.doping.kesif.local;

import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.util.HexFormat;
import java.util.UUID;

/** Immutable fixture identity namespaces. Branding must never alter persisted foreign keys. */
final class LocalFixtureIds {
    private static final byte[] DEMO_V1 = HexFormat.of().parseHex("646f70696e672d626174746c652d64656d6f3a");
    private static final byte[] CONTENT_V1 = HexFormat.of().parseHex("646f70696e672d626174746c652d636f6e74656e742d76313a");
    private LocalFixtureIds() { }
    static UUID demo(String key) { return id(DEMO_V1, key); }
    static UUID content(String key) { return id(CONTENT_V1, key); }
    private static UUID id(byte[] namespace, String key) {
        byte[] value = key.getBytes(StandardCharsets.UTF_8);
        return UUID.nameUUIDFromBytes(ByteBuffer.allocate(namespace.length + value.length).put(namespace).put(value).array());
    }
}
