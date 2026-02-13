package com.bento26.backend.board.api;

import com.bento26.backend.board.domain.BoardService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/board")
public class BoardController {
  private final BoardService boardService;

  public BoardController(BoardService boardService) {
    this.boardService = boardService;
  }

  @GetMapping("/{boardId}")
  public BoardDto getBoard(@PathVariable String boardId) {
    return boardService.getBoard(boardId);
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
}
