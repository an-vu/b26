import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import type { AuthUser } from '../models/auth';

describe('Session changes during account lookup', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] }));
  afterEach(() => { TestBed.inject(AuthService).clearSession(); TestBed.inject(HttpTestingController).verify(); });

  it('cancels an old session lookup on sign-out and removes the token before notifying subscribers', () => {
    const auth = TestBed.inject(AuthService);
    const requests = TestBed.inject(HttpTestingController);
    auth.setAccessToken('old-session');
    auth.me().subscribe();
    const pending = requests.expectOne('/api/auth/me');
    let observedToken = 'initial';
    auth.user$.subscribe(() => observedToken = auth.getAccessToken());
    auth.clearSession();
    expect(pending.cancelled).toBe(true);
    expect(observedToken).toBe('');
  });

  it('cancels the old lookup when a new account signs in', () => {
    const auth = TestBed.inject(AuthService);
    const requests = TestBed.inject(HttpTestingController);
    const user = { id: 'bob', username: 'bob', displayName: 'Bob', email: 'bob@example.com', role: 'USER' };
    let current: AuthUser | null = null;
    auth.user$.subscribe(value => current = value);
    auth.me().subscribe();
    const pending = requests.expectOne('/api/auth/me');
    auth.signin({ email: 'bob@example.com', password: 'password' }).subscribe();
    requests.expectOne('/api/auth/signin').flush({ accessToken: 'bob-session', expiresAt: '', user });
    expect(pending.cancelled).toBe(true);
    expect(current).toEqual(user);
    expect(auth.getAccessToken()).toBe('bob-session');
  });
});
