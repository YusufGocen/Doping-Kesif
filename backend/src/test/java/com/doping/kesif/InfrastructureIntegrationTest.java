package com.doping.kesif;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIf;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("local")
@EnabledIf(value = "com.doping.kesif.PostgresTestSupport#databaseAvailable", disabledReason = "Docker or explicit test PostgreSQL required")
class InfrastructureIntegrationTest extends PostgresTestSupport {
    @Autowired MockMvc mvc;
    @Autowired Flyway flyway;

    @Test void migratesPostgresAndExposesLocalDocumentation() throws Exception {
        assertThat(flyway.info().current().getVersion().getVersion()).isEqualTo("9");
        mvc.perform(get("/actuator/health")).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("UP"));
        mvc.perform(get("/v3/api-docs")).andExpect(status().isOk()).andExpect(jsonPath("$.info.title").value("Doping Keşif API"));
        mvc.perform(get("/swagger-ui/index.html")).andExpect(status().isOk());
    }
}
