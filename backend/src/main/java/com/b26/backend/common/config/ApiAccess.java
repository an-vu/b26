package com.b26.backend.common.config;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/** Declares admission rules on the endpoint Spring actually matched. */
@Target({ElementType.TYPE, ElementType.METHOD})
@Retention(RetentionPolicy.RUNTIME)
public @interface ApiAccess {
  Policy value();

  String boardVariable() default "boardId";

  /** Board routes use slugs; analytics routes use stable database IDs. */
  boolean byId() default false;

  enum Policy {
    PUBLIC,
    AUTHENTICATED,
    BOARD_READ,
    BOARD_OWNER_READ,
    BOARD_WRITE
  }
}
