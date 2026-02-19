package com.b26.backend.board.api;

import com.b26.backend.auth.domain.AuthService;
import com.b26.backend.auth.domain.AuthUnauthorizedException;
import com.b26.backend.board.domain.BoardService;
import com.b26.backend.user.persistence.AppUserEntity;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/board")
public class BoardController {
  private final BoardService boardService;
  private final AuthService authService;

  public BoardController(BoardService boardService, AuthService authService) {
    this.boardService = boardService;
    this.authService = authService;
  }

  @GetMapping("/{boardId}")
  public BoardDto getBoard(@PathVariable String boardId) {
    return boardService.getBoard(boardId);
  }

  @GetMapping
  public List<BoardDto> getBoards() {
    return boardService.getBoards();
  }

  @GetMapping("/mine")
  public List<BoardDto> getMyBoards(
      @RequestHeader(name = "Authorization", required = false)
          String authorizationHeader) {
    AppUserEntity user = authService.getAuthenticatedUser(authorizationHeader);
    return boardService.getBoardsForOwner(user.getId());
  }

  @PostMapping
  public BoardDto createBoard(
      @RequestHeader(name = "Authorization", required = false) String authorizationHeader) {
    AppUserEntity user = authService.getAuthenticatedUser(authorizationHeader);
    return boardService.createBoardForOwner(user);
  }

  @GetMapping("/{boardId}/permissions")
  public BoardPermissionsResponse getBoardPermissions(
      @PathVariable String boardId,
      @RequestHeader(name = "Authorization", required = false) String authorizationHeader) {
    AppUserEntity user = null;
    try {
      user = authService.getAuthenticatedUser(authorizationHeader);
    } catch (AuthUnauthorizedException ignored) {
      user = null;
    }

    return new BoardPermissionsResponse(boardService.canEditBoard(boardId, user));
  }

  @PutMapping("/{boardId}")
  public BoardDto updateBoard(
      @PathVariable String boardId, @Valid @RequestBody UpdateBoardRequest request) {
    return boardService.updateBoard(boardId, request);
  }

  @PatchMapping("/{boardId}/meta")
  public BoardDto updateBoardMeta(
      @PathVariable String boardId, @Valid @RequestBody UpdateBoardMetaRequest request) {
    return boardService.updateBoardMeta(boardId, request);
  }

  @PatchMapping("/{boardId}/url")
  public BoardDto updateBoardUrl(
      @PathVariable String boardId, @Valid @RequestBody UpdateBoardUrlRequest request) {
    return boardService.updateBoardUrl(boardId, request);
  }

  @PatchMapping("/{boardId}/identity")
  public BoardDto updateBoardIdentity(
      @PathVariable String boardId, @Valid @RequestBody UpdateBoardIdentityRequest request) {
    return boardService.updateBoardIdentity(boardId, request);
  }
}
