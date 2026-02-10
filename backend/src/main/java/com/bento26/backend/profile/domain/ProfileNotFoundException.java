package com.bento26.backend.profile.domain;

public class ProfileNotFoundException extends RuntimeException {
  public ProfileNotFoundException(String profileId) {
    super("Profile not found: " + profileId);
  }
}
