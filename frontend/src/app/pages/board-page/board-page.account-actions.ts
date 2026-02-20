import type { Router } from '@angular/router';

import type { AuthService } from '../../services/auth.service';
import type { BoardService } from '../../services/board.service';
import type { BoardStoreService } from '../../services/board-store.service';
import type { UserStoreService } from '../../services/user-store.service';
import { getApiErrorMessage } from '../../utils/api-error.util';
import { runCreateBoardFlow, runSignOutFlow } from './board-page.account';

export function runCreateNewBoardAction(params: {
  isCreatingBoard: boolean;
  setCreateBoardError: (message: string) => void;
  setCreatingBoard: (isCreating: boolean) => void;
  boardService: BoardService;
  boardStore: BoardStoreService;
  userStore: UserStoreService;
  router: Router;
  closeAccountMenu: () => void;
}): void {
  if (params.isCreatingBoard) {
    return;
  }

  params.setCreateBoardError('');
  runCreateBoardFlow({
    boardService: params.boardService,
    boardStore: params.boardStore,
    userStore: params.userStore,
    router: params.router,
    closeAccountMenu: params.closeAccountMenu,
    onStart: () => {
      params.setCreatingBoard(true);
    },
    onFinalize: () => {
      params.setCreatingBoard(false);
    },
    onError: (error) => {
      params.setCreateBoardError(getApiErrorMessage(error, 'Unable to create board.'));
    },
  });
}

export function runSignOutAction(params: {
  isSigningOut: boolean;
  setSigningOut: (isSigningOut: boolean) => void;
  authService: AuthService;
  userStore: UserStoreService;
  boardStore: BoardStoreService;
  router: Router;
  closeAccountMenu: () => void;
}): void {
  if (params.isSigningOut) {
    return;
  }

  runSignOutFlow({
    authService: params.authService,
    userStore: params.userStore,
    boardStore: params.boardStore,
    router: params.router,
    closeAccountMenu: params.closeAccountMenu,
    onStart: () => {
      params.setSigningOut(true);
    },
    onComplete: () => {
      params.setSigningOut(false);
    },
  });
}
