import type { Board } from '../../models/board';
import type { Widget } from '../../models/widget';
import type { WidgetDraft } from './board-page.widget-edit';

export type StartWidgetEditState = {
  widgetDrafts: WidgetDraft[];
  originalWidgetDrafts: Map<number, WidgetDraft>;
  boardDraftName: string;
  boardDraftHeadline: string;
  originalBoardName: string;
  originalBoardHeadline: string;
  newWidgetDraft: WidgetDraft;
  deletedWidgetIds: number[];
  widgetSaveError: string;
  newWidgetValidationError: string;
  isAddWidgetExpanded: boolean;
  draftValidationErrors: WeakMap<WidgetDraft, string>;
  activeWidgetSettingsId: number | null;
  editingBoardUrl: string;
  isWidgetEditMode: boolean;
};

export type CancelWidgetEditState = {
  isWidgetEditMode: boolean;
  isWidgetSaving: boolean;
  widgetSaveError: string;
  newWidgetValidationError: string;
  isAddWidgetExpanded: boolean;
  boardDraftName: string;
  boardDraftHeadline: string;
  originalBoardName: string;
  originalBoardHeadline: string;
  widgetDrafts: WidgetDraft[];
  activeWidgetSettingsId: number | null;
  newWidgetDraft: WidgetDraft;
  deletedWidgetIds: number[];
  editingBoardUrl: string;
  originalWidgetDrafts: Map<number, WidgetDraft>;
  draftValidationErrors: WeakMap<WidgetDraft, string>;
};

export function buildStartWidgetEditState(params: {
  board: Board;
  widgets: Widget[];
  activeBoardUrl: string;
  toWidgetDraft: (widget: Widget) => WidgetDraft;
  createEmptyWidgetDraft: () => WidgetDraft;
}): StartWidgetEditState {
  const widgetDrafts = params.widgets
    .map((widget) => params.toWidgetDraft(widget))
    .sort((a, b) => a.order - b.order);

  const originalWidgetDrafts = new Map(
    widgetDrafts
      .filter((draft): draft is WidgetDraft & { id: number } => typeof draft.id === 'number')
      .map((draft) => [draft.id, { ...draft }])
  );

  return {
    widgetDrafts,
    originalWidgetDrafts,
    boardDraftName: params.board.name,
    boardDraftHeadline: params.board.headline,
    originalBoardName: params.board.name,
    originalBoardHeadline: params.board.headline,
    newWidgetDraft: params.createEmptyWidgetDraft(),
    deletedWidgetIds: [],
    widgetSaveError: '',
    newWidgetValidationError: '',
    isAddWidgetExpanded: false,
    draftValidationErrors: new WeakMap<WidgetDraft, string>(),
    activeWidgetSettingsId: null,
    editingBoardUrl: params.activeBoardUrl || params.board.boardUrl,
    isWidgetEditMode: true,
  };
}

export function buildCancelWidgetEditState(createEmptyWidgetDraft: () => WidgetDraft): CancelWidgetEditState {
  return {
    isWidgetEditMode: false,
    isWidgetSaving: false,
    widgetSaveError: '',
    newWidgetValidationError: '',
    isAddWidgetExpanded: false,
    boardDraftName: '',
    boardDraftHeadline: '',
    originalBoardName: '',
    originalBoardHeadline: '',
    widgetDrafts: [],
    activeWidgetSettingsId: null,
    newWidgetDraft: createEmptyWidgetDraft(),
    deletedWidgetIds: [],
    editingBoardUrl: '',
    originalWidgetDrafts: new Map<number, WidgetDraft>(),
    draftValidationErrors: new WeakMap<WidgetDraft, string>(),
  };
}
