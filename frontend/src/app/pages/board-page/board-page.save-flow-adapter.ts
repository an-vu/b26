import type { BoardService } from '../../services/board.service';
import type { WidgetDraft } from './board-page.widget-edit';
import type { UpsertWidgetRequest } from '../../models/widget';
import { runDoneWidgetEdit } from './board-page.save-flow';

export function runDoneWidgetEditAdapter(params: {
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
  applyWidgetDrafts: (drafts: WidgetDraft[]) => void;
  resetDraftValidationErrors: () => void;
  setDraftValidationError: (draft: WidgetDraft, message: string) => void;
  setNewWidgetValidationError: (message: string) => void;
  setWidgetSaveError: (message: string) => void;
  setWidgetSaving: (saving: boolean) => void;
  onSaved: () => void;
}): void {
  runDoneWidgetEdit({
    activeBoardUrl: params.activeBoardUrl,
    editingBoardUrl: params.editingBoardUrl,
    widgetDrafts: params.widgetDrafts,
    boardDraftName: params.boardDraftName,
    boardDraftHeadline: params.boardDraftHeadline,
    originalBoardName: params.originalBoardName,
    originalBoardHeadline: params.originalBoardHeadline,
    originalWidgetDrafts: params.originalWidgetDrafts,
    boardService: params.boardService,
    withNormalizedOrder: params.withNormalizedOrder,
    buildWidgetPayload: params.buildWidgetPayload,
    getWidgetValidationMessage: params.getWidgetValidationMessage,
    setWidgetDrafts: params.applyWidgetDrafts,
    resetDraftValidationErrors: params.resetDraftValidationErrors,
    setDraftValidationError: params.setDraftValidationError,
    setNewWidgetValidationError: params.setNewWidgetValidationError,
    setWidgetSaveError: params.setWidgetSaveError,
    setWidgetSaving: params.setWidgetSaving,
    onSaved: params.onSaved,
  });
}
