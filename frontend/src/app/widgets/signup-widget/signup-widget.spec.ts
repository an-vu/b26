import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';
import { SignupWidgetComponent } from './signup-widget';
import { AuthService } from '../../services/auth.service';
import { BoardService } from '../../services/board.service';

describe('Signup onboarding', () => {
  function setup(failedPreferences = false) {
    const router = { navigate: vi.fn(), navigateByUrl: vi.fn() };
    const auth = { signup: vi.fn(() => of({ user: { username: 'new-user' } })) };
    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: router },
        { provide: AuthService, useValue: auth },
        { provide: BoardService, useValue: { getMyPreferences: () => failedPreferences
          ? throwError(() => new Error('offline')) : of({ mainBoardUrl: 'first-board' }) } },
      ],
    });
    const component = TestBed.createComponent(SignupWidgetComponent).componentInstance;
    component.email = 'new@example.com';
    component.password = 'test-password-123';
    component.confirmPassword = component.password;
    return { component, router, auth };
  }

  it('opens the starter board in its editable route', () => {
    const { component, router } = setup();
    component.onSignupSubmit();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/new-user/first-board');
  });

  it('falls back to the public main board when preference loading fails', () => {
    const { component, router } = setup(true);
    component.onSignupSubmit();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/new-user');
    expect(component.errorMessage).toBe('');
  });

  it('renders an asynchronous failure and re-enables submission without another click', async () => {
    const response = new Subject<never>();
    TestBed.configureTestingModule({ providers: [
      { provide: Router, useValue: { navigateByUrl: vi.fn() } },
      { provide: AuthService, useValue: { signup: () => response } },
      { provide: BoardService, useValue: {} },
    ] });
    const fixture = TestBed.createComponent(SignupWidgetComponent);
    const component = fixture.componentInstance;
    component.widget = { id: 1, type: 'signup', title: 'Create Account', layout: 'span-2', config: {}, enabled: true, order: 0 };
    component.email = 'test@example.com';
    component.password = component.confirmPassword = 'test-password-123';
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await fixture.whenStable();
    response.error(new Error('offline'));
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Unable to sign up right now.');
    expect(fixture.nativeElement.querySelector('button[type=submit]').disabled).toBe(false);
  });

  it('does not create an account for mismatched passwords', () => {
    const { component, auth } = setup();
    component.confirmPassword = 'different';
    component.onSignupSubmit();
    expect(auth.signup).not.toHaveBeenCalled();
  });
});
