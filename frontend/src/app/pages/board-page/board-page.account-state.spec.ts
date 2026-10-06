import { DestroyRef, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { convertToParamMap } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { vi } from 'vitest';
import type { UserProfile } from '../../models/board';
import { initializeBoardPageAccountState } from './board-page.account-state';

describe('Account hydration on public user pages', () => {
  it('updates the account menu without navigating away from another user', () => {
    TestBed.configureTestingModule({});
    const profile$ = new BehaviorSubject<UserProfile | null>(null);
    const navigate = vi.fn();
    const setSignedIn = vi.fn();
    TestBed.runInInjectionContext(() => initializeBoardPageAccountState({
      destroyRef: inject(DestroyRef),
      boardStore: { boards$: of([]), refreshBoards: vi.fn() },
      userStore: { profile$, mainBoardId$: of('mine'), refreshMyProfile: vi.fn(), refreshMyPreferences: vi.fn() },
      route: { data: of({ readOnly: true }), snapshot: { paramMap: convertToParamMap({ username: 'someone-else' }), data: { userMainRoute: true } } },
      router: { navigate },
      cdr: { markForCheck: vi.fn() },
      setAccountBoards: vi.fn(), setSignedIn, setAccountUser: vi.fn(), setAccountMainBoardId: vi.fn(), setReadOnlyView: vi.fn(),
    } as unknown as Parameters<typeof initializeBoardPageAccountState>[0]));
    profile$.next({ userId: 'me', username: 'me', displayName: 'Me', email: 'me@example.com' });
    expect(setSignedIn).toHaveBeenLastCalledWith(true);
    expect(navigate).not.toHaveBeenCalled();
  });
});
