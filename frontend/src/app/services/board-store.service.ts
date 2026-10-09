import { Injectable } from '@angular/core';
import { BehaviorSubject, Subscription } from 'rxjs';
import { BoardService } from './board.service';
import type { Board } from '../models/board';
import type { BoardIdentity } from '../models/board-identity';

@Injectable({ providedIn: 'root' })
export class BoardStoreService {
  private noticeSubject = new BehaviorSubject('');
  readonly notice$ = this.noticeSubject.asObservable();

  setNotice(message: string) {
    this.noticeSubject.next(message);
  }

  private boardsSubject = new BehaviorSubject<BoardIdentity[]>([]);
  readonly boards$ = this.boardsSubject.asObservable();
  private refreshRequest?: Subscription;

  constructor(private boardService: BoardService) {}

  refreshBoards() {
    this.refreshRequest?.unsubscribe();
    this.refreshRequest = this.boardService.getMyBoards().subscribe({
      next: (boards) => this.boardsSubject.next(boards.map((board) => this.toIdentity(board))),
      error: () => this.boardsSubject.next([]),
    });
  }

  clearBoards() {
    this.refreshRequest?.unsubscribe();
    this.setNotice('');
    this.boardsSubject.next([]);
  }

  updateBoardInStore(updated: Board) {
    this.boardsSubject.next(this.boardsSubject.value.map(board => board.id === updated.id ? this.toIdentity(updated) : board));
    this.refreshBoards();
  }

  private toIdentity(board: Board): BoardIdentity {
    return {
      id: board.id,
      boardName: board.boardName,
      boardUrl: board.boardUrl,
      ownerUsername: board.ownerUsername,
      visibility: board.visibility,
      appearance: board.appearance,
    };
  }
}
