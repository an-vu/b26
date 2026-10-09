import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { BehaviorSubject, of, Subject, throwError } from 'rxjs';
import type { UserProfile, UserPreferences } from '../../models/board';
import { vi } from 'vitest';
import { AccountSettingsFormComponent } from './account-settings-form';
import { AuthService } from '../../services/auth.service';
import { UserStoreService } from '../../services/user-store.service';
import { BoardStoreService } from '../../services/board-store.service';
import { BoardService } from '../../services/board.service';

describe('Settings sign out', () => {
  function setup() {
    const response = new Subject<void>();
    const auth = { signout: vi.fn(() => response) };
    const user = { profile$: of(null), clearProfile: vi.fn() };
    const boards = { boards$: of([]), clearBoards: vi.fn() };
    const router = { navigateByUrl: vi.fn() };
    TestBed.configureTestingModule({ providers: [
      { provide: AuthService, useValue: auth },
      { provide: UserStoreService, useValue: user },
      { provide: BoardStoreService, useValue: boards },
      { provide: BoardService, useValue: {} },
      { provide: Router, useValue: router },
    ] });
    const component = TestBed.createComponent(AccountSettingsFormComponent).componentInstance;
    return { component, response, auth, user, boards, router };
  }

  it('prevents duplicate requests and clears account state after success', () => {
    const { component, response, auth, user, boards, router } = setup();
    component.signOut();
    component.signOut();
    expect(auth.signout).toHaveBeenCalledTimes(1);
    expect(user.clearProfile).not.toHaveBeenCalled();
    response.next();
    response.complete();
    expect(user.clearProfile).toHaveBeenCalled();
    expect(boards.clearBoards).toHaveBeenCalled();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/signin');
    expect(component.isSigningOut).toBe(false);
  });

  it('keeps the account available and exposes an error for retry on failure', () => {
    const { component, response, user, router } = setup();
    let message = '';
    const subscription = component.vm$.subscribe(vm => message = vm.errorMessage);
    component.signOut();
    response.error(new Error('offline'));
    expect(component.isSigningOut).toBe(false);
    expect(user.clearProfile).not.toHaveBeenCalled();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
    expect(message).toContain('Unable to sign out');
    subscription.unsubscribe();
  });
});


