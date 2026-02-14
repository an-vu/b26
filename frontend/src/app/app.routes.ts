import { Routes } from '@angular/router';
import { BoardPageComponent } from './pages/board-page/board-page';

export const routes: Routes = [
  { path: '', component: BoardPageComponent, data: { boardId: 'home' } },
  { path: 'b/:boardId', component: BoardPageComponent },
  { path: 'insights', redirectTo: 'b/insights' },
  { path: 'u/:boardId', redirectTo: 'b/:boardId' },
  { path: '**', redirectTo: '' },
];
