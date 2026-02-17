import { Routes } from '@angular/router';
import { BoardPageComponent } from './pages/board-page/board-page';

export const routes: Routes = [
  { path: '', pathMatch: 'full', component: BoardPageComponent, data: { systemRoute: 'main', readOnly: true } },
  { path: 'b/:boardId', component: BoardPageComponent },
  { path: 'insights', component: BoardPageComponent, data: { systemRoute: 'insights', readOnly: true } },
  { path: 'settings', component: BoardPageComponent, data: { systemRoute: 'settings', readOnly: true } },
  { path: 'login', component: BoardPageComponent, data: { systemRoute: 'login', readOnly: true } },
  { path: 'u/:boardId', redirectTo: 'b/:boardId' },
  { path: ':username', component: BoardPageComponent, data: { userMainRoute: true, readOnly: true } },
  { path: '**', redirectTo: '' },
];
