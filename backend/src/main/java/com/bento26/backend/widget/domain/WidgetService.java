package com.bento26.backend.widget.domain;

import com.bento26.backend.profile.domain.ProfileNotFoundException;
import com.bento26.backend.profile.persistence.ProfileRepository;
import com.bento26.backend.widget.api.WidgetDto;
import com.bento26.backend.widget.persistence.WidgetEntity;
import com.bento26.backend.widget.persistence.WidgetRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class WidgetService {
  private final WidgetRepository widgetRepository;
  private final ProfileRepository profileRepository;
  private final ObjectMapper objectMapper;

  public WidgetService(
      WidgetRepository widgetRepository,
      ProfileRepository profileRepository,
      ObjectMapper objectMapper) {
    this.widgetRepository = widgetRepository;
    this.profileRepository = profileRepository;
    this.objectMapper = objectMapper;
  }

  @Transactional(readOnly = true)
  public List<WidgetDto> getWidgetsForProfile(String profileId) {
    if (!profileRepository.existsById(profileId)) {
      throw new ProfileNotFoundException(profileId);
    }
    return widgetRepository.findByProfile_IdOrderBySortOrderAsc(profileId).stream()
        .map(this::toDto)
        .toList();
  }

  private WidgetDto toDto(WidgetEntity widget) {
    return new WidgetDto(
        widget.getId(),
        widget.getType(),
        widget.getTitle(),
        widget.getLayout(),
        parseJson(widget.getConfigJson()),
        widget.isEnabled(),
        widget.getSortOrder());
  }

  private JsonNode parseJson(String json) {
    try {
      return objectMapper.readTree(json);
    } catch (Exception exception) {
      return objectMapper.createObjectNode();
    }
  }
}
