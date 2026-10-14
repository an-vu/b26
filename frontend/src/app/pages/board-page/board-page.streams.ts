import type { ParamMap } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map, shareReplay, startWith, switchMap, tap } from 'rxjs/operators';
import type { Board } from '../../models/board';
import type { Widget } from '../../models/widget';

export type BoardPageState =
  | { status: 'loading' }
  | { status: 'ready'; board: Board }
  | { status: 'missing' }
  | { status: 'denied' }
  | { status: 'error' };

export type WidgetLoadState = {
  status: 'loading' | 'ready' | 'error';
  widgets: Widget[];
};

export function createPageStateStream(params: {
  reload$: Observable<unknown>;
  routeParamMap$: Observable<ParamMap>;
  resolveBoard$: (boardId: string | null, username: string | null) => Observable<Board>;
  recordBoardView: (boardId: string) => void;
  onState: (state: BoardPageState) => void;
}): Observable<BoardPageState> {
  return params.routeParamMap$.pipe(
    switchMap(routeParams => params.reload$.pipe(
      startWith(undefined),
      switchMap(() => params.resolveBoard$(routeParams.get('boardId'), routeParams.get('username')).pipe(
        tap(board => params.recordBoardView(board.id)),
        map((board): BoardPageState => ({ status: 'ready', board })),
        catchError(error => of<BoardPageState>({ status: error?.status === 404 ? 'missing'
          : [401, 403].includes(error?.status) ? 'denied' : 'error' }))
      )),
      // A refresh retains the mounted board; route/account changes clear it immediately.
      startWith<BoardPageState>({ status: 'loading' })
    )),
    tap(params.onState),
    shareReplay({ bufferSize: 1, refCount: true })
  );
}

export function createWidgetsStream(params: {
  pageState$: Observable<BoardPageState>;
  loadWidgets: (boardUrl: string) => Observable<Widget[]>;
  onAccessDenied: () => void;
}): Observable<WidgetLoadState> {
  return params.pageState$.pipe(
    switchMap(state => state.status !== 'ready'
      ? of<WidgetLoadState>({ status: 'loading', widgets: [] })
      : params.loadWidgets(state.board.boardUrl).pipe(
        map((widgets): WidgetLoadState => ({ status: 'ready', widgets: [...widgets].sort((a, b) => a.order - b.order) })),
        catchError(error => {
          if ([401, 403, 404].includes(error?.status)) params.onAccessDenied();
          return of<WidgetLoadState>({ status: 'error', widgets: [] });
        })
      )),
    startWith<WidgetLoadState>({ status: 'loading', widgets: [] }),
    shareReplay({ bufferSize: 1, refCount: true })
  );
}
