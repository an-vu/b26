package com.b26.backend.common.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.stereotype.Component;

/** Refuse local authentication shortcuts in production, including a misprofiled Render service. */
@Component
public class ProductionSafetyGuard {
  public ProductionSafetyGuard(
      Environment environment,
      @Value("${app.auth.require-password:true}") boolean requirePassword,
      @Value("${app.demo-users.enabled:false}") boolean demoUsersEnabled) {
    boolean production = environment.acceptsProfiles(Profiles.of("prod"))
        || Boolean.parseBoolean(environment.getProperty("RENDER", "false"));
    if (production && !requirePassword) {
      throw new IllegalStateException("Production requires APP_AUTH_REQUIRE_PASSWORD=true");
    }
    if (production && demoUsersEnabled) {
      throw new IllegalStateException("Production requires APP_DEMO_USERS_ENABLED=false");
    }
  }
}
