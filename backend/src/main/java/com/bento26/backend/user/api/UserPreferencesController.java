package com.bento26.backend.user.api;

import com.bento26.backend.user.domain.UserPreferencesService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
public class UserPreferencesController {
  private final UserPreferencesService userPreferencesService;

  public UserPreferencesController(UserPreferencesService userPreferencesService) {
    this.userPreferencesService = userPreferencesService;
  }

  @GetMapping("/me/preferences")
  public UserPreferencesDto getMyPreferences() {
    return userPreferencesService.getMyPreferences();
  }

  @PatchMapping("/me/preferences")
  public UserPreferencesDto updateMyPreferences(
      @Valid @RequestBody UpdateUserPreferencesRequest request) {
    return userPreferencesService.updateMyPreferences(request);
  }

  @GetMapping("/{username}/main-board")
  public UserMainBoardDto getUserMainBoard(@PathVariable String username) {
    return userPreferencesService.getMainBoardByUsername(username);
  }
}
