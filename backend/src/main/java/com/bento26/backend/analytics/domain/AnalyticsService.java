package com.bento26.backend.analytics.domain;

import com.bento26.backend.analytics.api.AnalyticsResponse;
import com.bento26.backend.analytics.api.CardAnalyticsDto;
import com.bento26.backend.analytics.persistence.ClickEventEntity;
import com.bento26.backend.analytics.persistence.ClickEventRepository;
import com.bento26.backend.profile.domain.ProfileNotFoundException;
import com.bento26.backend.profile.persistence.CardRepository;
import com.bento26.backend.profile.persistence.ProfileRepository;
import java.time.Instant;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AnalyticsService {
  private final ClickEventRepository clickEventRepository;
  private final ProfileRepository profileRepository;
  private final CardRepository cardRepository;
  private final ClickAbuseGuard clickAbuseGuard;

  public AnalyticsService(
      ClickEventRepository clickEventRepository,
      ProfileRepository profileRepository,
      CardRepository cardRepository,
      ClickAbuseGuard clickAbuseGuard) {
    this.clickEventRepository = clickEventRepository;
    this.profileRepository = profileRepository;
    this.cardRepository = cardRepository;
    this.clickAbuseGuard = clickAbuseGuard;
  }

  @Transactional
  public void recordClick(String profileId, String cardId, String sourceIp) {
    if (!profileRepository.existsById(profileId)) {
      throw new ProfileNotFoundException(profileId);
    }
    if (!cardRepository.existsByProfile_IdAndId(profileId, cardId)) {
      throw new CardNotFoundForProfileException(profileId, cardId);
    }
    if (!clickAbuseGuard.shouldAccept(sourceIp, profileId, cardId)) {
      throw new ClickRateLimitedException();
    }

    ClickEventEntity event = new ClickEventEntity();
    event.setProfileId(profileId);
    event.setCardId(cardId);
    event.setOccurredAt(Instant.now());
    event.setSourceIp(sourceIp);
    clickEventRepository.save(event);
  }

  @Transactional(readOnly = true)
  public AnalyticsResponse getAnalytics(String profileId) {
    if (!profileRepository.existsById(profileId)) {
      throw new ProfileNotFoundException(profileId);
    }
    long total = clickEventRepository.countByProfileId(profileId);
    List<CardAnalyticsDto> byCard =
        clickEventRepository.countByCardForProfile(profileId).stream()
            .map(row -> new CardAnalyticsDto(row.getCardId(), row.getClickCount()))
            .toList();
    return new AnalyticsResponse(profileId, total, byCard);
  }
}
