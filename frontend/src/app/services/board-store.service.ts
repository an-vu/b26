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

  updateBoardInStore(updated: Board) {
    const current = this.boardsSubject.value;
    const next = [...current];
    const idx = next.findIndex((board) => board.id === updated.id);
    const mapped = this.toIdentity(updated);
    if (idx >= 0) {
      next[idx] = mapped;
    } else {
      next.push(mapped);
    }
    this.boardsSubject.next(next);
  }

  private toIdentity(board: Board): BoardIdentity {
    return {
      id: board.id,
      boardName: board.boardName,
      boardUrl: board.boardUrl,
    };
  }
}
