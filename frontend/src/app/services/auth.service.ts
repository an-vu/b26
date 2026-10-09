import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, Subject, takeUntil, tap } from 'rxjs';
import type {
  AuthMeResponse,
  AuthSessionResponse,
  AuthUser,
  SigninRequest,
  SignupRequest,
} from '../models/auth';

const ACCESS_TOKEN_KEY = 'b26_access_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly userSubject = new BehaviorSubject<AuthUser | null>(null);
  readonly user$ = this.userSubject.asObservable();
  private readonly sessionChanged$ = new Subject<void>();

  constructor(private http: HttpClient) {}

  signup(payload: SignupRequest): Observable<AuthSessionResponse> {
    return this.http
      .post<AuthSessionResponse>(`/api/auth/signup`, payload)
      .pipe(tap((response) => this.applySession(response)));
  }

  signin(payload: SigninRequest): Observable<AuthSessionResponse> {
    return this.http
      .post<AuthSessionResponse>(`/api/auth/signin`, payload)
      .pipe(tap((response) => this.applySession(response)));
  }

  me(): Observable<AuthMeResponse> {
    return this.http
      .get<AuthMeResponse>(`/api/auth/me`)
      .pipe(takeUntil(this.sessionChanged$), tap((response) => this.userSubject.next(response.user)));
  }

  signout(): Observable<void> {
    return this.http.post<void>(`/api/auth/signout`, {}).pipe(
      tap(() => {
        this.clearSession();
      })
    );
  }

  getAccessToken(): string {
    try {
      return localStorage.getItem(ACCESS_TOKEN_KEY)?.trim() ?? '';
    } catch {
      return '';
    }
  }

  setAccessToken(token: string): void {
    try {
      localStorage.setItem(ACCESS_TOKEN_KEY, token);
    } catch {
      // ignore storage failures (e.g., private mode restrictions)
    }
  }

  clearSession(): void {
    try {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
    } catch {
      // ignore storage failures
    }
    this.sessionChanged$.next();
    this.userSubject.next(null);
  }

  private applySession(response: AuthSessionResponse): void {
    this.sessionChanged$.next();
    this.setAccessToken(response.accessToken);
    this.userSubject.next(response.user);
  }
}
