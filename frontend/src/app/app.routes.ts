import { Routes } from '@angular/router';
import { BoardPageComponent } from './pages/board-page/board-page';
import { AnalyticsPageComponent } from './pages/analytics-page/analytics-page';

export const routes: Routes = [
  { path: '', component: BoardPageComponent, data: { boardId: 'home' } },
  { path: 'b/:boardId', component: BoardPageComponent },
  { path: 'analytics', component: AnalyticsPageComponent },
  { path: 'u/:boardId', redirectTo: 'b/:boardId' },
  { path: '**', redirectTo: '' },
];
