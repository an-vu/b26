import type { ActivatedRoute, Router } from '@angular/router';

import type { BoardService } from '../../services/board.service';
import type { BoardStoreService } from '../../services/board-store.service';
import { persistBoardIdentityDraft } from './board-page.identity';

export function runPersistBoardUrlDraftAction(params: {
  boardService: BoardService;
  boardStore: BoardStoreService;
  router: Router;
  route: ActivatedRoute;
  boardIdentityPersistedUrl: string;
  boardIdentityNameDraft: string;
  boardIdentitySlugDraft: string;
  boardIdentityPersistedName: string;
  setIdentityDraft: (boardName: string, boardUrl: string) => void;
  setIdentityPersistedAndDraft: (boardName: string, boardUrl: string) => void;
}): void {
  const boardSlug = params.boardIdentityPersistedUrl;
  if (!boardSlug) {
    return;
  }

  persistBoardIdentityDraft({
    boardService: params.boardService,
    boardStore: params.boardStore,
    router: params.router,
    boardSlug,
    draftName: params.boardIdentityNameDraft,
    draftUrl: params.boardIdentitySlugDraft,
    persistedName: params.boardIdentityPersistedName,
    persistedUrl: params.boardIdentityPersistedUrl,
    currentRouteBoardId: params.route.snapshot.paramMap.get('boardId'),
    applyDraft: params.setIdentityDraft,
    applyPersisted: params.setIdentityPersistedAndDraft,
  });
}
