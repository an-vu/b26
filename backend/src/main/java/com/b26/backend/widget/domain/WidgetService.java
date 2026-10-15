package com.b26.backend.widget.domain;

import com.b26.backend.board.persistence.BoardEntity;
import com.b26.backend.board.persistence.BoardRepository;
import com.b26.backend.common.api.BadRequestException;
import com.b26.backend.common.api.NotFoundException;
import com.b26.backend.widget.api.UpsertWidgetWithIdRequest;
import com.b26.backend.widget.api.WidgetDto;
import com.b26.backend.widget.persistence.WidgetEntity;
import com.b26.backend.widget.persistence.WidgetRepository;
import com.fasterxml.jackson.databind.JsonNode;
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

  public WidgetService(WidgetRepository widgetRepository, BoardRepository boardRepository) {
    this.widgetRepository = widgetRepository;
    this.boardRepository = boardRepository;
  }

  @Transactional(readOnly = true)
  public List<WidgetDto> getWidgetsForBoard(String boardId) {
    BoardEntity board = findBoardByUrl(boardId);
    return widgetRepository.findByBoard_IdOrderBySortOrderAsc(board.getId()).stream()
        .map(WidgetService::toDto)
        .toList();
  }

  @Transactional(readOnly = true)
  public WidgetDto getWidgetByBoardId(String boardId, long widgetId) {
    return toDto(widgetRepository.findByIdAndBoard_Id(widgetId, boardId)
        .orElseThrow(() -> NotFoundException.widget(boardId, widgetId)));
  }

  /** Replaces the board's widgets with the given list; an invalid item rolls back the whole save. */
  @Transactional
  public List<WidgetDto> syncWidgets(BoardEntity board, List<UpsertWidgetWithIdRequest> items) {
    List<WidgetEntity> existing = widgetRepository.findByBoard_IdOrderBySortOrderAsc(board.getId());
    Map<Long, WidgetEntity> byId = new HashMap<>();
    for (WidgetEntity widget : existing) {
      byId.put(widget.getId(), widget);
    }

    Set<Long> keptIds = new HashSet<>();
    for (UpsertWidgetWithIdRequest item : items) {
      validateLayout(item.layout());
      validateConfig(item.type(), item.config());

      WidgetEntity widget;
      if (item.id() != null) {
        if (!keptIds.add(item.id())) {
          throw invalid("widgets contain duplicate ids");
        }
        widget = byId.get(item.id());
        if (widget == null) {
          throw NotFoundException.widget(board.getBoardUrl(), item.id());
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
        .map(WidgetService::toDto)
        .toList();
  }

  private BoardEntity findBoardByUrl(String boardUrl) {
    return boardRepository
        .findByBoardUrl(boardUrl)
        .orElseThrow(() -> NotFoundException.board(boardUrl));
  }

  private static void applyRequest(WidgetEntity widget, UpsertWidgetWithIdRequest request) {
    widget.setType(request.type().trim());
    widget.setTitle(request.title().trim());
    widget.setLayout(request.layout().trim());
    widget.setConfig(request.config().deepCopy());
    widget.setEnabled(request.enabled());
    widget.setSortOrder(request.order());
  }

  private static void validateConfig(String type, JsonNode config) {
    if (!config.isObject() || config.toString().length() > 4000) {
      throw invalid("Widget configuration must be an object of at most 4000 characters");
    }
    if ("embed".equals(type) || "link".equals(type)) {
      String field = "embed".equals(type) ? "embedUrl" : "url";
      JsonNode url = config.get(field);
      if (url == null || url.isNull() || (url.isTextual() && url.asText().isBlank())) {
        return;
      }
      if (!url.isTextual() || !isHttpUrl(url.asText())) {
        throw invalid(type + " config requires a valid http " + field);
      }
      return;
    }

    if ("map".equals(type)) {
      JsonNode places = config.get("places");
      if (places == null || places.isNull()) {
        return;
      }
      if (!places.isArray()) {
        throw invalid("map config places must be an array");
      }
      for (JsonNode place : places) {
        if (!place.isTextual()) {
          throw invalid("map config places entries must be strings");
        }
      }
      return;
    }

    if ("user-settings".equals(type)
        || "admin-settings".equals(type)
        || "signin".equals(type)
        || "signup".equals(type)) {
      return;
    }

    throw invalid("unsupported widget type: " + type);
  }

  private static boolean isHttpUrl(String value) {
    try {
      var uri = java.net.URI.create(value);
      return ("http".equalsIgnoreCase(uri.getScheme()) || "https".equalsIgnoreCase(uri.getScheme()))
          && uri.getHost() != null && !uri.getHost().isBlank();
    } catch (IllegalArgumentException exception) {
      return false;
    }
  }

  private static void validateLayout(String layout) {
    if (!"span-1".equals(layout)
        && !"span-2".equals(layout)
        && !"span-3".equals(layout)
        && !"span-1x2".equals(layout)
        && !"span-2x2".equals(layout)
        && !"span-3x3".equals(layout)
        && !"span-4".equals(layout)) {
      throw invalid("unsupported widget layout: " + layout);
    }
  }

  private static BadRequestException invalid(String message) {
    return new BadRequestException("widget", message);
  }

  private static WidgetDto toDto(WidgetEntity widget) {
    return new WidgetDto(
        widget.getId(),
        widget.getType(),
        widget.getTitle(),
        widget.getLayout(),
        widget.getConfig(),
        widget.isEnabled(),
        widget.getSortOrder());
  }
}
