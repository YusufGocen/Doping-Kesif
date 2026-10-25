package com.doping.kesif;

import com.doping.kesif.auth.JwtSettings;
import com.doping.kesif.local.LocalDemoSeeder;
import com.fasterxml.jackson.databind.*;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIf;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.MockMvcPrint;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.*;
import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc(print = MockMvcPrint.NONE)
@ActiveProfiles("local")
@EnabledIf(value = "com.doping.kesif.PostgresTestSupport#databaseAvailable", disabledReason = "Docker or explicit test PostgreSQL required")
class AuthCatalogIntegrationTest extends PostgresTestSupport {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    @Autowired JwtEncoder encoder;
    @Autowired JwtSettings settings;
    @Autowired JdbcTemplate jdbc;
    @Autowired LocalDemoSeeder seeder;

    @Test void localTokenResolvesOnlyTheTrustedStudentAndIsNotCached() throws Exception {
        var result=mvc.perform(post("/api/v1/kesif/dev/auth/token").contentType(MediaType.APPLICATION_JSON)
            .content("{\"userKey\":\"yusuf\"}")).andExpect(status().isOk())
            .andExpect(header().string("Cache-Control",containsString("no-store")))
            .andExpect(jsonPath("$.tokenType").value("Bearer")).andReturn();
        String token=mapper.readTree(result.getResponse().getContentAsString(StandardCharsets.UTF_8)).get("accessToken").asText();
        mvc.perform(get("/api/v1/kesif/me").param("studentId","local:emir").header("Authorization","Bearer "+token))
            .andExpect(status().isOk()).andExpect(jsonPath("$.externalUserId").value("local:yusuf"))
            .andExpect(jsonPath("$.displayName").value("Yusuf Göçen"))
            .andExpect(jsonPath("$.roles[0]").value("STUDENT"));
    }

