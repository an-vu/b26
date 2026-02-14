package com.bento26.backend.board.domain;

import com.bento26.backend.board.api.BoardDto;
import com.bento26.backend.board.api.UpdateCardRequest;
import com.bento26.backend.board.api.UpdateBoardMetaRequest;
import com.bento26.backend.board.api.UpdateBoardRequest;
import com.bento26.backend.board.api.UpdateBoardIdentityRequest;
import com.bento26.backend.board.api.UpdateBoardUrlRequest;
import com.bento26.backend.board.persistence.CardEntity;
import com.bento26.backend.board.persistence.BoardEntity;
import com.bento26.backend.board.persistence.BoardRepository;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.orm.jpa.JpaSystemException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class BoardService {
  private final BoardRepository boardRepository;

  public BoardService(BoardRepository boardRepository) {
    this.boardRepository = boardRepository;
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
