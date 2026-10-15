package com.b26.backend.board.api;

import com.b26.backend.board.domain.BoardAccessService;
import com.b26.backend.board.domain.BoardService;
import com.b26.backend.common.config.ApiAccess;
import com.b26.backend.common.config.CurrentUser;
import static com.b26.backend.common.config.ApiAccess.Policy.*;
import com.b26.backend.user.persistence.AppUserEntity;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/board")
public class BoardController {
  private final BoardService boardService;
  private final BoardAccessService boardAccess;

  public BoardController(BoardService boardService, BoardAccessService boardAccess) {
    this.boardService = boardService;
    this.boardAccess = boardAccess;
  }

  @GetMapping("/by-owner/{username}/{slug}")
  @ApiAccess(value = BOARD_READ, boardVariable = "slug")
  public BoardDto getBoardForUsername(@PathVariable String username, @PathVariable String slug) {
    return boardService.getBoardForUsername(username, slug);
  }

  @GetMapping("/{boardId}/editor")
  @ApiAccess(BOARD_OWNER_READ)
  public BoardEditDto getEditor(@PathVariable String boardId) {
    return boardService.getEditor(boardId);
  }

  @PutMapping("/{boardId}/editor")
  @ApiAccess(BOARD_WRITE)
  public BoardEditDto saveEditor(@PathVariable String boardId, @Valid @RequestBody SaveBoardEditRequest request) {
    return boardService.saveEditor(boardId, request);
  }

  @GetMapping("/{boardId}")
  @ApiAccess(BOARD_READ)
  public BoardDto getBoard(@PathVariable String boardId) {
    return boardService.getBoard(boardId);
  }

  @GetMapping
  @ApiAccess(PUBLIC)
  public BoardPageDto getBoards(
      @org.springframework.web.bind.annotation.RequestParam(defaultValue = "0") int page,
      @org.springframework.web.bind.annotation.RequestParam(defaultValue = "20") int size) {
    return boardService.getBoards(page, size);
  }

  @GetMapping("/mine")
  @ApiAccess(AUTHENTICATED)
  public List<BoardDto> getMyBoards(@CurrentUser AppUserEntity user) {
    return boardService.getBoardsForOwner(user.getId());
  }

  @PostMapping
  @ApiAccess(AUTHENTICATED)
  public BoardDto createBoard(@CurrentUser AppUserEntity user) {
    return boardService.createBoardForOwner(user);
  }

  @GetMapping("/{boardId}/permissions")
  @ApiAccess(BOARD_READ)
  public BoardPermissionsResponse getBoardPermissions(
      @PathVariable String boardId, @CurrentUser(required = false) AppUserEntity user) {
    return new BoardPermissionsResponse(boardAccess.canEditBoard(boardId, user));
  }

  @PatchMapping("/{boardId}/identity")
  @ApiAccess(BOARD_WRITE)
  public BoardDto updateBoardIdentity(
      @PathVariable String boardId, @Valid @RequestBody UpdateBoardIdentityRequest request) {
    return boardService.updateBoardIdentity(boardId, request);
  }

  @PatchMapping("/{boardId}/visibility")
  @ApiAccess(BOARD_WRITE)
  public BoardDto updateVisibility(@PathVariable String boardId,
      @Valid @RequestBody UpdateBoardVisibilityRequest request) {
    return boardService.updateVisibility(boardId, request);
  }

  @DeleteMapping("/{boardId}")
  @ApiAccess(BOARD_WRITE)
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void deleteBoard(@PathVariable String boardId) {
    boardService.deleteBoard(boardId);
  }
}
