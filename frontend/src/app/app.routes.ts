import { Routes } from '@angular/router';
import { BoardPageComponent } from './pages/board-page/board-page';

export const routes: Routes = [
  { path: '', pathMatch: 'full', component: BoardPageComponent, data: { systemRoute: 'main', readOnly: true } },
  { path: 'b/:boardId', component: BoardPageComponent },
  { path: 'insights', component: BoardPageComponent, data: { systemRoute: 'insights', readOnly: true } },
  { path: 'settings', component: BoardPageComponent, data: { systemRoute: 'settings', readOnly: true } },
  { path: 'signin', component: BoardPageComponent, data: { systemRoute: 'signin', readOnly: true } },
  { path: 'signup', component: BoardPageComponent, data: { systemRoute: 'signup', readOnly: true } },
  { path: 'u/:boardId', redirectTo: 'b/:boardId' },
  { path: ':username', component: BoardPageComponent, data: { userMainRoute: true, readOnly: true } },
  { path: '**', redirectTo: '' },
];
