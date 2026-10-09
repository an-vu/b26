import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

function needsAuthHeader(url: string): boolean {
  try {
    const target = new URL(url, window.location.origin);
    if (target.origin !== window.location.origin) return false;
    return /^\/api\/(?:users\/me|auth\/(?:me|signout)|board|insights)(?:\/|$)/.test(target.pathname);
  } catch {
    return false;
  }
}

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  if (!needsAuthHeader(request.url)) {
    return next(request);
  }

  const authService = inject(AuthService);
  const token = authService.getAccessToken();

  if (!token) {
    return next(request);
  }

  const authorizedRequest = request.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`,
    },
  });

  return next(authorizedRequest);
};
