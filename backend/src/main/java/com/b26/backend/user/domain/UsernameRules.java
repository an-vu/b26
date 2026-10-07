package com.b26.backend.user.domain;

import java.util.Set;

public final class UsernameRules {
  // First path segments owned by application routes or hosting infrastructure.
  private static final Set<String> RESERVED =
      Set.of("b", "u", "api", "actuator", "insights", "settings", "signin", "signup", "assets");

  private UsernameRules() {}

  public static boolean isReserved(String username) {
    return RESERVED.contains(username);
  }
}
