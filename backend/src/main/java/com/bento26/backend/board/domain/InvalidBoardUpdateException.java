package com.bento26.backend.board.domain;

public class InvalidBoardUpdateException extends RuntimeException {
  public InvalidBoardUpdateException(String message) {
    super(message);
  }
}
