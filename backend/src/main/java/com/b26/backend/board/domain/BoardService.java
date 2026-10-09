package com.b26.backend.board.domain;

import com.b26.backend.board.api.BoardDto;
import com.b26.backend.board.api.BoardEditDto;
import com.b26.backend.board.api.SaveBoardEditRequest;
import com.b26.backend.widget.api.SyncWidgetsRequest;
import com.b26.backend.board.api.UpdateBoardMetaRequest;
import com.b26.backend.board.api.UpdateBoardIdentityRequest;
import com.b26.backend.board.api.UpdateBoardUrlRequest;
import com.b26.backend.board.persistence.BoardEntity;
import com.b26.backend.board.persistence.BoardRepository;
import com.b26.backend.user.persistence.AppUserEntity;
import com.b26.backend.user.persistence.AppUserRepository;
import com.b26.backend.user.persistence.UserPreferenceRepository;
import com.b26.backend.widget.api.UpsertWidgetRequest;
import com.b26.backend.widget.domain.WidgetService;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.orm.jpa.JpaSystemException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class BoardService {
  private final BoardRepository boardRepository;
  private final UserPreferenceRepository userPreferenceRepository;
  private final WidgetService widgetService;
  private final ObjectMapper objectMapper;
  private final AppUserRepository appUserRepository;

  public BoardService(
      BoardRepository boardRepository,
      UserPreferenceRepository userPreferenceRepository,
      WidgetService widgetService,
      ObjectMapper objectMapper,
      AppUserRepository appUserRepository) {
    this.boardRepository = boardRepository;
    this.userPreferenceRepository = userPreferenceRepository;
    this.widgetService = widgetService;
    this.objectMapper = objectMapper;
    this.appUserRepository = appUserRepository;
  }

  @Transactional
  public BoardEditDto getEditor(String slug) {
    BoardEntity board = boardRepository.findForEditing(slug)
        .orElseThrow(() -> new BoardNotFoundException(slug));
    return new BoardEditDto(toDto(board), widgetService.getWidgetsForBoard(slug));
  }

  @Transactional
  public BoardEditDto saveEditor(String slug, SaveBoardEditRequest request) {
    BoardEntity board = boardRepository.findForEditing(slug)
        .orElseThrow(() -> new BoardNotFoundException(slug));
    if (!request.version().equals(board.getVersion())) {
      throw new BoardEditConflictException();
    }
    var widgets = widgetService.syncWidgets(slug, new SyncWidgetsRequest(request.widgets()));
    board.setName(request.name().trim());
    board.setHeadline(request.headline().trim());
    if (request.website() != null) board.setWebsite(request.website().trim());
    if (request.ownerDisplayName() != null) {
      var owner = appUserRepository.findById(board.getOwnerUserId()).orElseThrow();
      owner.setDisplayName(request.ownerDisplayName().trim());
      appUserRepository.saveAndFlush(owner);
    }
    board.setUpdatedAt(OffsetDateTime.now());
    boardRepository.flush();
    return new BoardEditDto(toDto(board), widgets);
  }

  @Transactional(readOnly = true)
  public BoardDto getBoard(String boardId) {
    BoardEntity board = findBoardByUrl(boardId);
    return toDto(board);
  }

  @Transactional(readOnly = true)
  public BoardDto getBoardForUsername(String username, String slug) {
    var owner = appUserRepository.findByUsername(username.toLowerCase(java.util.Locale.ROOT))
        .orElseThrow(() -> new BoardNotFoundException(username + "/" + slug));
    BoardEntity board = findBoardByUrl(slug);
    if (!owner.getId().equals(board.getOwnerUserId())) {
      throw new BoardNotFoundException(username + "/" + slug);
    }
    return toDto(board);
  }

  @Transactional(readOnly = true)
  public com.b26.backend.board.api.BoardPageDto getBoards(int page, int size) {
    if (page < 0 || size < 1 || size > 100) {
      throw new org.springframework.web.server.ResponseStatusException(
          org.springframework.http.HttpStatus.BAD_REQUEST, "Use page >= 0 and size between 1 and 100");
    }
    var result = boardRepository.findPublicBoards(org.springframework.data.domain.PageRequest.of(page, size));
    return new com.b26.backend.board.api.BoardPageDto(
        result.getContent().stream().map(row -> toDto(row.getBoard(), row.getOwner())).toList(),
        page, size, result.getTotalElements(), result.getTotalPages());
  }

  @Transactional(readOnly = true)
  public List<BoardDto> getBoardsForOwner(String ownerUserId) {
    String mainBoardId =
        userPreferenceRepository
            .findById(ownerUserId)
            .map(preference -> preference.getMainBoardId() == null ? "" : preference.getMainBoardId().trim())
            .orElse("");

    return boardRepository.findByOwnerUserIdOrderByUpdatedAtDescBoardNameAsc(ownerUserId).stream()
        .sorted((left, right) -> {
          boolean leftPinned = !mainBoardId.isEmpty() && mainBoardId.equals(left.getId());
          boolean rightPinned = !mainBoardId.isEmpty() && mainBoardId.equals(right.getId());
          if (leftPinned == rightPinned) {
            return 0;
          }
          return leftPinned ? -1 : 1;
        })
        .map(this::toDto)
        .toList();
  }

  @Transactional(readOnly = true)
  public boolean canEditBoard(String boardId, AppUserEntity user) {
    if (user == null) {
      return false;
    }

    BoardEntity board = findBoardByUrl(boardId);
    return isAdmin(user) || user.getId().equals(board.getOwnerUserId());
  }

  @Transactional
  public BoardDto createBoardForOwner(AppUserEntity user) {
    int nextNumber = boardRepository.findByOwnerUserIdOrderByUpdatedAtDescBoardNameAsc(user.getId()).size() + 1;
    String boardName;
    String boardUrl;

    while (true) {
      boardName = "Board #" + nextNumber;
      boardUrl = "board-" + nextNumber;
      if (!boardRepository.existsByBoardUrl(boardUrl)) {
        break;
      }
      nextNumber++;
    }

    BoardEntity board = new BoardEntity();
    board.setId(UUID.randomUUID().toString());
    board.setOwnerUserId(user.getId());
    board.setVisibility("private");
    board.setBoardName(boardName);
    board.setBoardUrl(boardUrl);
    board.setName("Title");
    board.setHeadline("Description");
    board.setUpdatedAt(OffsetDateTime.now());

    BoardEntity saved = boardRepository.saveAndFlush(board);

    var config = objectMapper.createObjectNode();
    config.put("embedUrl", "https://blueberry2026.vercel.app");
    widgetService.createWidget(
        saved.getBoardUrl(),
        new UpsertWidgetRequest("embed", "New Widget", "span-2", config, true, 0));

    boardRepository.flush();
    return toDto(saved);
  }

  @Transactional
  public BoardDto createStarterBoardForOwner(AppUserEntity user) {
    BoardEntity board = new BoardEntity();
    String id = UUID.randomUUID().toString();
    board.setId(id);
    board.setOwnerUserId(user.getId());
    board.setVisibility("private");
    board.setBoardName("My Board");
    board.setBoardUrl("board-" + id);
    board.setName(user.getDisplayName());
    board.setHeadline("Welcome to my board");
    board.setUpdatedAt(OffsetDateTime.now());
    return toDto(boardRepository.saveAndFlush(board));
  }

  @Transactional
  public BoardDto updateBoardMeta(String boardId, UpdateBoardMetaRequest request) {
    BoardEntity board = findBoardByUrl(boardId);

    board.setName(request.name());
    board.setHeadline(request.headline());
    return persist(board);
  }

  @Transactional
  public BoardDto updateBoardUrl(String boardId, UpdateBoardUrlRequest request) {
    BoardEntity board = findBoardByUrl(boardId);

    String normalized = normalizeBoardUrl(request.boardUrl());
    if (boardRepository.existsByBoardUrlAndIdNot(normalized, board.getId())) {
      throw new InvalidBoardUpdateException("board_url is already used: " + normalized);
    }

    board.setBoardUrl(normalized);
    return persist(board);
  }

  @Transactional
  public BoardDto updateBoardIdentity(String boardId, UpdateBoardIdentityRequest request) {
    BoardEntity board = boardRepository.findForEditing(boardId)
        .orElseThrow(() -> new BoardNotFoundException(boardId));
    if (request.version() != null && !request.version().equals(board.getVersion())) {
      throw new BoardEditConflictException();
    }

    if (request.appearance() != null && request.version() == null) {
      throw new InvalidBoardUpdateException("version is required when saving appearance");
    }
    String normalizedBoardName = request.boardName().trim();
    if (normalizedBoardName.isEmpty()) {
      throw new InvalidBoardUpdateException("board_name is required");
    }

    String normalizedUrl = normalizeBoardUrl(request.boardUrl());
    if (boardRepository.existsByBoardUrlAndIdNot(normalizedUrl, board.getId())) {
      throw new InvalidBoardUpdateException("board_url is already used: " + normalizedUrl);
    }

    board.setBoardName(normalizedBoardName);
    board.setBoardUrl(normalizedUrl);
    if (request.appearance() != null) {
      var appearance = request.appearance();
      board.setTheme(appearance.theme());
      // Older clients omit this field; preserve their board's selected family.
      if (appearance.themeFamily() != null) board.setThemeFamily(appearance.themeFamily());
      board.setRadiusStep(appearance.radiusStep());
      if (appearance.spacingStep() != null) board.setSpacingStep(appearance.spacingStep());
      board.setBackgroundColor(appearance.backgroundColor().toLowerCase(java.util.Locale.ROOT));
      board.setPattern(appearance.pattern());
      if (appearance.patternIntensity() != null) board.setPatternIntensity(appearance.patternIntensity());
    }
    return persist(board);
  }

  @Transactional
  public void deleteBoard(String boardId) {
    BoardEntity candidate = findBoardByUrl(boardId);
    appUserRepository.lockById(candidate.getOwnerUserId())
        .orElseThrow(() -> new BoardNotFoundException(boardId));
    BoardEntity board = boardRepository.findForEditing(boardId)
        .orElseThrow(() -> new BoardNotFoundException(boardId));
    if (boardRepository.countByOwnerUserId(board.getOwnerUserId()) <= 1) {
      throw new InvalidBoardUpdateException(
          "Cannot delete the owner's only board. Create another board first.");
    }
    if (userPreferenceRepository.existsByMainBoardId(board.getId())) {
      throw new InvalidBoardUpdateException(
          "Cannot delete the main board. Remove or replace the main board before deleting it.");
    }
    boardRepository.delete(board);
    boardRepository.flush();
  }

  @Transactional
  public BoardDto updateVisibility(String slug, com.b26.backend.board.api.UpdateBoardVisibilityRequest request) {
    BoardEntity candidate = findBoardByUrl(slug);
    appUserRepository.lockById(candidate.getOwnerUserId()).orElseThrow();
    BoardEntity board = boardRepository.findForEditing(slug).orElseThrow(() -> new BoardNotFoundException(slug));
    if (!request.version().equals(board.getVersion())) throw new BoardEditConflictException();
    if ("private".equals(request.visibility()) && userPreferenceRepository.existsByMainBoardId(board.getId())) {
      throw new InvalidBoardUpdateException("Remove or replace this main board before making it private.");
    }
    board.setVisibility(request.visibility());
    return persist(board);
  }

  private BoardDto persist(BoardEntity board) {
    board.setUpdatedAt(OffsetDateTime.now());
    try {
      return toDto(boardRepository.saveAndFlush(board));
    } catch (DataIntegrityViolationException exception) {
      throw new InvalidBoardUpdateException("board update conflicts with existing data");
    } catch (ObjectOptimisticLockingFailureException exception) {
      throw new InvalidBoardUpdateException("board update conflict detected, please retry");
    } catch (JpaSystemException exception) {
      throw new InvalidBoardUpdateException("board update failed due to persistence state");
    }
  }

  private static boolean isAdmin(AppUserEntity user) {
    return user.getRole() != null && "ADMIN".equalsIgnoreCase(user.getRole().trim());
  }

  private static String normalizeBoardUrl(String rawBoardUrl) {
    String normalized = rawBoardUrl.trim().toLowerCase(java.util.Locale.ROOT);
    if (!normalized.matches("^[a-z0-9]+(?:-[a-z0-9]+)*$")) {
      throw new InvalidBoardUpdateException(
          "board_url must use lowercase letters, numbers, and single hyphens");
    }
    return normalized;
  }

  private BoardEntity findBoardByUrl(String boardUrl) {
    return boardRepository
        .findByBoardUrl(boardUrl)
        .orElseThrow(() -> new BoardNotFoundException(boardUrl));
  }

  private BoardDto toDto(BoardEntity board) {
    return toDto(board, appUserRepository.findById(board.getOwnerUserId()).orElseThrow());
  }

  private BoardDto toDto(BoardEntity board, AppUserEntity owner) {
    return new BoardDto(
        board.getId(), board.getBoardName(), board.getBoardUrl(), board.getName(), board.getHeadline(), board.getVersion(),
        owner.getUsername(),
        new com.b26.backend.board.api.BoardAppearance(board.getTheme(), board.getRadiusStep(),
            board.getBackgroundColor(), board.getPattern(), board.getThemeFamily(), board.getPatternIntensity(), board.getSpacingStep()), owner.getDisplayName(), board.getWebsite(), board.getVisibility());
  }
}
