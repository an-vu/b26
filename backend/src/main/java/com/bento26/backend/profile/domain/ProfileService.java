package com.bento26.backend.profile.domain;

import com.bento26.backend.profile.api.CardDto;
import com.bento26.backend.profile.api.ProfileDto;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class ProfileService {
  private static final Map<String, ProfileDto> PROFILES =
      Map.of(
          "default",
          new ProfileDto(
              "default",
              "An Vu",
              "Software Engineer - Angular + Java",
              List.of(
                  new CardDto("github", "GitHub", "https://github.com/"),
                  new CardDto("linkedin", "LinkedIn", "https://linkedin.com/"),
                  new CardDto("resume", "Resume", "#"),
                  new CardDto("projects", "Projects", "#"))),
          "berkshire",
          new ProfileDto(
              "berkshire",
              "An Vu",
              "Software Engineering - Angular + Spring Boot",
              List.of(
                  new CardDto("github", "GitHub", "https://github.com/"),
                  new CardDto("linkedin", "LinkedIn", "https://linkedin.com/"),
                  new CardDto("resume", "Resume", "#"),
                  new CardDto("projects", "Projects", "#"))),
          "union-pacific",
          new ProfileDto(
              "union-pacific",
              "An Vu",
              "Software Engineering - Angular + Java",
              List.of(
                  new CardDto("github", "GitHub", "https://github.com/"),
                  new CardDto("linkedin", "LinkedIn", "https://linkedin.com/"),
                  new CardDto("resume", "Resume", "#"),
                  new CardDto("projects", "Projects", "#"))));

  public ProfileDto getProfile(String profileId) {
    ProfileDto profile = PROFILES.get(profileId);
    if (profile == null) {
      throw new ProfileNotFoundException(profileId);
    }
    return profile;
  }
}
