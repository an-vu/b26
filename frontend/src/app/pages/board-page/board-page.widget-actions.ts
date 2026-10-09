import type { Widget } from '../../models/widget';
import type { WidgetDraft } from './board-page.widget-edit';

export function applyDeleteWidgetAction(params: {
  draft: WidgetDraft;
  activeWidgetSettingsId: number | null;
  widgetDrafts: WidgetDraft[];
  withNormalizedOrder: (drafts: WidgetDraft[]) => WidgetDraft[];
}): {
  activeWidgetSettingsId: number | null;
  widgetDrafts: WidgetDraft[];
} {
  const nextActiveWidgetSettingsId =
    params.draft.id && params.activeWidgetSettingsId === params.draft.id
      ? null
      : params.activeWidgetSettingsId;

  return {
    activeWidgetSettingsId: nextActiveWidgetSettingsId,
    widgetDrafts: params.withNormalizedOrder(params.widgetDrafts.filter((item) => item !== params.draft)),
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
