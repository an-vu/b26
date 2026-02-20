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
  let hasLoadedPageStateOnce = false;

  return params.reload$.pipe(
    startWith(undefined),
    switchMap(() =>
      params.routeParamMap$.pipe(
        switchMap((routeParams) => {
          const boardState$ = params
            .resolveBoardId$(routeParams.get('boardId'), routeParams.get('username'))
            .pipe(
              switchMap((boardId) =>
                params.loadBoard(boardId).pipe(
                  tap((board) => {
                    params.recordBoardView(board.id);
                  }),
                  map((board): BoardPageState => ({ status: 'ready', board })),
                  catchError(() => of<BoardPageState>({ status: 'missing' }))
                )
              )
            );

          return hasLoadedPageStateOnce
            ? boardState$
            : boardState$.pipe(startWith<BoardPageState>({ status: 'loading' }));
        }),
        tap((state) => {
          if (state.status !== 'loading') {
            hasLoadedPageStateOnce = true;
          }
          params.onState(state);
        })
      )
    )
  );
}

export function createWidgetsStream(params: {
  reload$: Observable<unknown>;
  routeParamMap$: Observable<ParamMap>;
  resolveBoardId$: (routeParamBoardId: string | null, routeParamUsername: string | null) => Observable<string>;
  loadWidgets: (boardId: string) => Observable<Widget[]>;
  onBoardResolved: (boardId: string) => void;
}): Observable<Widget[]> {
  return params.reload$.pipe(
    startWith(undefined),
    switchMap(() =>
      params.routeParamMap$.pipe(
        switchMap((routeParams) =>
          params.resolveBoardId$(routeParams.get('boardId'), routeParams.get('username')).pipe(
            tap((boardId) => {
              params.onBoardResolved(boardId);
            }),
            switchMap((boardId) =>
              params.loadWidgets(boardId).pipe(
                map((widgets) => [...widgets].sort((a, b) => a.order - b.order)),
                catchError(() => of<Widget[]>([])),
                startWith<Widget[]>([])
              )
            )
          )
        )
      )
    )
  );
}
