import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

function needsAuthHeader(url: string): boolean {
  return (
    url.includes('/api/users/me') ||
    url.includes('/api/auth/me') ||
    url.includes('/api/auth/signout') ||
    url.includes('/api/board/') ||
    url.includes('/api/system/')
  );
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
