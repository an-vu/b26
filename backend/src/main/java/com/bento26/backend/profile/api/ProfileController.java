package com.bento26.backend.profile.api;

import com.bento26.backend.profile.domain.ProfileService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/profile")
public class ProfileController {
  private final ProfileService profileService;

  public ProfileController(ProfileService profileService) {
    this.profileService = profileService;
  }

  @GetMapping("/{profileId}")
  public ProfileDto getProfile(@PathVariable String profileId) {
    return profileService.getProfile(profileId);
  }

  @PutMapping("/{profileId}")
  public ProfileDto updateProfile(
      @PathVariable String profileId, @Valid @RequestBody UpdateProfileRequest request) {
    return profileService.updateProfile(profileId, request);
  }

  @PatchMapping("/{profileId}/meta")
  public ProfileDto updateProfileMeta(
      @PathVariable String profileId, @Valid @RequestBody UpdateProfileMetaRequest request) {
    return profileService.updateProfileMeta(profileId, request);
  }
}
