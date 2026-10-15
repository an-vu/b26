import { inject, Injectable, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { BoardService } from './board.service';
import type { Board } from '../models/board';
import type { BoardIdentity } from '../models/board-identity';

/** The signed-in account's board list, loaded by SiteThemeService whenever the account changes. */
@Injectable({ providedIn: 'root' })
export class BoardStoreService {
  private readonly boardService = inject(BoardService);
  private readonly noticeState = signal('');
  private readonly boardsState = signal<BoardIdentity[]>([]);
  private refreshRequest?: Subscription;

  readonly notice = this.noticeState.asReadonly();
  readonly boards = this.boardsState.asReadonly();

  setNotice(message: string) {
    this.noticeState.set(message);
  }

  refreshBoards() {
    this.refreshRequest?.unsubscribe();
    this.refreshRequest = this.boardService.getMyBoards().subscribe({
      next: (boards) => this.boardsState.set(boards.map(toIdentity)),
      error: () => this.boardsState.set([]),
    });
  }

  clearBoards() {
    this.refreshRequest?.unsubscribe();
    this.setNotice('');
    this.boardsState.set([]);
  }

  /** Apply a saved board locally; the response is authoritative, so no refetch is needed. */
  updateBoardInStore(updated: Board) {
    this.boardsState.update((boards) =>
      boards.map((board) => (board.id === updated.id ? toIdentity(updated) : board)),
    );
  }
}

function toIdentity(board: Board): BoardIdentity {
  return {
    id: board.id,
    boardName: board.boardName,
    boardUrl: board.boardUrl,
    ownerUsername: board.ownerUsername,
    visibility: board.visibility,
    appearance: board.appearance,
  };
}
