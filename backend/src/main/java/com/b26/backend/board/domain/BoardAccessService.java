package com.b26.backend.board.domain;

import com.b26.backend.auth.domain.AuthService;
import com.b26.backend.auth.domain.AuthUnauthorizedException;
import com.b26.backend.board.persistence.BoardRepository;
import org.springframework.stereotype.Service;

/** Shared read policy for boards, their widgets, editors, analytics and tracking. */
@Service
public class BoardAccessService {
  private final BoardRepository boards;
  private final AuthService auth;

  public BoardAccessService(BoardRepository boards, AuthService auth) {
    this.boards = boards;
    this.auth = auth;
  }

  public void requireRead(String key, boolean byId, boolean ownerOnly, String authorization) {
    var board = (byId ? boards.findById(key) : boards.findByBoardUrl(key))
        .orElseThrow(() -> new BoardNotFoundException(key));
    try {
      var user = auth.getAuthenticatedUser(authorization);
      if (user.getId().equals(board.getOwnerUserId()) || "ADMIN".equalsIgnoreCase(user.getRole())) return;
    } catch (AuthUnauthorizedException ignored) { }
    if (!ownerOnly && "public".equals(board.getVisibility())) return;
    // Do not reveal whether a private board exists.
    throw new BoardNotFoundException(key);
  }
}
