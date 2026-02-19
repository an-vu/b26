import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { BoardService } from './board.service';
import type { Board } from '../models/board';
import type { BoardIdentity } from '../models/board-identity';

@Injectable({ providedIn: 'root' })
export class BoardStoreService {
  private boardsSubject = new BehaviorSubject<BoardIdentity[]>([]);
  readonly boards$ = this.boardsSubject.asObservable();

  constructor(private boardService: BoardService) {}

  refreshBoards() {
    this.boardService.getMyBoards().subscribe({
      next: (boards) => this.boardsSubject.next(boards.map((board) => this.toIdentity(board))),
      error: () => this.boardsSubject.next([]),
    });
  }

  clearBoards() {
    this.boardsSubject.next([]);
  }

  updateBoardInStore(_updated: Board) {
    this.refreshBoards();
  }

  private toIdentity(board: Board): BoardIdentity {
    return {
      id: board.id,
      boardName: board.boardName,
      boardUrl: board.boardUrl,
    };
  }
}
