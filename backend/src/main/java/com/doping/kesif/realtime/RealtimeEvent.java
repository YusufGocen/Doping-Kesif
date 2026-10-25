package com.doping.kesif.realtime;

import java.time.Instant;
import java.util.UUID;

/** Notification only. Private payload and answer keys never cross this boundary. */
public record RealtimeEvent(String type, UUID eventId, String aggregateType, UUID aggregateId,
        String eventType, long sequence, Instant occurredAt) { }
