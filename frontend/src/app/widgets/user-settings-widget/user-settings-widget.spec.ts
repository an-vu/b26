import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, Subject } from 'rxjs';
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
