package com.doping.kesif.reward;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.ConfigDataApplicationContextInitializer;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import static org.assertj.core.api.Assertions.*;

class RewardPolicyTest {
    @Test void demoDefaultsAreRestrictedToLocalWithoutProduction() {
        for(String profiles:new String[]{"local","prod","local,prod","prod,local"})
            new ApplicationContextRunner().withInitializer(new ConfigDataApplicationContextInitializer())
                .withUserConfiguration(RewardConfiguration.class).withPropertyValues("spring.profiles.active="+profiles)
                .run(context->{
                    assertThat(context).hasNotFailed();
                    assertThat(context.getBean(RewardPolicy.class).enabled()).isEqualTo(profiles.equals("local"));
                });
    }
    @Test void enabledPolicyRequiresExplicitValidAmountsAndMapping() {
        assertThatThrownBy(()->new RewardPolicy(true,null,2,50,"SHARED_UNION")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(()->new RewardPolicy(true,10,-2,50,"SHARED_UNION")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(()->new RewardPolicy(true,10,2,50,"UNKNOWN")).isInstanceOf(IllegalArgumentException.class);
        assertThatCode(()->new RewardPolicy(true,0,0,0,"SHARED_UNION")).doesNotThrowAnyException();
    }
}
