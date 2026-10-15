import { CanDeactivateFn, Routes } from '@angular/router';
import type { BoardPageComponent } from './pages/board-page/board-page';

export const pendingBoardChangesGuard: CanDeactivateFn<BoardPageComponent> = component => component.canLeaveBoard();

// Blur Lab is a design experiment for tuning chrome blur. `ngDevMode` is defined as false in
// optimized builds, so the route and its lazy chunk are dropped from production bundles.
const devRoutes: Routes = typeof ngDevMode === 'undefined' || !ngDevMode
  ? []
  : [{ path: 'settings/blur-lab', loadComponent: () => import('./pages/blur-lab/blur-lab').then(m => m.BlurLabComponent) }];

export const routes: Routes = [
  ...devRoutes,
  { path: '', pathMatch: 'full', loadComponent: () => import('./pages/app-pages/home-page').then(m => m.HomePageComponent) },
  { path: 'b/:boardId', loadComponent: () => import('./pages/board-page/board-page').then(m => m.BoardPageComponent), canDeactivate: [pendingBoardChangesGuard] },
  { path: 'insights', loadComponent: () => import('./pages/app-pages/insights-page').then(m => m.InsightsPageComponent) },
  { path: 'settings', loadComponent: () => import('./pages/app-pages/settings-page').then(m => m.SettingsPageComponent) },
  { path: 'signin', loadComponent: () => import('./pages/app-pages/signin-page').then(m => m.SigninPageComponent) },
  { path: 'u/:boardId', redirectTo: 'b/:boardId' },
  { path: ':username/:boardId', loadComponent: () => import('./pages/board-page/board-page').then(m => m.BoardPageComponent), canDeactivate: [pendingBoardChangesGuard] },
  { path: ':username', loadComponent: () => import('./pages/app-pages/profile-page').then(m => m.ProfilePageComponent), data: { userMainRoute: true, readOnly: true } },
  { path: '**', redirectTo: '' },
];
