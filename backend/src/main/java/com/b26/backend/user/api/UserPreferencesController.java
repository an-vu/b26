package com.b26.backend.user.api;

import com.b26.backend.user.domain.UserPreferencesService;
import com.b26.backend.user.domain.UserProfileService;
import com.b26.backend.common.config.ApiAccess;
import com.b26.backend.common.config.CurrentUser;
import com.b26.backend.user.persistence.AppUserEntity;
import static com.b26.backend.common.config.ApiAccess.Policy.*;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@ApiAccess(AUTHENTICATED)
@RequestMapping("/api/users")
public class UserPreferencesController {
  private final UserPreferencesService userPreferencesService;
  private final UserProfileService userProfileService;

  public UserPreferencesController(
      UserPreferencesService userPreferencesService,
      UserProfileService userProfileService) {
    this.userPreferencesService = userPreferencesService;
    this.userProfileService = userProfileService;
  }

  @GetMapping("/me")
  public UserProfileDto getMyProfile(
      @CurrentUser AppUserEntity user) {
    return userProfileService.getMyProfile(user);
  }

  @PatchMapping("/me")
  public UserProfileDto updateMyProfile(
      @CurrentUser AppUserEntity user,
      @Valid @RequestBody UpdateUserProfileRequest request) {
    return userProfileService.updateMyProfile(user.getId(), request);
  }

  @GetMapping("/me/preferences")
  public UserPreferencesDto getMyPreferences(
      @CurrentUser AppUserEntity user) {
    return userPreferencesService.getMyPreferences(user);
  }

  @PatchMapping("/me/preferences")
  public UserPreferencesDto updateMyPreferences(
      @CurrentUser AppUserEntity user,
      @Valid @RequestBody UpdateUserPreferencesRequest request) {
    return userPreferencesService.updateMyPreferences(user, request);
  }

  @GetMapping("/{username}/main-board")
  @ApiAccess(PUBLIC)
  public UserMainBoardDto getUserMainBoard(@PathVariable String username) {
    return userPreferencesService.getMainBoardByUsername(username);
  }

  @GetMapping("/me/preferences/home")
  public HomeAppearanceDto getHomeAppearance(
      @CurrentUser AppUserEntity user) {
    return userPreferencesService.getHomeAppearance(user.getId());
  }

  @PutMapping("/me/preferences/home")
  public HomeAppearanceDto updateHomeAppearance(
      @CurrentUser AppUserEntity user,
      @Valid @RequestBody HomeAppearanceDto request) {
    return userPreferencesService.updateHomeAppearance(user.getId(), request);
  }
}
