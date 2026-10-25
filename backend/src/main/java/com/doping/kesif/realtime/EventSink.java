package com.doping.kesif.realtime;

import java.util.Set;
import java.util.UUID;

public interface EventSink {
    void publish(Set<UUID> recipients, RealtimeEvent event);
}
