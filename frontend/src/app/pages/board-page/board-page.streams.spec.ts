import { convertToParamMap } from '@angular/router';
import { BehaviorSubject, of, Subject, throwError } from 'rxjs';
import type { Widget } from '../../models/widget';
import type { Board } from '../../models/board';
import { createPageStateStream, createWidgetsStream, type BoardPageState, type WidgetLoadState } from './board-page.streams';

const board: Board = { id: 'one', boardUrl: 'one', boardName: 'One', name: 'Alice', headline: '' };
const widget: Widget = { id: 1, type: 'link', title: 'First', layout: 'span-1', config: {}, enabled: true, order: 0 };

function setup() {
  const reload$ = new Subject<void>();
  const context$ = new BehaviorSubject(convertToParamMap({ boardId: 'one' }));
  const resolveBoard = vi.fn(() => of(board));
  const recordBoardView = vi.fn();
  const onState = vi.fn();
  const pageState$ = createPageStateStream({ reload$, routeParamMap$: context$,
    resolveBoard$: resolveBoard, recordBoardView, onState });
  return { reload$, context$, resolveBoard, recordBoardView, onState, pageState$ };
}

it('shares board resolution and side effects across page and widget consumers', () => {
  const { pageState$, resolveBoard, recordBoardView } = setup();
  const page = pageState$.subscribe();
  const loadWidgets = vi.fn(() => of([widget]));
  const widgets = createWidgetsStream({ pageState$, loadWidgets, onAccessDenied: () => {} }).subscribe();
  expect(resolveBoard).toHaveBeenCalledTimes(1);
  expect(recordBoardView).toHaveBeenCalledTimes(1);
  expect(loadWidgets).toHaveBeenCalledExactlyOnceWith('one');
  page.unsubscribe(); widgets.unsubscribe();
});

it('retains the mounted board and widgets during refresh, then cancels and clears on a context change', () => {
  const { pageState$, resolveBoard, reload$, context$ } = setup();
  const pendingBoard = new Subject<Board>();
  const pendingWidgets = new Subject<Widget[]>();
  const loadWidgets = vi.fn(() => of([widget]));
  let shown: WidgetLoadState | undefined;
  let shownPage: BoardPageState | undefined;
  const page = pageState$.subscribe(state => shownPage = state);
  const widgets = createWidgetsStream({ pageState$, loadWidgets, onAccessDenied: () => {} }).subscribe(state => shown = state);
  resolveBoard.mockReturnValue(pendingBoard);
  loadWidgets.mockReturnValue(pendingWidgets);
  reload$.next();
  expect(shownPage?.status).toBe('ready');
  expect(shown?.widgets).toEqual([widget]);
  pendingBoard.next(board);
  pendingWidgets.next([{ ...widget, title: 'Updated' }]);
  expect(shown?.widgets[0].title).toBe('Updated');
  context$.next(convertToParamMap({ boardId: 'one' })); // Account changes also emit a fresh context.
  expect(shownPage?.status).toBe('loading');
  expect(shown?.widgets).toEqual([]);
  expect(pendingWidgets.observed).toBe(false);
  page.unsubscribe(); widgets.unsubscribe();
  expect(pendingBoard.observed).toBe(false);
});

it.each([[404, 'missing'], [403, 'denied'], [401, 'denied'], [500, 'error'], [0, 'error']])(
  'distinguishes board failures (%s) and allows retry', (status, expected) => {
    const { pageState$, resolveBoard, reload$ } = setup();
    resolveBoard.mockReturnValue(throwError(() => ({ status })));
    let shown: BoardPageState | undefined;
    const subscription = pageState$.subscribe(state => shown = state);
    expect(shown?.status).toBe(expected);
    resolveBoard.mockReturnValue(of(board)); reload$.next();
    expect(shown).toEqual({ status: 'ready', board });
    subscription.unsubscribe();
  }
);

it.each([500, 403])('shows a widget failure instead of a successful empty board (%s)', status => {
  const { pageState$ } = setup();
  const onAccessDenied = vi.fn();
  let shown: WidgetLoadState | undefined;
  const subscription = createWidgetsStream({ pageState$, onAccessDenied,
    loadWidgets: () => throwError(() => ({ status })) }).subscribe(state => shown = state);
  expect(shown).toEqual({ status: 'error', widgets: [] });
  expect(onAccessDenied).toHaveBeenCalledTimes(status === 403 ? 1 : 0);
  subscription.unsubscribe();
});
