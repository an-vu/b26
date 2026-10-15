package com.b26.backend.user.domain;

import java.util.Set;
import java.util.regex.Pattern;

/** Shared rules for usernames and board slugs, which both become URL path segments. */
public final class UsernameRules {
  // First path segments owned by application routes or hosting infrastructure.
  private static final Set<String> RESERVED =
      Set.of("b", "u", "api", "actuator", "insights", "settings", "signin", "signup", "assets");
  private static final Pattern SLUG = Pattern.compile("^[a-z0-9]+(?:-[a-z0-9]+)*$");

  private UsernameRules() {}

  public static boolean isReserved(String username) {
    return RESERVED.contains(username);
  }

  /** Lowercase letters and digits separated by single hyphens. */
  public static boolean isSlug(String value) {
    return SLUG.matcher(value).matches();
  }
}