describe('Settings username changes', () => {
  it('shows the reserved-name error and refreshes board links only after a successful save', async () => {
    vi.useFakeTimers();
    try {
      const profile = { userId: 'alice', displayName: 'Alice', username: 'alice', email: 'alice@example.com' };
      const updateMyProfile = vi.fn(() => throwError(() => ({ error: {
        message: 'Validation failed', errors: [{ message: 'username is reserved' }],
      } })) as ReturnType<UserStoreService['updateMyProfile']>);
      const boards = { boards$: of([]), refreshBoards: vi.fn() };
      TestBed.configureTestingModule({ providers: [
        { provide: AuthService, useValue: {} }, { provide: Router, useValue: {} },
        { provide: BoardStoreService, useValue: boards },
        { provide: UserStoreService, useValue: {
          profile$: of(profile), mainBoardId$: of('one'), refreshMyPreferences: vi.fn(), refreshMyProfile: vi.fn(),
          setMainBoardId: vi.fn(), updateMyProfile,
        } },
        { provide: BoardService, useValue: { getMyPreferences: () => of({ username: 'alice', mainBoardId: 'one' }) } },
      ] });
      const fixture = TestBed.createComponent(AccountSettingsFormComponent);
      const component = fixture.componentInstance;
      component.showMainBoard = false;
      component.widget = { id: 1, type: 'user-settings', title: 'Settings', layout: 'span-2', config: {}, enabled: true, order: 0 };
      fixture.detectChanges();
      boards.refreshBoards.mockClear();
      let error = '';
      const subscription = component.vm$.subscribe(vm => error = vm.errorMessage);
      component.onProfileFieldChanged('username', 'settings');
      await vi.advanceTimersByTimeAsync(650);
      expect(error).toBe('username is reserved');
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[role=alert]').textContent).toContain('username is reserved');
      expect(boards.refreshBoards).not.toHaveBeenCalled();
      updateMyProfile.mockReturnValue(of({ ...profile, username: 'alice-new' }));
      component.onProfileFieldChanged('username', 'alice-new');
      await vi.advanceTimersByTimeAsync(650);
      expect(error).toBe('');
      expect(boards.refreshBoards).toHaveBeenCalledOnce();
      subscription.unsubscribe();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('Settings account isolation', () => {
  const alice: UserProfile = { userId: 'alice', displayName: 'Alice', username: 'alice', email: 'alice@example.com' };
  const bob: UserProfile = { userId: 'bob', displayName: 'Bob', username: 'bob', email: 'bob@example.com' };

  function setup() {
    const profile$ = new BehaviorSubject<UserProfile | null>(alice);
    const mainBoardId$ = new BehaviorSubject('alice-board');
    const profileSave = new Subject<UserProfile>();
    const preferencesSave = new Subject<UserPreferences>();
    const users = {
      profile$, mainBoardId$, refreshMyProfile: vi.fn(), refreshMyPreferences: vi.fn(),
      updateMyProfile: vi.fn(() => profileSave), setMainBoardId: vi.fn(),
    };
    const boards = { boards$: of([]), refreshBoards: vi.fn() };
    const service = { updateMyPreferences: vi.fn(() => preferencesSave) };
    TestBed.configureTestingModule({ providers: [
      provideRouter([]), { provide: AuthService, useValue: {} },
      { provide: UserStoreService, useValue: users },
      { provide: BoardStoreService, useValue: boards },
      { provide: BoardService, useValue: service },
    ] });
    const fixture = TestBed.createComponent(AccountSettingsFormComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    return { component, profile$, mainBoardId$, profileSave, preferencesSave, users, boards, service };
  }

  it.each(['sign-out', 'account switch'])('discards the queued profile edit on %s and accepts new edits afterward', async change => {
    vi.useFakeTimers();
    try {
      const { component, profile$, mainBoardId$, users } = setup();
      let state: any;
      const subscription = component.vm$.subscribe(vm => state = vm);
      component.onProfileFieldChanged('email', 'private-draft@example.com');
      profile$.next(change === 'sign-out' ? null : bob);
      mainBoardId$.next(change === 'sign-out' ? '' : 'bob-board');
      await vi.advanceTimersByTimeAsync(650);
      expect(users.updateMyProfile).not.toHaveBeenCalled();
      expect(state.email).toBe(change === 'sign-out' ? '' : bob.email);
      expect(state.profileSavedField).toBeNull();
      if (change === 'sign-out') {
        component.onProfileFieldChanged('displayName', 'Cannot save while signed out');
        component.onMainBoardChanged('alice-board');
        profile$.next(bob);
      }
      component.onProfileFieldChanged('displayName', 'Bobby');
      await vi.advanceTimersByTimeAsync(650);
      expect(users.updateMyProfile).toHaveBeenCalledExactlyOnceWith({
        displayName: 'Bobby', username: 'bob', email: bob.email,
      });
      subscription.unsubscribe();
    } finally {
      vi.useRealTimers();
    }
  });

  it('cancels pending profile and main-board writes before another account is hydrated', async () => {
    vi.useFakeTimers();
    try {
      const { component, profile$, mainBoardId$, users, boards, profileSave, preferencesSave } = setup();
      let state: any;
      const subscription = component.vm$.subscribe(vm => state = vm);
      component.onMainBoardChanged('another-alice-board');
      component.onProfileFieldChanged('displayName', 'Alice draft');
      await vi.advanceTimersByTimeAsync(650);
      expect(profileSave.observed).toBe(true);
      expect(preferencesSave.observed).toBe(true);
      boards.refreshBoards.mockClear();

      profile$.next(bob);
      mainBoardId$.next('bob-board');
      expect(profileSave.observed).toBe(false);
      expect(preferencesSave.observed).toBe(false);
      profileSave.next({ ...alice, displayName: 'Late Alice' });
      preferencesSave.next({ userId: 'alice', username: 'alice', mainBoardId: 'another-alice-board', mainBoardUrl: 'alice-url' });
      expect(users.setMainBoardId).not.toHaveBeenCalled();
      expect(boards.refreshBoards).not.toHaveBeenCalled();
      expect(state.displayName).toBe('Bob');
      expect(state.email).toBe(bob.email);
      expect(state.mainBoardId).toBe('bob-board');
      expect(state.saved).toBe(false);
      expect(users.refreshMyPreferences).toHaveBeenCalledTimes(2);
      subscription.unsubscribe();
    } finally {
      vi.useRealTimers();
    }
  });
});
