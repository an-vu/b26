import { SigninPageComponent } from './pages/app-pages/signin-page';
import { SettingsPageComponent } from './pages/app-pages/settings-page';
import { HomePageComponent } from './pages/app-pages/home-page';
import { InsightsPageComponent } from './pages/app-pages/insights-page';
import { ProfilePageComponent } from './pages/app-pages/profile-page';
import { CanDeactivateFn, Routes } from '@angular/router';
import { BoardPageComponent } from './pages/board-page/board-page';

export const pendingBoardChangesGuard: CanDeactivateFn<BoardPageComponent> = component => component.canLeaveBoard();

export const routes: Routes = [
  { path: '', pathMatch: 'full', component: HomePageComponent },
  { path: 'b/:boardId', component: BoardPageComponent, canDeactivate: [pendingBoardChangesGuard] },
  { path: 'insights', component: InsightsPageComponent },
  { path: 'settings', component: SettingsPageComponent },
  { path: 'signin', component: SigninPageComponent },
  { path: 'u/:boardId', redirectTo: 'b/:boardId' },
  { path: ':username/:boardId', component: BoardPageComponent, canDeactivate: [pendingBoardChangesGuard] },
  { path: ':username', component: ProfilePageComponent, data: { userMainRoute: true, readOnly: true } },
  { path: '**', redirectTo: '' },
];
