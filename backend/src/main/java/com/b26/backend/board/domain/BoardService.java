package com.b26.backend.board.domain;

import com.b26.backend.board.api.BoardDto;
import com.b26.backend.board.api.BoardEditDto;
import com.b26.backend.board.api.SaveBoardEditRequest;
import com.b26.backend.widget.api.SyncWidgetsRequest;
import com.b26.backend.board.api.UpdateCardRequest;
import com.b26.backend.board.api.UpdateBoardMetaRequest;
import com.b26.backend.board.api.UpdateBoardRequest;
import com.b26.backend.board.api.UpdateBoardIdentityRequest;
import com.b26.backend.board.api.UpdateBoardUrlRequest;
import com.b26.backend.board.persistence.CardEntity;
import com.b26.backend.board.persistence.BoardEntity;
import com.b26.backend.board.persistence.BoardRepository;
import com.b26.backend.user.persistence.AppUserEntity;
import com.b26.backend.user.persistence.AppUserRepository;
import com.b26.backend.system.persistence.SystemSettingsRepository;
import com.b26.backend.user.persistence.UserPreferenceRepository;
import com.b26.backend.widget.api.UpsertWidgetRequest;
import com.b26.backend.widget.domain.WidgetService;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.OffsetDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
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
  private final SystemSettingsRepository systemSettingsRepository;

  public BoardService(
      BoardRepository boardRepository,
      UserPreferenceRepository userPreferenceRepository,
      WidgetService widgetService,
      ObjectMapper objectMapper,
      AppUserRepository appUserRepository,
      SystemSettingsRepository systemSettingsRepository) {
    this.boardRepository = boardRepository;
    this.userPreferenceRepository = userPreferenceRepository;
    this.widgetService = widgetService;
    this.objectMapper = objectMapper;
    this.appUserRepository = appUserRepository;
    this.systemSettingsRepository = systemSettingsRepository;
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
  public List<BoardDto> getBoards() {
    return boardRepository.findAll().stream()
        .map(this::toDto)
        .sorted((a, b) -> a.boardName().compareToIgnoreCase(b.boardName()))
        .toList();
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

    return toDto(saved);
  }

  @Transactional
  public BoardDto createStarterBoardForOwner(AppUserEntity user) {
    BoardEntity board = new BoardEntity();
    String id = UUID.randomUUID().toString();
    board.setId(id);
    board.setOwnerUserId(user.getId());
    board.setBoardName("My Board");
    board.setBoardUrl("board-" + id);
    board.setName(user.getDisplayName());
    board.setHeadline("Welcome to my board");
    board.setUpdatedAt(OffsetDateTime.now());
    return toDto(boardRepository.saveAndFlush(board));
  }

  @Transactional
  public BoardDto updateBoard(String boardId, UpdateBoardRequest request) {
    BoardEntity board = findBoardByUrl(boardId);

    validateNoDuplicateCardIds(request.cards());

    board.setName(request.name());
    board.setHeadline(request.headline());
    board.getCards().clear();
    for (UpdateCardRequest requestCard : request.cards()) {
      CardEntity card = new CardEntity();
      card.setId(requestCard.id());
      card.setLabel(requestCard.label());
      card.setHref(requestCard.href());
      card.setBoard(board);
      board.getCards().add(card);
    }

    return persist(board);
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
      board.setBackgroundColor(appearance.backgroundColor().toLowerCase(java.util.Locale.ROOT));
      board.setPattern(appearance.pattern());
    }
    return persist(board);
  }

  @Transactional
  public void deleteBoard(String boardId) {
    // Always lock system settings before the owner; route and preference updates
    // use these same locks before choosing a board.
    var settings = systemSettingsRepository.lockSettings();
    BoardEntity candidate = findBoardByUrl(boardId);
    appUserRepository.lockById(candidate.getOwnerUserId())
        .orElseThrow(() -> new BoardNotFoundException(boardId));
    BoardEntity board = boardRepository.findForEditing(boardId)
        .orElseThrow(() -> new BoardNotFoundException(boardId));
    if (settings.filter(value ->
        board.getId().equals(value.getGlobalHomepageBoardId())
            || board.getId().equals(value.getGlobalInsightsBoardId())
            || board.getId().equals(value.getGlobalSettingsBoardId())
            || board.getId().equals(value.getGlobalSigninBoardId())).isPresent()) {
      throw new InvalidBoardUpdateException(
          "This board is used by a system route. Choose a replacement in Admin Settings before deleting it.");
    }
    if (boardRepository.countByOwnerUserId(board.getOwnerUserId()) <= 1) {
      throw new InvalidBoardUpdateException(
          "Cannot delete the owner's only board. Create another board first.");
    }
    if (userPreferenceRepository.existsByMainBoardId(board.getId())) {
      throw new InvalidBoardUpdateException(
          "Cannot delete the main board. Choose another main board before deleting it.");
    }
    boardRepository.delete(board);
    boardRepository.flush();
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

  private static void validateNoDuplicateCardIds(List<UpdateCardRequest> cards) {
    Set<String> ids = new HashSet<>();
    for (UpdateCardRequest card : cards) {
      if (!ids.add(card.id())) {
        throw new InvalidBoardUpdateException("cards contain duplicate id: " + card.id());
      }
    }
  }

  private static boolean isAdmin(AppUserEntity user) {
    return user.getRole() != null && "ADMIN".equalsIgnoreCase(user.getRole().trim());
  }

  private static String normalizeBoardUrl(String rawBoardUrl) {
    String normalized = rawBoardUrl.trim().toLowerCase();
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
    return new BoardDto(
        board.getId(), board.getBoardName(), board.getBoardUrl(), board.getName(), board.getHeadline(), board.getVersion(),
        appUserRepository.findById(board.getOwnerUserId()).orElseThrow().getUsername(),
        new com.b26.backend.board.api.BoardAppearance(board.getTheme(), board.getRadiusStep(),
            board.getBackgroundColor(), board.getPattern(), board.getThemeFamily()));
  }
}
