import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';
import { UserSettingsWidgetComponent } from './user-settings-widget';
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
    const component = TestBed.createComponent(UserSettingsWidgetComponent).componentInstance;
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
          profile$: of(profile), getCurrentProfile: () => profile, refreshMyProfile: vi.fn(),
          setMainBoardId: vi.fn(), updateMyProfile,
        } },
        { provide: BoardService, useValue: { getMyPreferences: () => of({ username: 'alice', mainBoardId: 'one' }) } },
      ] });
      const fixture = TestBed.createComponent(UserSettingsWidgetComponent);
      const component = fixture.componentInstance;
      component.widget = { id: 1, type: 'user-settings', title: 'Settings', layout: 'span-2', config: {}, enabled: true, order: 0 };
      fixture.detectChanges();
      boards.refreshBoards.mockClear();
      let error = '';
      const subscription = component.vm$.subscribe(vm => error = vm.errorMessage);
      component.onProfileFieldChanged('username', 'settings');
      await vi.advanceTimersByTimeAsync(650);
      expect(error).toBe('username is reserved');
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
