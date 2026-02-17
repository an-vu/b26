package com.b26.backend.insights.domain;

public class CardNotFoundForBoardException extends RuntimeException {
  public CardNotFoundForBoardException(String boardId, String cardId) {
    super("Card '" + cardId + "' does not belong to board '" + boardId + "'");
  }
}
