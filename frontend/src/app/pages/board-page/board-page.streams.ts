import type { ParamMap } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map, startWith, switchMap, tap } from 'rxjs/operators';

import type { Board } from '../../models/board';
import type { Widget } from '../../models/widget';

export type BoardPageState =
  | { status: 'loading' }
  | { status: 'ready'; board: Board }
  | { status: 'missing' };

export function createPageStateStream(params: {
  reload$: Observable<unknown>;
  routeParamMap$: Observable<ParamMap>;
  resolveBoardId$: (routeParamBoardId: string | null, routeParamUsername: string | null) => Observable<string>;
  loadBoard: (boardId: string) => Observable<Board>;
  recordBoardView: (boardId: string) => void;
  onState: (state: BoardPageState) => void;
}): Observable<BoardPageState> {
  return params.routeParamMap$.pipe(
    switchMap((routeParams) =>
      params.reload$.pipe(
        startWith(undefined),
        switchMap(() =>
          params.resolveBoardId$(routeParams.get('boardId'), routeParams.get('username')).pipe(
            switchMap((boardId) => params.loadBoard(boardId)),
            tap((board) => params.recordBoardView(board.id)),
            map((board): BoardPageState => ({ status: 'ready', board })),
            catchError(() => of<BoardPageState>({ status: 'missing' }))
          )
        ),
        // Clear immediately for a new route/account, but retain the view during a same-board refresh.
        startWith<BoardPageState>({ status: 'loading' })
      )
    ),
    tap(params.onState)
  );
}

export function createWidgetsStream(params: {
  reload$: Observable<unknown>;
  routeParamMap$: Observable<ParamMap>;
  resolveBoardId$: (routeParamBoardId: string | null, routeParamUsername: string | null) => Observable<string>;
  loadWidgets: (boardId: string) => Observable<Widget[]>;
  onBoardResolved: (boardId: string) => void;
}): Observable<Widget[]> {
  return params.routeParamMap$.pipe(
    switchMap((routeParams) =>
      params.reload$.pipe(
        startWith(undefined),
        switchMap(() =>
          params.resolveBoardId$(routeParams.get('boardId'), routeParams.get('username')).pipe(
            tap(params.onBoardResolved),
            switchMap((boardId) => params.loadWidgets(boardId)),
            map((widgets) => [...widgets].sort((a, b) => a.order - b.order)),
            catchError(() => of<Widget[]>([]))
          )
        ),
        startWith<Widget[]>([])
      )
    )
  );
}
