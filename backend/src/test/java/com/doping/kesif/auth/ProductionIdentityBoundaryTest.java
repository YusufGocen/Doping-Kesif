package com.doping.kesif.auth;

import com.doping.kesif.local.*;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;

import static org.assertj.core.api.Assertions.*;

class ProductionIdentityBoundaryTest {
    @Test void productionAndMixedProfilesNeverLoadLocalIdentityOrSeeder() {
        for (String profiles : new String[]{"prod", "local,prod", "prod,local"}) {
            new ApplicationContextRunner().withUserConfiguration(LocalJwtConfiguration.class,ExternalJwtConfiguration.class,
                    LocalAuthController.class,LocalIdentityDirectory.class,LocalDemoSeeder.class)
                .withPropertyValues("spring.profiles.active="+profiles,"kesif.security.issuer=https://identity.example.invalid",
                    "kesif.security.audience=kesif-test","kesif.security.jwk-set-uri=https://identity.example.invalid/jwks.json",
                    "kesif.local.seed-enabled=true")
                .run(context -> {
                    assertThat(context).hasNotFailed().hasSingleBean(JwtDecoder.class)
                        .doesNotHaveBean(JwtEncoder.class).doesNotHaveBean(LocalAuthController.class)
                        .doesNotHaveBean(LocalIdentityDirectory.class).doesNotHaveBean(LocalDemoSeeder.class);
                });
        }
    }

    @Test void externalIdentityFailsClosedWithoutSecureConfiguration() {
        var configuration=new ExternalJwtConfiguration();
        assertThatThrownBy(()->configuration.externalJwtDecoder(new JwtSettings("http://issuer.invalid","kesif","https://issuer.invalid/keys")))
            .isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(()->configuration.externalJwtDecoder(new JwtSettings("https://issuer.invalid","kesif","")))
            .isInstanceOf(IllegalStateException.class);
    }
}
