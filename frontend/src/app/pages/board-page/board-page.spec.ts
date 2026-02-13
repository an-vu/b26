import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { defer, of, throwError } from 'rxjs';

import { BoardPageComponent } from './board-page';
import { BoardService } from '../../services/board.service';
import type { Widget } from '../../models/widget';

describe('BoardPageComponent', () => {
  let component: BoardPageComponent;
  let fixture: ComponentFixture<BoardPageComponent>;
  let boardServiceStub: {
    getBoard: BoardService['getBoard'];
    updateBoard: BoardService['updateBoard'];
    updateBoardMeta: BoardService['updateBoardMeta'];
    getWidgets: BoardService['getWidgets'];
    createWidget: BoardService['createWidget'];
    updateWidget: BoardService['updateWidget'];
    deleteWidget: BoardService['deleteWidget'];
  };
  let updateWidgetCalls: Array<{ widgetId: number; order: number }> = [];

  const routeStub = {
    paramMap: of(convertToParamMap({ boardId: 'default' })),
  };

  beforeEach(async () => {
    updateWidgetCalls = [];
    boardServiceStub = {
      getBoard: () =>
        of({
          id: 'default',
          name: 'An Vu',
          headline: 'Software Engineer',
        }),
      updateBoard: () =>
        of({
          id: 'default',
          name: 'An Vu',
          headline: 'Software Engineer',
        }),
      updateBoardMeta: () =>
        of({
          id: 'default',
          name: 'An Vu',
          headline: 'Software Engineer',
        }),
      getWidgets: () => of([]),
      createWidget: () =>
        of({
          id: 1,
          type: 'embed',
          title: 'Now Playing',
          layout: 'span-1',
          config: { embedUrl: 'https://example.com/embed' },
          enabled: true,
          order: 0,
        }),
      updateWidget: (_boardId: string, widgetId: number, payload) => {
        updateWidgetCalls.push({ widgetId, order: payload.order });
        return of({
          id: widgetId,
          type: payload.type,
          title: payload.title,
          layout: payload.layout,
          config: payload.config,
          enabled: payload.enabled,
          order: payload.order,
        } as Widget);
      },
      deleteWidget: () => of(undefined),
    };

    await TestBed.configureTestingModule({
      imports: [BoardPageComponent],
      providers: [
        { provide: BoardService, useValue: boardServiceStub },
        { provide: ActivatedRoute, useValue: routeStub },
      ],
    }).compileComponents();
  });

  it('should create', () => {
    fixture = TestBed.createComponent(BoardPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should render loading state before board resolves', () => {
    boardServiceStub.getBoard = () =>
      defer(() =>
        Promise.resolve({
          id: 'default',
          name: 'An Vu',
          headline: 'Software Engineer',
        })
      );

    fixture = TestBed.createComponent(BoardPageComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Loading...');
  });

  it('should render missing state when board request fails', () => {
    boardServiceStub.getBoard = () => throwError(() => new Error('boom'));

    fixture = TestBed.createComponent(BoardPageComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Board not found.');
  });

  it('should normalize local order when moving widgets down', () => {
    fixture = TestBed.createComponent(BoardPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const widgets: Widget[] = [
      {
        id: 1,
        type: 'embed',
        title: 'One',
        layout: 'span-1',
        config: { embedUrl: 'https://example.com/1' },
        enabled: true,
        order: 0,
      },
      {
        id: 2,
        type: 'embed',
        title: 'Two',
        layout: 'span-1',
        config: { embedUrl: 'https://example.com/2' },
        enabled: true,
        order: 1,
      },
    ];

    component.startWidgetEdit(
      {
        id: 'default',
        name: 'An Vu',
        headline: 'Software Engineer',
      },
      widgets
    );
    const firstDraft = component.widgetDrafts[0];
    component.moveWidget(firstDraft, 1);

    expect(component.widgetDrafts.map((draft) => draft.id)).toEqual([2, 1]);
    expect(component.widgetDrafts.map((draft) => draft.order)).toEqual([0, 1]);
    expect(updateWidgetCalls.length).toBe(0);
  });

  it('should sort widget drafts by order when entering edit mode', () => {
    fixture = TestBed.createComponent(BoardPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const widgets: Widget[] = [
      {
        id: 10,
        type: 'map',
        title: 'Late',
        layout: 'span-1',
        config: { places: ['A'] },
        enabled: true,
        order: 5,
      },
      {
        id: 11,
        type: 'embed',
        title: 'Early',
        layout: 'span-1',
        config: { embedUrl: 'https://example.com' },
        enabled: true,
        order: 0,
      },
    ];

    component.startWidgetEdit(
      {
        id: 'default',
        name: 'An Vu',
        headline: 'Software Engineer',
      },
      widgets
    );
    expect(component.widgetDrafts.map((draft) => draft.id)).toEqual([11, 10]);
    expect(component.widgetDrafts.map((draft) => draft.order)).toEqual([0, 5]);
  });
});
