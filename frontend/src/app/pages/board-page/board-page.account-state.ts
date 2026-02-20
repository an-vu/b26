import type { ActivatedRoute, Router } from '@angular/router';
import type { ChangeDetectorRef, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import type { BoardStoreService } from '../../services/board-store.service';
import type { UserStoreService } from '../../services/user-store.service';
import {
  mapAccountBoards,
  mapAccountUser,
  type AccountMenuBoard,
  type AccountMenuUser,
} from './board-page.account';

export function initializeBoardPageAccountState(params: {
  destroyRef: DestroyRef;
  boardStore: BoardStoreService;
  userStore: UserStoreService;
  route: ActivatedRoute;
  router: Router;
  cdr: ChangeDetectorRef;
  setAccountBoards: (boards: AccountMenuBoard[]) => void;
  setSignedIn: (isSignedIn: boolean) => void;
  setAccountUser: (user: AccountMenuUser) => void;
  setAccountMainBoardId: (mainBoardId: string) => void;
  setReadOnlyView: (isReadOnly: boolean) => void;
}): void {
  params.boardStore.boards$
    .pipe(takeUntilDestroyed(params.destroyRef))
    .subscribe((boards) => {
      params.setAccountBoards(mapAccountBoards(boards));
    });

  params.userStore.profile$
    .pipe(takeUntilDestroyed(params.destroyRef))
    .subscribe((profile) => {
      const accountState = mapAccountUser(profile);
      params.setSignedIn(accountState.isSignedIn);
      params.setAccountUser(accountState.user);

      if (accountState.resetMainBoardId) {
        params.setAccountMainBoardId('');
        return;
      }

      const currentUsernameParam = params.route.snapshot.paramMap.get('username');
      const isUserMainRoute = !!params.route.snapshot.data['userMainRoute'];
      const profileUsername = profile?.username;
      if (
        isUserMainRoute &&
        currentUsernameParam &&
        profileUsername &&
        currentUsernameParam.toLowerCase() !== profileUsername.toLowerCase()
      ) {
        params.router.navigate(['/', profileUsername], { replaceUrl: true });
      }
    });

  params.route.data
    .pipe(takeUntilDestroyed(params.destroyRef))
    .subscribe((data) => {
      params.setReadOnlyView(!!data['readOnly']);
      params.cdr.markForCheck();
    });

  params.boardStore.refreshBoards();
  params.userStore.refreshMyProfile();
  params.userStore.refreshMyPreferences();

  params.userStore.mainBoardId$
    .pipe(takeUntilDestroyed(params.destroyRef))
    .subscribe((mainBoardId) => {
      params.setAccountMainBoardId(mainBoardId || '');
    });
}
