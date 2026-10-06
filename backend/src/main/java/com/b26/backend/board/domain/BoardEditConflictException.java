package com.b26.backend.board.domain;

public class BoardEditConflictException extends RuntimeException {
  public BoardEditConflictException() {
    super("This board changed in another tab or session. Your edits have been kept. Cancel editing and reopen the editor to load the latest version.");
  }
}
