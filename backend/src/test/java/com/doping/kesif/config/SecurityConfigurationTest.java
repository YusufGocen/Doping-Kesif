package com.doping.kesif.config;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(SecurityConfigurationTest.ProbeController.class)
@Import({SecurityConfiguration.class, SecurityConfigurationTest.ProbeController.class})
@ActiveProfiles("local")
class SecurityConfigurationTest {
    @Autowired MockMvc mvc;
    @MockitoBean JwtDecoder jwtDecoder;

    @Test void anonymousBusinessRequestsAreRejected() throws Exception {
        mvc.perform(get("/api/v1/kesif/probe")).andExpect(status().isUnauthorized());
    }

    @Test @WithMockUser
    void unknownEndpointsRemainClosedForAuthenticatedUsers() throws Exception {
        mvc.perform(get("/api/v1/kesif/probe")).andExpect(status().isForbidden());
    }

    @Test void unsafeAnonymousCommandsAreRejected() throws Exception {
        mvc.perform(post("/api/v1/kesif/rooms")).andExpect(status().isUnauthorized());
    }

    @Test void documentationIsPublicInLocalProfile() throws Exception {
        mvc.perform(get("/v3/api-docs")).andExpect(status().isOk());
    }

    @RestController
    static class ProbeController {
        @GetMapping("/api/v1/kesif/probe") String probe() { return "probe"; }
        @GetMapping("/v3/api-docs") String docs() { return "probe"; }
    }
}