    @Test void unknownUsersAndClientSuppliedRolesCannotMintTokens() throws Exception {
        mvc.perform(post("/api/v1/kesif/dev/auth/token").contentType(MediaType.APPLICATION_JSON)
            .content("{\"userKey\":\"unknown\"}")).andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("UNKNOWN_DEMO_USER"));
        mvc.perform(post("/api/v1/kesif/dev/auth/token").contentType(MediaType.APPLICATION_JSON)
            .content("{\"userKey\":\"yusuf\",\"roles\":[\"ADMIN\"]}")).andExpect(status().isBadRequest());
        mvc.perform(post("/api/v1/kesif/dev/auth/token").contentType(MediaType.APPLICATION_JSON)
            .content("{\"userKey\":\"\"}")).andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/kesif/dev/auth/users")).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(5));
    }

    @Test void missingMalformedAndTamperedTokensAreRejected() throws Exception {
        mvc.perform(get("/api/v1/kesif/me")).andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value("UNAUTHENTICATED"));
        mvc.perform(get("/api/v1/kesif/me").header("Authorization","Bearer not-a-jwt")).andExpect(status().isUnauthorized());
        String original=token("yusuf");
        String[] parts=original.split("\\.");
        JsonNode claims=mapper.readTree(Base64.getUrlDecoder().decode(parts[1]));
        ((com.fasterxml.jackson.databind.node.ObjectNode)claims).put("sub","local:emir");
        parts[1]=Base64.getUrlEncoder().withoutPadding().encodeToString(mapper.writeValueAsBytes(claims));
        mvc.perform(get("/api/v1/kesif/me").header("Authorization","Bearer "+String.join(".",parts)))
            .andExpect(status().isUnauthorized());
    }

    @Test void rejectsWrongIssuerAudienceExpiredFutureAndMissingRequiredClaims() throws Exception {
        Instant now=Instant.now();
        List<JwtClaimsSet> invalid=List.of(
            claims("local:yusuf").issuer("https://wrong.invalid").build(),
            claims("local:yusuf").audience(List.of("wrong-audience")).build(),
            claims("local:yusuf").expiresAt(now.minusSeconds(120)).build(),
            claims("local:yusuf").notBefore(now.plusSeconds(3600)).build(),
            claims(" ").build(),
            claims("x".repeat(129)).build(),
            JwtClaimsSet.builder().issuer(settings.issuer()).audience(List.of(settings.audience()))
                .subject("local:yusuf").claim("roles",List.of("STUDENT")).build(),
            JwtClaimsSet.builder().issuer(settings.issuer()).expiresAt(now.plusSeconds(600))
                .subject("local:yusuf").claim("roles",List.of("STUDENT")).build()
        );
        for(var value:invalid) mvc.perform(get("/api/v1/kesif/me").header("Authorization","Bearer "+signed(value)))
            .andExpect(status().isUnauthorized());
    }

    @Test void validSignatureWithoutStudentRoleDoesNotAuthorizeStudentRoutes() throws Exception {
        for(var role:List.of(List.of("ADMIN"),List.of("UNKNOWN"),List.of())) {
            mvc.perform(get("/api/v1/kesif/me").header("Authorization","Bearer "+signed(claims("local:yusuf").claim("roles",role).build())))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("FORBIDDEN"));
        }
    }

    @Test void catalogReturnsSafeDtosAndHonestAvailability() throws Exception {
        String token=token("yusuf");
        mvc.perform(get("/api/v1/kesif/catalog/grades").header("Authorization","Bearer "+token))
            .andExpect(status().isOk()).andExpect(jsonPath("$[?(@.gradeLevel == 8)].playable",contains(true)))
            .andExpect(jsonPath("$[?(@.gradeLevel == 5)].playable",contains(true)));
        mvc.perform(get("/api/v1/kesif/catalog/subjects").param("grade","8").header("Authorization","Bearer "+token))
            .andExpect(status().isOk()).andExpect(jsonPath("$[?(@.code == 'DEMO_MATH')].playable",contains(true)));
        var response=mvc.perform(get("/api/v1/kesif/catalog/topics").param("grade","8").param("subjectId",LocalDemoSeeder.MATH_ID.toString())
            .header("Authorization","Bearer "+token)).andExpect(status().isOk())
            .andExpect(jsonPath("$[?(@.code == 'DEMO_ALGEBRA')].availableQuestionCount",contains(12))).andReturn().getResponse().getContentAsString();
        assertThat(response).doesNotContain("correct_option_key","correctOptionKey","question_snapshot","questionSnapshot","isCorrect");
        mvc.perform(get("/api/v1/kesif/puzzles").header("Authorization","Bearer "+token))
            .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(4)).andExpect(jsonPath("$[0].pieceCount").value(20));
    }

    @Test @Transactional
    void unpublishedQuestionsAndInactivePuzzlesAreExcluded() throws Exception {
        jdbc.update("INSERT INTO kesif.kesif_question(topic_id,body,content_version,status) VALUES (?,'{}'::jsonb,1,'DRAFT')",LocalDemoSeeder.ALGEBRA_ID);
        jdbc.update("INSERT INTO kesif.kesif_puzzle(code,title,asset_key,active) VALUES (?,'Hidden','hidden',false)","hidden-"+UUID.randomUUID());
        String token=token("yusuf");
        mvc.perform(get("/api/v1/kesif/catalog/topics").param("grade","8").param("subjectId",LocalDemoSeeder.MATH_ID.toString())
            .header("Authorization","Bearer "+token)).andExpect(status().isOk()).andExpect(jsonPath("$[?(@.code == 'DEMO_ALGEBRA')].availableQuestionCount",contains(12)));
        mvc.perform(get("/api/v1/kesif/puzzles").header("Authorization","Bearer "+token))
            .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(4));
    }

    @Test void invalidCatalogFiltersReturnStructuredErrors() throws Exception {
        String token=token("yusuf");
        for(String grade:List.of("4","9","not-a-number")) mvc.perform(get("/api/v1/kesif/catalog/subjects").param("grade",grade)
            .header("Authorization","Bearer "+token)).andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("INVALID_REQUEST"));
        mvc.perform(get("/api/v1/kesif/catalog/topics").param("grade","8").param("subjectId","bad-uuid")
            .header("Authorization","Bearer "+token)).andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/kesif/catalog/topics").param("grade","8").param("subjectId",UUID.randomUUID().toString())
            .header("Authorization","Bearer "+token)).andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("SUBJECT_NOT_FOUND"));
    }

    @Test void onlySameGroupFriendsAreVisible() throws Exception {
        String token=token("yusuf");
        mvc.perform(get("/api/v1/kesif/groups").header("Authorization","Bearer "+token)).andExpect(status().isOk())
            .andExpect(jsonPath("$[0].id").value("local-group-8a")).andExpect(jsonPath("$[0].memberCount").value(4));
        mvc.perform(get("/api/v1/kesif/groups/local-group-8a/friends").header("Authorization","Bearer "+token))
            .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(3))
            .andExpect(jsonPath("$[*].externalUserId",not(hasItem("local:yusuf"))))
            .andExpect(jsonPath("$[*].externalUserId",not(hasItem("local:emir"))));
        mvc.perform(get("/api/v1/kesif/groups/local-group-8b/friends").header("Authorization","Bearer "+token))
            .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("NOT_SAME_GROUP"));
        mvc.perform(get("/api/v1/kesif/groups/local-group-8a/friends").header("Authorization","Bearer "+token("emir")))
            .andExpect(status().isForbidden());
    }

    @Test void corsAllowsOnlyConfiguredFrontendOrigins() throws Exception {
        mvc.perform(options("/api/v1/kesif/me").header("Origin","http://localhost:5173")
            .header("Access-Control-Request-Method","GET").header("Access-Control-Request-Headers","Authorization"))
            .andExpect(status().isOk()).andExpect(header().string("Access-Control-Allow-Origin","http://localhost:5173"));
        mvc.perform(options("/api/v1/kesif/me").header("Origin","https://untrusted.invalid")
            .header("Access-Control-Request-Method","GET"))
            .andExpect(status().isForbidden()).andExpect(header().doesNotExist("Access-Control-Allow-Origin"));
    }

    @Test void seedCanRunAgainWithoutDuplicatingPublishedQuestions() throws Exception {
        seeder.run(new DefaultApplicationArguments(new String[0]));
        assertThat(jdbc.queryForObject("SELECT count(*) FROM kesif.kesif_question WHERE topic_id=? AND status='PUBLISHED'",Integer.class,LocalDemoSeeder.ALGEBRA_ID)).isEqualTo(12);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM kesif.kesif_question_option o JOIN kesif.kesif_question q ON q.id=o.question_id WHERE q.topic_id=? AND o.correct",Integer.class,LocalDemoSeeder.ALGEBRA_ID)).isEqualTo(12);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM kesif.kesif_question q JOIN kesif.kesif_topic t ON t.id=q.topic_id WHERE t.code LIKE 'LOCAL_%'",Integer.class)).isEqualTo(320);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM (SELECT q.id FROM kesif.kesif_question q JOIN kesif.kesif_topic t ON t.id=q.topic_id JOIN kesif.kesif_question_option o ON o.question_id=q.id WHERE t.code LIKE 'LOCAL_%' GROUP BY q.id HAVING count(*)<>4 OR count(*) FILTER (WHERE o.correct)<>1) invalid",Integer.class)).isZero();
    }

    @Test void allGradesExposeEightPlayableSubjectsWithGradeSpecificTopics() throws Exception {
        String token=token("yusuf");
        for(int grade=5;grade<=8;grade++) {
            var response=mvc.perform(get("/api/v1/kesif/catalog/subjects").param("grade",String.valueOf(grade)).header("Authorization","Bearer "+token))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(8)).andReturn().getResponse().getContentAsString();
            for(var subject:mapper.readTree(response)) {
                assertThat(subject.get("playable").asBoolean()).isTrue();
                var topicResponse=mvc.perform(get("/api/v1/kesif/catalog/topics").param("grade",String.valueOf(grade)).param("subjectId",subject.get("id").asText())
                    .header("Authorization","Bearer "+token)).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
                for(var topic:mapper.readTree(topicResponse)) {
                    assertThat(topic.get("playable").asBoolean()).isTrue();
                    if(topic.get("code").asText().startsWith("LOCAL_")) assertThat(topic.get("availableQuestionCount").asInt()).isEqualTo(10);
                }
            }
        }
    }

    @Test void generatedOpenApiDescribesTheImplementedRoutes() throws Exception {
        String document=mvc.perform(get("/v3/api-docs")).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        JsonNode api=mapper.readTree(document);
        assertThat(api.at("/paths/~1api~1v1~1kesif~1me/get/security/0/bearerAuth").isArray()).isTrue();
        assertThat(api.at("/paths/~1api~1v1~1kesif~1catalog~1subjects/get").isMissingNode()).isFalse();
        assertThat(api.at("/paths/~1api~1v1~1kesif~1sessions").isMissingNode()).isTrue();
        java.nio.file.Files.writeString(java.nio.file.Path.of("target","generated-openapi.json"),document,StandardCharsets.UTF_8);
    }

    @Test void firstLoginProvisioningIsIdempotentUnderConcurrentRequests() throws Exception {
        String subject="test-login:"+UUID.randomUUID();
        String bearer=signed(claims(subject).build());
        ExecutorService executor=Executors.newFixedThreadPool(2);
        CountDownLatch start=new CountDownLatch(1);
        try {
            Callable<String> request=()->{
                start.await(10,TimeUnit.SECONDS);
                return mapper.readTree(mvc.perform(get("/api/v1/kesif/me").header("Authorization","Bearer "+bearer))
                    .andExpect(status().isOk()).andReturn().getResponse().getContentAsString()).get("id").asText();
            };
            Future<String> a=executor.submit(request), b=executor.submit(request); start.countDown();
            assertThat(a.get(20,TimeUnit.SECONDS)).isEqualTo(b.get(20,TimeUnit.SECONDS));
            assertThat(jdbc.queryForObject("SELECT count(*) FROM kesif.kesif_player_profile WHERE external_user_id=?",Integer.class,subject)).isEqualTo(1);
        } finally {
            executor.shutdownNow();
            jdbc.update("DELETE FROM kesif.kesif_player_profile WHERE external_user_id=?",subject);
        }
    }

    private String token(String userKey) throws Exception {
        var result=mvc.perform(post("/api/v1/kesif/dev/auth/token").contentType(MediaType.APPLICATION_JSON)
            .content(mapper.writeValueAsString(Map.of("userKey",userKey)))).andExpect(status().isOk()).andReturn();
        return mapper.readTree(result.getResponse().getContentAsString()).get("accessToken").asText();
    }
    private JwtClaimsSet.Builder claims(String subject) {
        return JwtClaimsSet.builder().issuer(settings.issuer()).audience(List.of(settings.audience())).subject(subject)
            .issuedAt(Instant.now().minusSeconds(3600)).expiresAt(Instant.now().plusSeconds(600)).claim("roles",List.of("STUDENT"));
    }
    private String signed(JwtClaimsSet claims) {
        return encoder.encode(JwtEncoderParameters.from(JwsHeader.with(SignatureAlgorithm.RS256).build(),claims)).getTokenValue();
    }
}
