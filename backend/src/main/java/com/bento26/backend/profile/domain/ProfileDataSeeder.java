package com.bento26.backend.profile.domain;

import com.bento26.backend.profile.persistence.CardEntity;
import com.bento26.backend.profile.persistence.ProfileEntity;
import com.bento26.backend.profile.persistence.ProfileRepository;
import com.bento26.backend.widget.persistence.WidgetEntity;
import com.bento26.backend.widget.persistence.WidgetRepository;
import java.util.List;
import java.util.Map;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ProfileDataSeeder {
  @Bean
  CommandLineRunner seedProfiles(ProfileRepository profileRepository, WidgetRepository widgetRepository) {
    return args -> {
      if (profileRepository.count() > 0) {
        return;
      }

      List<ProfileEntity> profiles =
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

      Map<String, ProfileEntity> byId =
          profiles.stream().collect(java.util.stream.Collectors.toMap(ProfileEntity::getId, p -> p));
      ProfileEntity defaultProfile = byId.get("default");
      if (defaultProfile != null) {
        widgetRepository.saveAll(
            List.of(
                buildWidget(
                    defaultProfile,
                    "embed",
                    "Now Playing",
                    "span-1",
                    "{\"embedUrl\":\"https://open.spotify.com/embed/track/4uLU6hMCjMI75M1A2tKUQC\"}",
                    0),
                buildWidget(
                    defaultProfile,
                    "map",
                    "Places Visited",
                    "span-2",
                    "{\"places\":[\"Omaha, NE\",\"Chicago, IL\",\"San Francisco, CA\"]}",
                    1)));
      }
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

  private static WidgetEntity buildWidget(
      ProfileEntity profile,
      String type,
      String title,
      String layout,
      String configJson,
      int sortOrder) {
    WidgetEntity widget = new WidgetEntity();
    widget.setProfile(profile);
    widget.setType(type);
    widget.setTitle(title);
    widget.setLayout(layout);
    widget.setConfigJson(configJson);
    widget.setEnabled(true);
    widget.setSortOrder(sortOrder);
    return widget;
  }

  private record CardSeed(String id, String label, String href) {}
}
