package com.b26.backend.widget.domain;

import com.b26.backend.board.domain.BoardNotFoundException;
import com.b26.backend.board.persistence.BoardEntity;
import com.b26.backend.board.persistence.BoardRepository;
import com.b26.backend.widget.api.SyncWidgetsRequest;
import com.b26.backend.widget.api.UpsertWidgetRequest;
import com.b26.backend.widget.api.UpsertWidgetWithIdRequest;
import com.b26.backend.widget.api.WidgetDto;
import com.b26.backend.widget.persistence.WidgetEntity;
import com.b26.backend.widget.persistence.WidgetRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class WidgetService {
  private final WidgetRepository widgetRepository;
  private final BoardRepository boardRepository;
  private final ObjectMapper objectMapper;

  public WidgetService(
      WidgetRepository widgetRepository,
      BoardRepository boardRepository,
      ObjectMapper objectMapper) {
    this.widgetRepository = widgetRepository;
    this.boardRepository = boardRepository;
    this.objectMapper = objectMapper;
  }

  @Transactional(readOnly = true)
  public List<WidgetDto> getWidgetsForBoard(String boardId) {
    BoardEntity board = findBoardByUrl(boardId);
    return widgetRepository.findByBoard_IdOrderBySortOrderAsc(board.getId()).stream()
        .map(this::toDto)
        .toList();
  }

  @Transactional
  public WidgetDto createWidget(String boardId, UpsertWidgetRequest request) {
    BoardEntity board = findBoardByUrl(boardId);
    validateLayout(request.layout());
    validateConfig(request.type(), request.config());

    WidgetEntity widget = new WidgetEntity();
    applyRequest(widget, request);
    widget.setBoard(board);
    board.setUpdatedAt(OffsetDateTime.now());
    return toDto(widgetRepository.save(widget));
  }

  @Transactional
  public WidgetDto updateWidget(String boardId, long widgetId, UpsertWidgetRequest request) {
    BoardEntity board = findBoardByUrl(boardId);
    validateLayout(request.layout());
    validateConfig(request.type(), request.config());

    WidgetEntity widget =
        widgetRepository
            .findByIdAndBoard_Id(widgetId, board.getId())
            .orElseThrow(() -> new WidgetNotFoundForBoardException(boardId, widgetId));
    applyRequest(widget, request);
    board.setUpdatedAt(OffsetDateTime.now());
    return toDto(widgetRepository.save(widget));
  }

  @Transactional
  public void deleteWidget(String boardId, long widgetId) {
    BoardEntity board = findBoardByUrl(boardId);
    WidgetEntity widget =
        widgetRepository
            .findByIdAndBoard_Id(widgetId, board.getId())
            .orElseThrow(() -> new WidgetNotFoundForBoardException(boardId, widgetId));
    widgetRepository.delete(widget);
    board.setUpdatedAt(OffsetDateTime.now());
  }

  @Transactional
  public List<WidgetDto> syncWidgets(String boardId, SyncWidgetsRequest request) {
    BoardEntity board = findBoardByUrl(boardId);

    List<WidgetEntity> existing = widgetRepository.findByBoard_IdOrderBySortOrderAsc(board.getId());
    Map<Long, WidgetEntity> byId = new HashMap<>();
    for (WidgetEntity widget : existing) {
      byId.put(widget.getId(), widget);
    }

    Set<Long> keptIds = new HashSet<>();
    for (UpsertWidgetWithIdRequest item : request.widgets()) {
      validateLayout(item.layout());
      validateConfig(item.type(), item.config());

      WidgetEntity widget;
      if (item.id() != null) {
        widget = byId.get(item.id());
        if (widget == null) {
          throw new WidgetNotFoundForBoardException(boardId, item.id());
        }
      } else {
        widget = new WidgetEntity();
        widget.setBoard(board);
      }

      applyRequest(widget, item);
      WidgetEntity saved = widgetRepository.save(widget);
      keptIds.add(saved.getId());
    }

    for (WidgetEntity widget : existing) {
      if (!keptIds.contains(widget.getId())) {
        widgetRepository.delete(widget);
      }
    }

    board.setUpdatedAt(OffsetDateTime.now());
    return widgetRepository.findByBoard_IdOrderBySortOrderAsc(board.getId()).stream()
        .map(this::toDto)
        .toList();
  }

  private BoardEntity findBoardByUrl(String boardUrl) {
    return boardRepository
        .findByBoardUrl(boardUrl)
        .orElseThrow(() -> new BoardNotFoundException(boardUrl));
  }

  private void applyRequest(WidgetEntity widget, UpsertWidgetRequest request) {
    widget.setType(request.type().trim());
    widget.setTitle(request.title().trim());
    widget.setLayout(request.layout().trim());
    widget.setConfigJson(request.config().toString());
    widget.setEnabled(request.enabled());
    widget.setSortOrder(request.order());
  }

  private void applyRequest(WidgetEntity widget, UpsertWidgetWithIdRequest request) {
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
      if (embedUrl == null || embedUrl.isNull() || (embedUrl.isTextual() && embedUrl.asText().isBlank())) {
        return;
      }
      if (!embedUrl.isTextual() || !embedUrl.asText().startsWith("http")) {
        throw new InvalidWidgetConfigException("embed config requires a valid http embedUrl");
      }
      return;
    }

    if ("map".equals(type)) {
      JsonNode places = config.get("places");
      if (places == null || places.isNull()) {
        return;
      }
      if (!places.isArray()) {
        throw new InvalidWidgetConfigException("map config places must be an array");
      }
      for (JsonNode place : places) {
        if (!place.isTextual()) {
          throw new InvalidWidgetConfigException("map config places entries must be strings");
        }
      }
      return;
    }

    if ("link".equals(type)) {
      JsonNode url = config.get("url");
      if (url == null || url.isNull() || (url.isTextual() && url.asText().isBlank())) {
        return;
      }
      if (!url.isTextual() || !url.asText().startsWith("http")) {
        throw new InvalidWidgetConfigException("link config requires a valid http url");
      }
      return;
    }

    if ("user-settings".equals(type) || "admin-settings".equals(type) || "signin".equals(type)) {
      if (!config.isObject()) {
        throw new InvalidWidgetConfigException(type + " config must be a JSON object");
      }
      return;
    }

    throw new InvalidWidgetConfigException("unsupported widget type: " + type);
  }

  private static void validateLayout(String layout) {
    if (!"span-1".equals(layout)
        && !"span-2".equals(layout)
        && !"span-3".equals(layout)
        && !"span-1x2".equals(layout)
        && !"span-2x2".equals(layout)
        && !"span-3x3".equals(layout)
        && !"span-4".equals(layout)) {
      throw new InvalidWidgetConfigException("unsupported widget layout: " + layout);
    }
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
