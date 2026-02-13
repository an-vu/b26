package com.bento26.backend.board.domain;

import com.bento26.backend.board.api.BoardDto;
import com.bento26.backend.board.api.UpdateCardRequest;
import com.bento26.backend.board.api.UpdateBoardMetaRequest;
import com.bento26.backend.board.api.UpdateBoardRequest;
import com.bento26.backend.board.persistence.CardEntity;
import com.bento26.backend.board.persistence.BoardEntity;
import com.bento26.backend.board.persistence.BoardRepository;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
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
    BoardEntity board =
        boardRepository
            .findById(boardId)
            .orElseThrow(() -> new BoardNotFoundException(boardId));
    return toDto(board);
  }

  @Transactional
  public BoardDto updateBoard(String boardId, UpdateBoardRequest request) {
    BoardEntity board =
        boardRepository
            .findById(boardId)
            .orElseThrow(() -> new BoardNotFoundException(boardId));

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

    return toDto(boardRepository.save(board));
  }

  @Transactional
  public BoardDto updateBoardMeta(String boardId, UpdateBoardMetaRequest request) {
    BoardEntity board =
        boardRepository
            .findById(boardId)
            .orElseThrow(() -> new BoardNotFoundException(boardId));

    board.setName(request.name());
    board.setHeadline(request.headline());
    return toDto(boardRepository.save(board));
  }

  private static void validateNoDuplicateCardIds(List<UpdateCardRequest> cards) {
    Set<String> ids = new HashSet<>();
    for (UpdateCardRequest card : cards) {
      if (!ids.add(card.id())) {
        throw new InvalidBoardUpdateException("cards contain duplicate id: " + card.id());
      }
    }
  }

  private static BoardDto toDto(BoardEntity board) {
    return new BoardDto(board.getId(), board.getName(), board.getHeadline());
  }
}
