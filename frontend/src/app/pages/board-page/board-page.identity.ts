import type { Router } from '@angular/router';
import type { BoardService } from '../../services/board.service';
import type { BoardStoreService } from '../../services/board-store.service';
import { prepareBoardIdentityUpdate } from './board-page.routing';

export function persistBoardIdentityDraft(options: {
  boardService: BoardService;
  boardStore: BoardStoreService;
  router: Router;
  boardSlug: string;
  draftName: string;
  draftUrl: string;
  persistedName: string;
  persistedUrl: string;
  currentRouteBoardId: string | null;
  applyDraft: (boardName: string, boardUrl: string) => void;
  applyPersisted: (boardName: string, boardUrl: string) => void;
}): void {
  const prepared = prepareBoardIdentityUpdate({
    draftName: options.draftName,
    draftUrl: options.draftUrl,
    persistedName: options.persistedName,
    persistedUrl: options.persistedUrl,
  });

  if (prepared.kind === 'reset' || prepared.kind === 'noop') {
    options.applyDraft(prepared.draftName, prepared.draftUrl);
    return;
  }

  options.boardService
    .updateBoardIdentity(options.boardSlug, {
      boardName: prepared.boardName,
      boardUrl: prepared.boardUrl,
    })
    .subscribe({
      next: (board) => {
        const nextBoardName = board.boardName || prepared.boardName;
        const nextBoardUrl = board.boardUrl;

        options.applyPersisted(nextBoardName, nextBoardUrl);
        options.boardStore.updateBoardInStore(board);

        if (options.currentRouteBoardId && options.currentRouteBoardId !== nextBoardUrl) {
          options.router.navigate(['/b', nextBoardUrl]);
        }
      },
      error: () => {
        options.applyDraft(options.persistedName, options.persistedUrl);
      },
    });
}
