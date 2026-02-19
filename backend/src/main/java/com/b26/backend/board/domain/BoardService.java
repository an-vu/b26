package com.b26.backend.board.domain;

import com.b26.backend.board.api.BoardDto;
import com.b26.backend.board.api.UpdateCardRequest;
import com.b26.backend.board.api.UpdateBoardMetaRequest;
import com.b26.backend.board.api.UpdateBoardRequest;
import com.b26.backend.board.api.UpdateBoardIdentityRequest;
import com.b26.backend.board.api.UpdateBoardUrlRequest;
import com.b26.backend.board.persistence.CardEntity;
import com.b26.backend.board.persistence.BoardEntity;
import com.b26.backend.board.persistence.BoardRepository;
import com.b26.backend.user.persistence.AppUserEntity;
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

  public BoardService(
      BoardRepository boardRepository,
      UserPreferenceRepository userPreferenceRepository,
      WidgetService widgetService,
      ObjectMapper objectMapper) {
    this.boardRepository = boardRepository;
    this.userPreferenceRepository = userPreferenceRepository;
    this.widgetService = widgetService;
    this.objectMapper = objectMapper;
  }

  @Transactional(readOnly = true)
  public BoardDto getBoard(String boardId) {
    BoardEntity board = findBoardByUrl(boardId);
    return toDto(board);
  }

  @Transactional(readOnly = true)
  public List<BoardDto> getBoards() {
    return boardRepository.findAll().stream()
        .map(BoardService::toDto)
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
        .map(BoardService::toDto)
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
    BoardEntity board = findBoardByUrl(boardId);

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

  private static BoardDto toDto(BoardEntity board) {
    return new BoardDto(
        board.getId(), board.getBoardName(), board.getBoardUrl(), board.getName(), board.getHeadline());
  }
}
