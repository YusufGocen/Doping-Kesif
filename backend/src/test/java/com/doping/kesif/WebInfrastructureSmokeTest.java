package com.doping.kesif;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import com.doping.kesif.player.PlayerProfileRepository;
import com.doping.kesif.catalog.SubjectRepository;
import com.doping.kesif.catalog.TopicRepository;
import com.doping.kesif.puzzle.PuzzleRepository;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Only the HTTP infrastructure; this deliberately does not validate PostgreSQL. */
@SpringBootTest(properties = {
    "kesif.local.seed-enabled=false",
    "kesif.rooms.expiry-enabled=false",
    "kesif.game.deadlines-enabled=false",
    "kesif.realtime.worker-enabled=false",
    "spring.autoconfigure.exclude=org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration,"
        + "org.springframework.boot.autoconfigure.orm.jpa.HibernateJpaAutoConfiguration,"
        + "org.springframework.boot.autoconfigure.flyway.FlywayAutoConfiguration"
})
@AutoConfigureMockMvc
@ActiveProfiles("local")
@MockitoBean(types = {PlayerProfileRepository.class,SubjectRepository.class,TopicRepository.class,PuzzleRepository.class,
    com.doping.kesif.room.LobbyService.class,com.doping.kesif.game.GameService.class,
    com.doping.kesif.reward.RewardFinalizer.class,com.doping.kesif.reward.ProgressService.class,
    com.doping.kesif.outbox.OutboxPublisher.class})
class WebInfrastructureSmokeTest {
    @Autowired MockMvc mvc;

    @Test void exposesRealLocalSwaggerAndHealthWithoutDatabase() throws Exception {
        mvc.perform(get("/actuator/health")).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("UP"));
        mvc.perform(get("/v3/api-docs")).andExpect(status().isOk()).andExpect(jsonPath("$.info.title").value("Doping Keşif API"));
        mvc.perform(get("/swagger-ui/index.html")).andExpect(status().isOk());
        mvc.perform(get("/api/v1/kesif/rooms")).andExpect(status().isUnauthorized());
    }
}
