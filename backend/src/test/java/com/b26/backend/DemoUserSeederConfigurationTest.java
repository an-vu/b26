package com.b26.backend;

import com.b26.backend.user.domain.DemoUserSeeder;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

import static org.assertj.core.api.Assertions.assertThat;

class DemoUserSeederConfigurationTest {
  @Test
  void disabledByDefaultAndExcludedFromProductionEvenWhenEnabled() {
    new ApplicationContextRunner().withUserConfiguration(DemoUserSeeder.class)
        .run(context -> assertThat(context).doesNotHaveBean(DemoUserSeeder.class));
    new ApplicationContextRunner().withUserConfiguration(DemoUserSeeder.class)
        .withPropertyValues("app.demo-users.enabled=true", "spring.profiles.active=prod")
        .run(context -> assertThat(context).doesNotHaveBean(DemoUserSeeder.class));
  }
}
