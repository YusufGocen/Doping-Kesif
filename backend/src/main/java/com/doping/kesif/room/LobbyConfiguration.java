package com.doping.kesif.room;

import java.time.Clock;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.*;
import org.springframework.core.env.*;

@Configuration(proxyBeanMethods=false)
@EnableConfigurationProperties(RoomPolicy.class)
public class LobbyConfiguration {
    @Bean Clock lobbyClock() { return Clock.systemUTC(); }
    @Bean RoomCodeCodec roomCodeCodec(RoomPolicy policy, Environment environment) {
        return new RoomCodeCodec(policy.codeSecret(),environment.acceptsProfiles(Profiles.of("local & !prod")));
    }
    @Bean ApplicationRunner reconcileRoomCodes(LobbyService service) {
        return args -> service.expireUnrecoverableCodeRooms();
    }
}
