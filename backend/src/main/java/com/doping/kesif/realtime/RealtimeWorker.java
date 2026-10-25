package com.doping.kesif.realtime;

import com.doping.kesif.outbox.OutboxPublisher;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name="kesif.realtime.worker-enabled",havingValue="true",matchIfMissing=true)
public class RealtimeWorker {
    private final OutboxPublisher publisher;
    private final KesifWebSocketHandler handler;
    public RealtimeWorker(OutboxPublisher publisher,KesifWebSocketHandler handler) { this.publisher=publisher; this.handler=handler; }
    @Scheduled(initialDelay=1000,fixedDelay=1000)
    public void tick() {
        handler.reap();
        for(int i=0;i<50&&publisher.publishNext();i++) { }
    }
}
