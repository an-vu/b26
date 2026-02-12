package com.bento26.backend.widget.domain;

import com.bento26.backend.profile.domain.ProfileNotFoundException;
import com.bento26.backend.profile.persistence.ProfileEntity;
import com.bento26.backend.profile.persistence.ProfileRepository;
import com.bento26.backend.widget.api.UpsertWidgetRequest;
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

  @Transactional
  public WidgetDto createWidget(String profileId, UpsertWidgetRequest request) {
    ProfileEntity profile =
        profileRepository
            .findById(profileId)
            .orElseThrow(() -> new ProfileNotFoundException(profileId));
    validateConfig(request.type(), request.config());

    WidgetEntity widget = new WidgetEntity();
    applyRequest(widget, request);
    widget.setProfile(profile);
    return toDto(widgetRepository.save(widget));
  }

  @Transactional
  public WidgetDto updateWidget(String profileId, long widgetId, UpsertWidgetRequest request) {
    if (!profileRepository.existsById(profileId)) {
      throw new ProfileNotFoundException(profileId);
    }
    validateConfig(request.type(), request.config());

    WidgetEntity widget =
        widgetRepository
            .findByIdAndProfile_Id(widgetId, profileId)
            .orElseThrow(() -> new WidgetNotFoundForProfileException(profileId, widgetId));
    applyRequest(widget, request);
    return toDto(widgetRepository.save(widget));
  }

  @Transactional
  public void deleteWidget(String profileId, long widgetId) {
    if (!profileRepository.existsById(profileId)) {
      throw new ProfileNotFoundException(profileId);
    }
    WidgetEntity widget =
        widgetRepository
            .findByIdAndProfile_Id(widgetId, profileId)
            .orElseThrow(() -> new WidgetNotFoundForProfileException(profileId, widgetId));
    widgetRepository.delete(widget);
  }

  private void applyRequest(WidgetEntity widget, UpsertWidgetRequest request) {
    widget.setType(request.type().trim());
    widget.setTitle(request.title().trim());
    widget.setLayout(request.layout().trim());
    widget.setConfigJson(request.config().toString());
    widget.setEnabled(request.enabled());
    widget.setSortOrder(request.order());
  }

  private static void validateConfig(String type, JsonNode config) {
    if ("embed".equals(type)) {
      JsonNode embedUrl = config.get("embedUrl");
      if (embedUrl == null || !embedUrl.isTextual() || !embedUrl.asText().startsWith("http")) {
        throw new InvalidWidgetConfigException("embed config requires a valid http embedUrl");
      }
      return;
    }

    if ("map".equals(type)) {
      JsonNode places = config.get("places");
      if (places == null || !places.isArray() || places.isEmpty()) {
        throw new InvalidWidgetConfigException("map config requires a non-empty places array");
      }
      for (JsonNode place : places) {
        if (!place.isTextual() || place.asText().isBlank()) {
          throw new InvalidWidgetConfigException("map config places entries must be non-empty strings");
        }
      }
      return;
    }

    if ("link".equals(type)) {
      JsonNode url = config.get("url");
      if (url == null || !url.isTextual() || !url.asText().startsWith("http")) {
        throw new InvalidWidgetConfigException("link config requires a valid http url");
      }
      return;
    }

    throw new InvalidWidgetConfigException("unsupported widget type: " + type);
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
