package com.b26.backend.board.domain;

import com.b26.backend.auth.domain.AuthService;
import com.b26.backend.auth.domain.AuthUnauthorizedException;
import com.b26.backend.auth.domain.AuthForbiddenException;
import com.b26.backend.board.persistence.BoardEntity;
import com.b26.backend.board.persistence.BoardRepository;
import com.b26.backend.user.persistence.AppUserEntity;
import org.springframework.stereotype.Service;

/** Shared visibility and owner/admin policy for boards, widgets, editors and analytics. */
@Service
public class BoardAccessService {
  private final BoardRepository boards;
  private final AuthService auth;

  public BoardAccessService(BoardRepository boards, AuthService auth) {
    this.boards = boards;
    this.auth = auth;
  }

  public void requireRead(String key, boolean byId, boolean ownerOnly, String authorization) {
    BoardEntity board = findBoard(key, byId);
    if (canManage(board, optionalUser(authorization))) return;
    if (!ownerOnly && "public".equals(board.getVisibility())) return;
    // Do not reveal whether a private board exists.
    throw new BoardNotFoundException(key);
  }

  public void requireWrite(String key, boolean byId, String authorization) {
    AppUserEntity user = auth.getAuthenticatedUser(authorization);
    if (!canManage(findBoard(key, byId), user)) throw new AuthForbiddenException();
  }

  public boolean canEditBoard(String slug, String authorization) {
    return canManage(findBoard(slug, false), optionalUser(authorization));
  }

  private BoardEntity findBoard(String key, boolean byId) {
    return (byId ? boards.findById(key) : boards.findByBoardUrl(key))
        .orElseThrow(() -> new BoardNotFoundException(key));
  }

  private AppUserEntity optionalUser(String authorization) {
    try {
      return auth.getAuthenticatedUser(authorization);
    } catch (AuthUnauthorizedException ignored) {
      return null;
    }
  }

  private static boolean canManage(BoardEntity board, AppUserEntity user) {
    return user != null && (user.getId().equals(board.getOwnerUserId())
        || user.getRole() != null && "ADMIN".equalsIgnoreCase(user.getRole().trim()));
  }
}
