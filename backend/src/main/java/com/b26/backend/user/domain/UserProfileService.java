package com.b26.backend.user.domain;

import com.b26.backend.common.api.BadRequestException;
import com.b26.backend.common.api.ConflictException;
import com.b26.backend.common.api.NotFoundException;
import com.b26.backend.user.api.UpdateUserProfileRequest;
import com.b26.backend.user.api.UserProfileDto;
import com.b26.backend.user.persistence.AppUserEntity;
import com.b26.backend.user.persistence.AppUserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserProfileService {
  private final AppUserRepository appUserRepository;

  public UserProfileService(AppUserRepository appUserRepository) {
    this.appUserRepository = appUserRepository;
  }

  public UserProfileDto getMyProfile(AppUserEntity user) {
    return toDto(user);
  }

  @Transactional
  public UserProfileDto updateMyProfile(String userId, UpdateUserProfileRequest request) {
    AppUserEntity user = appUserRepository.lockById(userId).orElseThrow(() -> NotFoundException.user(userId));

    String normalizedDisplayName = request.displayName().trim();
    if (normalizedDisplayName.isEmpty()) {
      throw new BadRequestException("profile", "displayName is required");
    }

    String normalizedUsername = normalizeUsername(request.username());
    if (UsernameRules.isReserved(normalizedUsername)) {
      throw new BadRequestException("profile", "username is reserved");
    }
    if (appUserRepository.existsByUsernameAndIdNot(normalizedUsername, user.getId())) {
      throw new BadRequestException("profile", "username is already used: " + normalizedUsername);
    }

    // Email is the sign-in identifier, so it can be changed but never removed.
    String normalizedEmail = request.email() == null ? "" : request.email().trim().toLowerCase(java.util.Locale.ROOT);
    if (normalizedEmail.isEmpty()) {
      throw new BadRequestException("profile", "email is required");
    }
    if (appUserRepository.existsByEmailIgnoreCaseAndIdNot(normalizedEmail, user.getId())) {
      throw new ConflictException("email already in use");
    }

    user.setDisplayName(normalizedDisplayName);
    user.setUsername(normalizedUsername);
    user.setEmail(normalizedEmail);
    return toDto(appUserRepository.saveAndFlush(user));
  }

  private static String normalizeUsername(String rawUsername) {
    String normalized = rawUsername.trim().toLowerCase(java.util.Locale.ROOT);
    if (!UsernameRules.isSlug(normalized)) {
      throw new BadRequestException("profile",
          "username must use lowercase letters, numbers, and single hyphens");
    }
    return normalized;
  }

  private static UserProfileDto toDto(AppUserEntity user) {
    return new UserProfileDto(user.getId(), user.getDisplayName(), user.getUsername(), user.getEmail());
  }
}
