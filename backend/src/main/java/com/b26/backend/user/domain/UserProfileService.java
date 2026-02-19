package com.b26.backend.user.domain;

import com.b26.backend.auth.domain.AuthService;
import com.b26.backend.user.api.UpdateUserProfileRequest;
import com.b26.backend.user.api.UserProfileDto;
import com.b26.backend.user.persistence.AppUserEntity;
import com.b26.backend.user.persistence.AppUserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserProfileService {
  private final AppUserRepository appUserRepository;
  private final AuthService authService;

  public UserProfileService(AppUserRepository appUserRepository, AuthService authService) {
    this.appUserRepository = appUserRepository;
    this.authService = authService;
  }

  @Transactional(readOnly = true)
  public UserProfileDto getMyProfile(String authorizationHeader) {
    return toDto(authService.getAuthenticatedUser(authorizationHeader));
  }

  @Transactional
  public UserProfileDto updateMyProfile(String authorizationHeader, UpdateUserProfileRequest request) {
    AppUserEntity user = authService.getAuthenticatedUser(authorizationHeader);

    String normalizedDisplayName = request.displayName().trim();
    if (normalizedDisplayName.isEmpty()) {
      throw new InvalidUserProfileException("displayName is required");
    }

    String normalizedUsername = normalizeUsername(request.username());
    if (appUserRepository.existsByUsernameAndIdNot(normalizedUsername, user.getId())) {
      throw new InvalidUserProfileException("username is already used: " + normalizedUsername);
    }

    String normalizedEmail = request.email() == null ? null : request.email().trim().toLowerCase();
    if (normalizedEmail != null && normalizedEmail.isEmpty()) {
      normalizedEmail = null;
    }

    user.setDisplayName(normalizedDisplayName);
    user.setUsername(normalizedUsername);
    user.setEmail(normalizedEmail);
    AppUserEntity saved = appUserRepository.save(user);
    return toDto(saved);
  }

  private static String normalizeUsername(String rawUsername) {
    String normalized = rawUsername.trim().toLowerCase();
    if (!normalized.matches("^[a-z0-9]+(?:-[a-z0-9]+)*$")) {
      throw new InvalidUserProfileException(
          "username must use lowercase letters, numbers, and single hyphens");
    }
    return normalized;
  }

  private static UserProfileDto toDto(AppUserEntity user) {
    return new UserProfileDto(user.getId(), user.getDisplayName(), user.getUsername(), user.getEmail());
  }
}
