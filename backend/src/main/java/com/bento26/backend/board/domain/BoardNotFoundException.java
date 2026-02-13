package com.bento26.backend.board.domain;

public class BoardNotFoundException extends RuntimeException {
  public BoardNotFoundException(String boardId) {
    super("Board not found: " + boardId);
  }
}
