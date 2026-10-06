import { finalize } from 'rxjs';
import type { BoardService } from '../../services/board.service';
import type { UpsertWidgetRequest } from '../../models/widget';
import { getApiErrorMessage } from '../../utils/api-error.util';
import type { WidgetDraft } from './board-page.widget-edit';

export function hasDraftChangedByOriginal(
  draft: WidgetDraft,
  originalWidgetDrafts: Map<number, WidgetDraft>
): boolean {
  if (typeof draft.id !== 'number') {
    return true;
  }

  const original = originalWidgetDrafts.get(draft.id);
  if (!original) {
    return true;
  }

  return (
    draft.type !== original.type ||
    draft.title !== original.title ||
    draft.layout !== original.layout ||
    draft.enabled !== original.enabled ||
    draft.order !== original.order ||
    draft.embedUrl !== original.embedUrl ||
    draft.linkUrl !== original.linkUrl ||
    draft.placesText !== original.placesText
  );
}

export function runDoneWidgetEdit(params: {
  version: number | null;
  activeBoardUrl: string;
  editingBoardUrl: string;
  widgetDrafts: WidgetDraft[];
  boardDraftName: string;
  boardDraftHeadline: string;
  originalBoardName: string;
  originalBoardHeadline: string;
  originalWidgetDrafts: Map<number, WidgetDraft>;
  boardService: BoardService;
  withNormalizedOrder: (drafts: WidgetDraft[]) => WidgetDraft[];
  buildWidgetPayload: (draft: WidgetDraft) => UpsertWidgetRequest;
  getWidgetValidationMessage: (draft: WidgetDraft) => string;
  setWidgetDrafts: (drafts: WidgetDraft[]) => void;
  resetDraftValidationErrors: () => void;
  setDraftValidationError: (draft: WidgetDraft, message: string) => void;
  setNewWidgetValidationError: (message: string) => void;
  setWidgetSaveError: (message: string) => void;
  setWidgetSaving: (saving: boolean) => void;
  onSaved: () => void;
}): void {
  const saveBoardUrl = params.activeBoardUrl.trim();
  if (!saveBoardUrl) {
    params.setWidgetSaveError('Board context changed. Reload and try again.');
    return;
  }

  if (params.editingBoardUrl && params.editingBoardUrl !== saveBoardUrl) {
    params.setWidgetSaveError('Board changed while editing. Re-open edit and try again.');
    return;
  }

  const normalizedDrafts = params.withNormalizedOrder([...params.widgetDrafts]);
  params.setWidgetDrafts(normalizedDrafts);
  params.resetDraftValidationErrors();
  params.setNewWidgetValidationError('');

  const trimmedName = params.boardDraftName.trim();
  const trimmedHeadline = params.boardDraftHeadline.trim();

  for (const draft of normalizedDrafts) {
    if (typeof draft.id === 'number' && !hasDraftChangedByOriginal(draft, params.originalWidgetDrafts)) {
      continue;
    }

    const validationMessage = params.getWidgetValidationMessage(draft);
    if (validationMessage) {
      params.setDraftValidationError(draft, validationMessage);
      params.setWidgetSaveError('Fix highlighted widget fields before saving.');
      return;
    }
  }

  const widgetPayload = {
    widgets: normalizedDrafts.map((draft) => ({
      id: typeof draft.id === 'number' ? draft.id : undefined,
      ...params.buildWidgetPayload(draft),
    })),
  };

  if (!trimmedName || !trimmedHeadline) {
    params.setWidgetSaveError('Title and description are required.');
    return;
  }
  if (trimmedName.length > 255 || trimmedHeadline.length > 255) {
    params.setWidgetSaveError('Title and description must be at most 255 characters.');
    return;
  }
  if (params.version === null) {
    params.setWidgetSaveError('Unable to determine board version. Cancel and reopen the editor.');
    return;
  }

  params.setWidgetSaving(true);
  params.setWidgetSaveError('');

  params.boardService.saveEditor(saveBoardUrl, {
    version: params.version,
    name: trimmedName,
    headline: trimmedHeadline,
    widgets: widgetPayload.widgets,
  })
    .pipe(finalize(() => params.setWidgetSaving(false)))
    .subscribe({
      next: () => {
        params.onSaved();
      },
      error: (error) => {
        params.setWidgetSaveError(getApiErrorMessage(error, 'Unable to save widget changes.'));
      },
    });
}
