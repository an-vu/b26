package com.b26.backend;

import com.b26.backend.common.config.ProductionSafetyGuard;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import static org.assertj.core.api.Assertions.assertThat;

class ProductionSafetyGuardTest {
  private final ApplicationContextRunner runner = new ApplicationContextRunner()
      .withUserConfiguration(ProductionSafetyGuard.class);

  @Test
  void productionDefaultsAreSafe() {
    runner.withPropertyValues("spring.profiles.active=prod")
        .run(context -> assertThat(context).hasNotFailed());
  }

  @Test
  void rejectsPasswordBypassForProdAndRenderRegardlessOfProfile() {
    for (String runtime : new String[]{"spring.profiles.active=prod", "RENDER=true"}) {
      runner.withPropertyValues(runtime, "app.auth.require-password=false")
          .run(context -> assertThat(context.getStartupFailure())
              .hasRootCauseMessage("Production requires APP_AUTH_REQUIRE_PASSWORD=true"));
    }
  }

  @Test
  void rejectsDemoSeedingInProduction() {
    for (String runtime : new String[]{"spring.profiles.active=prod", "RENDER=true"}) {
      runner.withPropertyValues(runtime, "app.demo-users.enabled=true")
          .run(context -> assertThat(context.getStartupFailure())
              .hasRootCauseMessage("Production requires APP_DEMO_USERS_ENABLED=false"));
    }
  }

  @Test
  void localDockerShortcutsRemainAvailable() {
    runner.withPropertyValues("spring.profiles.active=postgres", "app.auth.require-password=false", "app.demo-users.enabled=true")
        .run(context -> assertThat(context).hasNotFailed());
  }
}
