package com.b26.backend.board.domain;

import com.b26.backend.board.persistence.BoardEntity;
import com.b26.backend.board.persistence.BoardRepository;
import com.b26.backend.common.api.AuthException;
import com.b26.backend.common.api.NotFoundException;
import com.b26.backend.user.persistence.AppUserEntity;
import org.springframework.stereotype.Service;

/** Shared visibility and owner/admin policy for boards, widgets, editors and analytics. */
@Service
public class BoardAccessService {
  private final BoardRepository boards;

  public BoardAccessService(BoardRepository boards) {
    this.boards = boards;
  }

  /** @param user the signed-in reader, or null for an anonymous visitor */
  public void requireRead(String key, boolean byId, boolean ownerOnly, AppUserEntity user) {
    BoardEntity board = findBoard(key, byId);
    if (canManage(board, user)) return;
    if (!ownerOnly && "public".equals(board.getVisibility())) return;
    // Do not reveal whether a private board exists.
    throw NotFoundException.board(key);
  }

  public void requireWrite(String key, boolean byId, AppUserEntity user) {
    if (!canManage(findBoard(key, byId), user)) throw AuthException.forbidden();
  }

  public boolean canEditBoard(String slug, AppUserEntity user) {
    return canManage(findBoard(slug, false), user);
  }

  private BoardEntity findBoard(String key, boolean byId) {
    return (byId ? boards.findById(key) : boards.findByBoardUrl(key))
        .orElseThrow(() -> NotFoundException.board(key));
  }

  private static boolean canManage(BoardEntity board, AppUserEntity user) {
    return user != null && (user.getId().equals(board.getOwnerUserId())
        || user.getRole() != null && "ADMIN".equalsIgnoreCase(user.getRole().trim()));
  }
}
