import type { Widget } from '../../models/widget';
import type { WidgetDraft } from './board-page.widget-edit';

export function applyDeleteWidgetAction(params: {
  draft: WidgetDraft;
  activeWidgetSettingsId: number | null;
  widgetDrafts: WidgetDraft[];
  deletedWidgetIds: number[];
  withNormalizedOrder: (drafts: WidgetDraft[]) => WidgetDraft[];
}): {
  activeWidgetSettingsId: number | null;
  widgetDrafts: WidgetDraft[];
  deletedWidgetIds: number[];
} {
  const nextActiveWidgetSettingsId =
    params.draft.id && params.activeWidgetSettingsId === params.draft.id
      ? null
      : params.activeWidgetSettingsId;

  if (!params.draft.id) {
    return {
      activeWidgetSettingsId: nextActiveWidgetSettingsId,
      widgetDrafts: params.withNormalizedOrder(params.widgetDrafts.filter((item) => item !== params.draft)),
      deletedWidgetIds: params.deletedWidgetIds,
    };
  }

  return {
    activeWidgetSettingsId: nextActiveWidgetSettingsId,
    widgetDrafts: params.withNormalizedOrder(params.widgetDrafts.filter((item) => item !== params.draft)),
    deletedWidgetIds: [...params.deletedWidgetIds, params.draft.id],
  };
}

export function applyAddNewWidgetAction(params: {
  newWidgetDraft: WidgetDraft;
  widgetDrafts: WidgetDraft[];
  getWidgetValidationMessage: (draft: WidgetDraft) => string;
  normalizeHttpUrl: (raw: string) => string | null;
  createEmptyWidgetDraft: () => WidgetDraft;
}):
  | { kind: 'invalid'; newWidgetValidationError: string }
  | {
      kind: 'ok';
      widgetDrafts: WidgetDraft[];
      newWidgetDraft: WidgetDraft;
      widgetSaveError: string;
      newWidgetValidationError: string;
      isAddWidgetExpanded: boolean;
    } {
  const validationMessage = params.getWidgetValidationMessage(params.newWidgetDraft);
  if (validationMessage) {
    return {
      kind: 'invalid',
      newWidgetValidationError: validationMessage,
    };
  }

  const draft: WidgetDraft = {
    ...params.newWidgetDraft,
    id: undefined,
    order: params.widgetDrafts.length,
    embedUrl:
      params.normalizeHttpUrl(params.newWidgetDraft.embedUrl) ??
      params.newWidgetDraft.embedUrl,
    linkUrl:
      params.normalizeHttpUrl(params.newWidgetDraft.linkUrl) ??
      params.newWidgetDraft.linkUrl,
  };

  return {
    kind: 'ok',
    widgetDrafts: [...params.widgetDrafts, draft],
    newWidgetDraft: params.createEmptyWidgetDraft(),
    widgetSaveError: '',
    newWidgetValidationError: '',
    isAddWidgetExpanded: false,
  };
}

export function applyMoveWidgetAction(params: {
  draft: WidgetDraft;
  direction: -1 | 1;
  isWidgetSaving: boolean;
  widgetDrafts: WidgetDraft[];
  withNormalizedOrder: (drafts: WidgetDraft[]) => WidgetDraft[];
}): WidgetDraft[] {
  if (params.isWidgetSaving) {
    return params.widgetDrafts;
  }

  const currentIndex = params.widgetDrafts.indexOf(params.draft);
  if (currentIndex < 0) {
    return params.widgetDrafts;
  }

  const targetIndex = currentIndex + params.direction;
  if (targetIndex < 0 || targetIndex >= params.widgetDrafts.length) {
    return params.widgetDrafts;
  }

  const nextDrafts = [...params.widgetDrafts];
  [nextDrafts[currentIndex], nextDrafts[targetIndex]] = [nextDrafts[targetIndex], nextDrafts[currentIndex]];
  return params.withNormalizedOrder(nextDrafts);
}

export function applyOpenWidgetSettingsAction(params: {
  draft: WidgetDraft;
  isWidgetSaving: boolean;
}): number | null {
  if (params.isWidgetSaving || !params.draft.id) {
    return null;
  }
  return params.draft.id;
}

export function isWidgetSettingsOpenAction(params: {
  draft: WidgetDraft;
  activeWidgetSettingsId: number | null;
}): boolean {
  return !!params.draft.id && params.activeWidgetSettingsId === params.draft.id;
}

export function buildWidgetPreviewFromDraft(params: {
  draft: WidgetDraft;
  index: number;
  buildWidgetPayload: (draft: WidgetDraft) => { config: Record<string, unknown> };
}): Widget {
  const payload = params.buildWidgetPayload(params.draft);
  return {
    id: params.draft.id ?? -(params.index + 1),
    type: params.draft.type,
    title: params.draft.title,
    layout: params.draft.layout,
    config: payload.config ?? {},
    enabled: params.draft.enabled,
    order: params.draft.order,
  };
}
