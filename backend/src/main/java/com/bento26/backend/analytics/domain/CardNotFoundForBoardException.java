package com.bento26.backend.analytics.domain;

public class CardNotFoundForBoardException extends RuntimeException {
  public CardNotFoundForBoardException(String boardId, String cardId) {
    super("Card '" + cardId + "' does not belong to board '" + boardId + "'");
  }
}
