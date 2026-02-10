package com.bento26.backend.analytics.domain;

public class CardNotFoundForProfileException extends RuntimeException {
  public CardNotFoundForProfileException(String profileId, String cardId) {
    super("Card '" + cardId + "' does not belong to profile '" + profileId + "'");
  }
}
