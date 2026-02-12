package com.bento26.backend.profile.domain;

import com.bento26.backend.profile.api.ProfileDto;
import com.bento26.backend.profile.api.UpdateCardRequest;
import com.bento26.backend.profile.api.UpdateProfileMetaRequest;
import com.bento26.backend.profile.api.UpdateProfileRequest;
import com.bento26.backend.profile.persistence.CardEntity;
import com.bento26.backend.profile.persistence.ProfileEntity;
import com.bento26.backend.profile.persistence.ProfileRepository;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProfileService {
  private final ProfileRepository profileRepository;

  public ProfileService(ProfileRepository profileRepository) {
    this.profileRepository = profileRepository;
  }

  @Transactional(readOnly = true)
  public ProfileDto getProfile(String profileId) {
    ProfileEntity profile =
        profileRepository
            .findById(profileId)
            .orElseThrow(() -> new ProfileNotFoundException(profileId));
    return toDto(profile);
  }

  @Transactional
  public ProfileDto updateProfile(String profileId, UpdateProfileRequest request) {
    ProfileEntity profile =
        profileRepository
            .findById(profileId)
            .orElseThrow(() -> new ProfileNotFoundException(profileId));

    validateNoDuplicateCardIds(request.cards());

    profile.setName(request.name());
    profile.setHeadline(request.headline());
    profile.getCards().clear();
    for (UpdateCardRequest requestCard : request.cards()) {
      CardEntity card = new CardEntity();
      card.setId(requestCard.id());
      card.setLabel(requestCard.label());
      card.setHref(requestCard.href());
      card.setProfile(profile);
      profile.getCards().add(card);
    }

    return toDto(profileRepository.save(profile));
  }

  @Transactional
  public ProfileDto updateProfileMeta(String profileId, UpdateProfileMetaRequest request) {
    ProfileEntity profile =
        profileRepository
            .findById(profileId)
            .orElseThrow(() -> new ProfileNotFoundException(profileId));

    profile.setName(request.name());
    profile.setHeadline(request.headline());
    return toDto(profileRepository.save(profile));
  }

  private static void validateNoDuplicateCardIds(List<UpdateCardRequest> cards) {
    Set<String> ids = new HashSet<>();
    for (UpdateCardRequest card : cards) {
      if (!ids.add(card.id())) {
        throw new InvalidProfileUpdateException("cards contain duplicate id: " + card.id());
      }
    }
  }

  private static ProfileDto toDto(ProfileEntity profile) {
    return new ProfileDto(profile.getId(), profile.getName(), profile.getHeadline());
  }
}
