import { finalize } from 'rxjs';
import type { Router } from '@angular/router';
import type { BoardStoreService } from '../../services/board-store.service';
import type { UserStoreService } from '../../services/user-store.service';
import type { AuthService } from '../../services/auth.service';
import type { BoardService } from '../../services/board.service';
import type { BoardIdentity } from '../../models/board-identity';
import type { UserProfile } from '../../models/board';

export type AccountMenuBoard = { id: string; label: string; route: string };
export type AccountMenuUser = { name: string; username: string };

const DEFAULT_USER: AccountMenuUser = {
  name: 'Account',
  username: '@account',
};

export function mapAccountBoards(boards: BoardIdentity[]): AccountMenuBoard[] {
  return boards.map((board) => ({
    id: board.id,
    label: board.boardName,
    route: `/b/${board.boardUrl}`,
  }));
}

export function mapAccountUser(profile: UserProfile | null): {
  isSignedIn: boolean;
  user: AccountMenuUser;
  resetMainBoardId: boolean;
} {
  if (!profile) {
    return {
      isSignedIn: false,
      user: DEFAULT_USER,
      resetMainBoardId: true,
    };
  }

  return {
    isSignedIn: true,
    user: {
      name: profile.displayName,
      username: `@${profile.username}`,
    },
    resetMainBoardId: false,
  };
}

export function runCreateBoardFlow(options: {
  boardService: BoardService;
  boardStore: BoardStoreService;
  userStore: UserStoreService;
  router: Router;
  closeAccountMenu: () => void;
  onStart: () => void;
  onFinalize: () => void;
  onError: (error: unknown) => void;
}): void {
  options.onStart();

  options.boardService
    .createBoard()
    .pipe(finalize(options.onFinalize))
    .subscribe({
      next: (board) => {
        options.closeAccountMenu();
        options.boardStore.refreshBoards();
        options.userStore.refreshMyPreferences();
        void options.router.navigate(['/b', board.boardUrl]);
      },
      error: (error) => {
        options.onError(error);
      },
    });
}

export function runSignOutFlow(options: {
  authService: AuthService;
  userStore: UserStoreService;
  boardStore: BoardStoreService;
  router: Router;
  closeAccountMenu: () => void;
  onStart: () => void;
  onComplete: () => void;
}): void {
  options.onStart();

  options.authService
    .signout()
    .pipe(finalize(options.onComplete))
    .subscribe({
      next: () => {
        options.closeAccountMenu();
        options.userStore.clearProfile();
        options.boardStore.clearBoards();
        void options.router.navigateByUrl('/');
      },
      error: () => {
        options.authService.clearSession();
        options.userStore.clearProfile();
        options.boardStore.clearBoards();
        options.closeAccountMenu();
        void options.router.navigateByUrl('/');
      },
    });
}
