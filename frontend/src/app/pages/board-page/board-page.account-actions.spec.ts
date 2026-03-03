import { of, throwError } from 'rxjs';

import { runDeleteBoardAction } from './board-page.account-actions';
import type { BoardService } from '../../services/board.service';
import type { BoardStoreService } from '../../services/board-store.service';
import type { UserStoreService } from '../../services/user-store.service';

describe('runDeleteBoardAction', () => {
  it('deletes board, refreshes stores, and navigates when deleting active board', () => {
    let deleteCalledWith = '';
    let navigateCalledWith = '';
    let refreshBoardsCalls = 0;
    let refreshPreferencesCalls = 0;
    const deletingStates: Array<{ loading: boolean; boardUrl: string }> = [];
    const accountErrors: string[] = [];
    let closeActionsCalls = 0;
    let closeIdentityCalls = 0;

    const boardService = {
      deleteBoard: (boardUrl: string) => {
        deleteCalledWith = boardUrl;
        return of(undefined);
      },
    } as unknown as BoardService;
    const boardStore = {
      refreshBoards: () => {
        refreshBoardsCalls += 1;
      },
    } as unknown as BoardStoreService;
    const userStore = {
      refreshMyPreferences: () => {
        refreshPreferencesCalls += 1;
      },
    } as unknown as UserStoreService;
    const router = {
      navigateByUrl: (url: string) => {
        navigateCalledWith = url;
        return Promise.resolve(true);
      },
    };

    runDeleteBoardAction({
      boardUrl: 'default',
      activeBoardUrl: 'default',
      fallbackRoute: '/b/home',
      isDeletingBoard: false,
      setDeletingBoard: (loading, boardUrl) => {
        deletingStates.push({ loading, boardUrl });
      },
      setAccountActionError: (message) => {
        accountErrors.push(message);
      },
      boardService,
      boardStore,
      userStore,
      router: router as any,
      closeAccountBoardActionsMenu: () => {
        closeActionsCalls += 1;
      },
      closeBoardIdentityMenu: () => {
        closeIdentityCalls += 1;
      },
    });

    expect(deleteCalledWith).toBe('default');
    expect(deletingStates).toEqual([
      { loading: true, boardUrl: 'default' },
      { loading: false, boardUrl: '' },
    ]);
    expect(accountErrors).toEqual(['']);
    expect(refreshBoardsCalls).toBe(1);
    expect(refreshPreferencesCalls).toBe(1);
    expect(closeActionsCalls).toBe(1);
    expect(closeIdentityCalls).toBe(1);
    expect(navigateCalledWith).toBe('/b/home');
  });

  it('sets error and stops loading when delete fails', () => {
    const deletingStates: Array<{ loading: boolean; boardUrl: string }> = [];
    const accountErrors: string[] = [];
    let refreshBoardsCalls = 0;
    let refreshPreferencesCalls = 0;
    let navigateCalls = 0;

    const boardService = {
      deleteBoard: () => throwError(() => ({ message: 'nope' })),
    } as unknown as BoardService;
    const boardStore = {
      refreshBoards: () => {
        refreshBoardsCalls += 1;
      },
    } as unknown as BoardStoreService;
    const userStore = {
      refreshMyPreferences: () => {
        refreshPreferencesCalls += 1;
      },
    } as unknown as UserStoreService;
    const router = {
      navigateByUrl: () => {
        navigateCalls += 1;
        return Promise.resolve(true);
      },
    };

    runDeleteBoardAction({
      boardUrl: 'default',
      activeBoardUrl: 'default',
      fallbackRoute: '/b/home',
      isDeletingBoard: false,
      setDeletingBoard: (loading, boardUrl) => {
        deletingStates.push({ loading, boardUrl });
      },
      setAccountActionError: (message) => {
        accountErrors.push(message);
      },
      boardService,
      boardStore,
      userStore,
      router: router as any,
      closeAccountBoardActionsMenu: () => {},
      closeBoardIdentityMenu: () => {},
    });

    expect(deletingStates).toEqual([
      { loading: true, boardUrl: 'default' },
      { loading: false, boardUrl: '' },
    ]);
    expect(accountErrors).toEqual(['', 'Unable to delete board.']);
    expect(refreshBoardsCalls).toBe(0);
    expect(refreshPreferencesCalls).toBe(0);
    expect(navigateCalls).toBe(0);
  });

  it('does nothing while delete is already in progress', () => {
    let deleteCalls = 0;
    const boardService = {
      deleteBoard: () => {
        deleteCalls += 1;
        return of(undefined);
      },
    } as unknown as BoardService;

    runDeleteBoardAction({
      boardUrl: 'default',
      activeBoardUrl: 'default',
      fallbackRoute: '/b/home',
      isDeletingBoard: true,
      setDeletingBoard: () => {},
      setAccountActionError: () => {},
      boardService,
      boardStore: { refreshBoards: () => {} } as unknown as BoardStoreService,
      userStore: { refreshMyPreferences: () => {} } as unknown as UserStoreService,
      router: { navigateByUrl: () => Promise.resolve(true) } as any,
      closeAccountBoardActionsMenu: () => {},
      closeBoardIdentityMenu: () => {},
    });

    expect(deleteCalls).toBe(0);
  });
});
