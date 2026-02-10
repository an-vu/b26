package com.bento26.backend.profile.domain;

import com.bento26.backend.profile.persistence.CardEntity;
import com.bento26.backend.profile.persistence.ProfileEntity;
import com.bento26.backend.profile.persistence.ProfileRepository;
import java.util.List;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ProfileDataSeeder {
  @Bean
  CommandLineRunner seedProfiles(ProfileRepository profileRepository) {
    return args -> {
      if (profileRepository.count() > 0) {
        return;
      }

      profileRepository.saveAll(
          List.of(
              buildProfile(
                  "default",
                  "An Vu",
                  "Software Engineer - Angular + Java",
                  List.of(
                      new CardSeed("github", "GitHub", "https://github.com/"),
                      new CardSeed("linkedin", "LinkedIn", "https://linkedin.com/"),
                      new CardSeed("resume", "Resume", "#"),
                      new CardSeed("projects", "Projects", "#"))),
              buildProfile(
                  "berkshire",
                  "An Vu",
                  "Software Engineering - Angular + Spring Boot",
                  List.of(
                      new CardSeed("github", "GitHub", "https://github.com/"),
                      new CardSeed("linkedin", "LinkedIn", "https://linkedin.com/"),
                      new CardSeed("resume", "Resume", "#"),
                      new CardSeed("projects", "Projects", "#"))),
              buildProfile(
                  "union-pacific",
                  "An Vu",
                  "Software Engineering - Angular + Java",
                  List.of(
                      new CardSeed("github", "GitHub", "https://github.com/"),
                      new CardSeed("linkedin", "LinkedIn", "https://linkedin.com/"),
                      new CardSeed("resume", "Resume", "#"),
                      new CardSeed("projects", "Projects", "#")))));
    };
  }

  private static ProfileEntity buildProfile(
      String id, String name, String headline, List<CardSeed> cardSeeds) {
    ProfileEntity profile = new ProfileEntity();
    profile.setId(id);
    profile.setName(name);
    profile.setHeadline(headline);

    for (CardSeed seed : cardSeeds) {
      CardEntity card = new CardEntity();
      card.setId(seed.id());
      card.setLabel(seed.label());
      card.setHref(seed.href());
      card.setProfile(profile);
      profile.getCards().add(card);
    }
    return profile;
  }

  private record CardSeed(String id, String label, String href) {}
}
