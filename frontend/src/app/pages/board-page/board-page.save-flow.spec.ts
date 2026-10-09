import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { runDoneWidgetEdit } from './board-page.save-flow';
import { buildWidgetPayload, createEmptyWidgetDraft, getWidgetValidationMessage, withNormalizedOrder } from './board-page.widget-edit';
import type { BoardService } from '../../services/board.service';

describe('Atomic board saving', () => {
  function setup() {
    const saveEditor = vi.fn(() => of({}));
    const draft = { ...createEmptyWidgetDraft(), type: 'link' as const, title: 'Link', linkUrl: 'https://example.com' };
    const params: Parameters<typeof runDoneWidgetEdit>[0] = {
      version: 7, activeBoardUrl: 'my-board', editingBoardUrl: 'my-board',
      widgetDrafts: [draft], boardDraftName: 'New title', boardDraftHeadline: 'New description',
      originalWidgetDrafts: new Map(),
      boardService: { saveEditor } as unknown as BoardService,
      withNormalizedOrder, buildWidgetPayload, getWidgetValidationMessage,
      setWidgetDrafts: vi.fn(), resetDraftValidationErrors: vi.fn(), setDraftValidationError: vi.fn(),
      setWidgetSaveError: vi.fn(), setWidgetSaving: vi.fn(), onSaved: vi.fn(),
    };
    return { params, saveEditor };
  }

  it('sends metadata, widgets, and the loaded revision in one request', () => {
    const { params, saveEditor } = setup();
    runDoneWidgetEdit(params);
    expect(saveEditor).toHaveBeenCalledExactlyOnceWith('my-board', expect.objectContaining({
      version: 7, name: 'New title', headline: 'New description', widgets: [expect.objectContaining({ type: 'link', order: 0 })],
    }));
    expect(params.onSaved).toHaveBeenCalledOnce();
  });

  it('saves the remaining widgets as the full list after a deletion', () => {
    const { params, saveEditor } = setup();
    params.originalWidgetDrafts = new Map([[42, { ...params.widgetDrafts[0], id: 42 }]]);
    params.widgetDrafts = [];
    runDoneWidgetEdit(params);
    expect(saveEditor).toHaveBeenCalledWith('my-board', expect.objectContaining({ widgets: [] }));
    expect(params.onSaved).toHaveBeenCalledOnce();
  });

  it('rejects blank metadata instead of silently skipping it', () => {
    const { params, saveEditor } = setup();
    params.boardDraftName = ' ';
    runDoneWidgetEdit(params);
    expect(saveEditor).not.toHaveBeenCalled();
    expect(params.setWidgetSaveError).toHaveBeenCalledWith('Title and description are required.');
  });

  it('preserves drafts and displays a conflict without claiming success', () => {
    const { params, saveEditor } = setup();
    saveEditor.mockReturnValue(throwError(() => ({ status: 409, error: { message: 'Board changed in another tab.' } })));
    runDoneWidgetEdit(params);
    expect(params.onSaved).not.toHaveBeenCalled();
    expect(params.widgetDrafts[0].title).toBe('Link');
    expect(params.setWidgetSaveError).toHaveBeenCalledWith('Board changed in another tab.');
    expect(params.setWidgetSaving).toHaveBeenLastCalledWith(false);
  });

  it('highlights invalid URLs without sending a destructive empty config', () => {
    const { params, saveEditor } = setup();
    params.widgetDrafts[0].linkUrl = 'javascript:alert(1)';
    runDoneWidgetEdit(params);
    expect(saveEditor).not.toHaveBeenCalled();
    expect(params.setDraftValidationError).toHaveBeenCalled();
  });
  it('saves a website and rejects unsafe protocols', () => {
    const { params, saveEditor } = setup();
    params.boardDraftWebsite = 'https://example.com/me';
    runDoneWidgetEdit(params);
    expect(saveEditor).toHaveBeenLastCalledWith('my-board', expect.objectContaining({ website: 'https://example.com/me' }));
    saveEditor.mockClear();
    params.boardDraftWebsite = 'javascript:alert(1)';
    runDoneWidgetEdit(params);
    expect(saveEditor).not.toHaveBeenCalled();
  });

});
