import { convertToParamMap } from '@angular/router';
import { BehaviorSubject, of, Subject } from 'rxjs';
import type { Widget } from '../../models/widget';
import { createWidgetsStream } from './board-page.streams';

it('retains widgets during refresh but clears them immediately on a new route or account', () => {
  const reload$ = new Subject<void>();
  const context$ = new BehaviorSubject(convertToParamMap({ boardId: 'one' }));
  const first: Widget = { id: 1, type: 'link', title: 'First', layout: 'span-1', config: {}, enabled: true, order: 0 };
  const pending = new Subject<Widget[]>();
  const loadWidgets = vi.fn(() => of([first]));
  let shown: Widget[] = [];
  const subscription = createWidgetsStream({
    reload$, routeParamMap$: context$, resolveBoardId$: slug => of(slug!),
    loadWidgets, onBoardResolved: () => {},
  }).subscribe(widgets => shown = widgets);
  loadWidgets.mockReturnValue(pending);
  reload$.next();
  expect(shown).toEqual([first]);
  pending.next([{ ...first, title: 'Updated' }]);
  expect(shown[0].title).toBe('Updated');
  // Account changes also emit a fresh context, even when the route stays the same.
  context$.next(convertToParamMap({ boardId: 'one' }));
  expect(shown).toEqual([]);
  subscription.unsubscribe();
  expect(pending.observed).toBe(false);
});
