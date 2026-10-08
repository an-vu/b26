package com.b26.backend.user.domain;

import com.b26.backend.board.domain.BoardService;
import com.b26.backend.user.persistence.AppUserEntity;
import com.b26.backend.user.persistence.AppUserRepository;
import com.b26.backend.user.persistence.UserPreferenceEntity;
import com.b26.backend.user.persistence.UserPreferenceRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.annotation.Profile;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@Profile("!prod")
@ConditionalOnProperty(name = "app.demo-users.enabled", havingValue = "true")
public class DemoUserSeeder {
  private final AppUserRepository users;
  private final BoardService boards;
  private final UserPreferenceRepository preferences;

  public DemoUserSeeder(AppUserRepository users, BoardService boards, UserPreferenceRepository preferences) {
    this.users = users;
    this.boards = boards;
    this.preferences = preferences;
  }

  @EventListener(ApplicationReadyEvent.class)
  @Transactional
  public void seed() {
    // Opt-in local fixtures. Existing accounts and their edits are never replaced.
    for (String username : List.of("blueberry", "news", "feature", "daily", "emma", "victoria", "nori")) {
      if (users.existsByUsernameIgnoreCase(username)
          || users.existsByEmailIgnoreCase(username + "@demo.local")) continue;
      AppUserEntity user = new AppUserEntity();
      user.setId(UUID.randomUUID().toString());
      user.setUsername(username);
      user.setDisplayName(Character.toUpperCase(username.charAt(0)) + username.substring(1));
      user.setEmail(username + "@demo.local");
      user.setRole("USER");
      users.saveAndFlush(user);
      var board = boards.createStarterBoardForOwner(user);
      boards.updateVisibility(board.boardUrl(), new com.b26.backend.board.api.UpdateBoardVisibilityRequest("public", board.version()));
      UserPreferenceEntity preference = new UserPreferenceEntity();
      preference.setUserId(user.getId());
      preference.setMainBoardId(board.id());
      preferences.save(preference);
    }
  }
}
