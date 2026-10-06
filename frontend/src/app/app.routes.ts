import { CanDeactivateFn, Routes } from '@angular/router';
import { BoardPageComponent } from './pages/board-page/board-page';

export const pendingBoardChangesGuard: CanDeactivateFn<BoardPageComponent> = component => component.canLeaveBoard();

export const routes: Routes = [
  { path: '', pathMatch: 'full', component: BoardPageComponent, canDeactivate: [pendingBoardChangesGuard], data: { systemRoute: 'main', readOnly: true } },
  { path: 'b/:boardId', component: BoardPageComponent, canDeactivate: [pendingBoardChangesGuard] },
  { path: 'insights', component: BoardPageComponent, canDeactivate: [pendingBoardChangesGuard], data: { systemRoute: 'insights', readOnly: true } },
  { path: 'settings', component: BoardPageComponent, canDeactivate: [pendingBoardChangesGuard], data: { systemRoute: 'settings', readOnly: true } },
  { path: 'signin', component: BoardPageComponent, canDeactivate: [pendingBoardChangesGuard], data: { systemRoute: 'signin', readOnly: true } },
  { path: 'u/:boardId', redirectTo: 'b/:boardId' },
  { path: ':username', component: BoardPageComponent, canDeactivate: [pendingBoardChangesGuard], data: { userMainRoute: true, readOnly: true } },
  { path: '**', redirectTo: '' },
];
