import { TestBed } from '@angular/core/testing';
import { HttpRequest, HttpResponse } from '@angular/common/http';
import { of } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { authInterceptor } from './auth.interceptor';

describe('API bearer token scope', () => {
  beforeEach(() => TestBed.configureTestingModule({
    providers: [{ provide: AuthService, useValue: { getAccessToken: () => 'session-token' } }],
  }));

  it.each(['/api/board/mine', '/api/board?page=0', '/api/users/me/profile', '/api/auth/me', '/api/auth/signout', '/api/insights/one', `${window.location.origin}/api/board/one`])('authenticates the local API %s', url => {
    const next = vi.fn((_request: HttpRequest<unknown>) => of(new HttpResponse()));
    TestBed.runInInjectionContext(() => authInterceptor(new HttpRequest('GET', url), next));
    expect(next.mock.calls[0][0].headers.get('Authorization')).toBe('Bearer session-token');
  });

  it.each(['https://external.example/api/board/one', '//external.example/api/users/me', '/api/board-other', '/api/users/member', '/api/auth/signin', '/images/api/board/one'])('withholds the token from %s', url => {
    const next = vi.fn((_request: HttpRequest<unknown>) => of(new HttpResponse()));
    TestBed.runInInjectionContext(() => authInterceptor(new HttpRequest('GET', url), next));
    expect(next.mock.calls[0][0].headers.has('Authorization')).toBe(false);
  });
});
