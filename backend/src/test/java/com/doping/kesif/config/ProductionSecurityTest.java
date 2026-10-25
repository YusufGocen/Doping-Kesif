package com.doping.kesif.config;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ProductionSecurityTest.ProbeController.class)
@Import({SecurityConfiguration.class, ProductionSecurityTest.ProbeController.class})
@ActiveProfiles("prod")
class ProductionSecurityTest {
    @Autowired MockMvc mvc;
    @MockitoBean JwtDecoder jwtDecoder;
    @Test void documentationIsNotPublicOutsideLocal() throws Exception {
        mvc.perform(get("/v3/api-docs")).andExpect(status().isUnauthorized());
        mvc.perform(get("/swagger-ui/index.html")).andExpect(status().isUnauthorized());
    }
    @Test void healthIsPublic() throws Exception {
        mvc.perform(get("/actuator/health")).andExpect(status().isOk());
    }
    @Test void localTokenEndpointIsNotPublicInProduction() throws Exception {
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/v1/kesif/dev/auth/token")
            .contentType("application/json").content("{\"userKey\":\"yusuf\"}")).andExpect(status().isUnauthorized());
    }
    @RestController static class ProbeController {
        @GetMapping("/actuator/health") String health() { return "probe"; }
    }
}
