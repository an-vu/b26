import type { Widget } from '../../models/widget';
import { buildWidgetPayload, type WidgetDraft } from './board-page.widget-edit';

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

const previewFields: readonly (keyof WidgetDraft)[] = [
  'id', 'type', 'title', 'layout', 'enabled', 'order',
  'embedUrl', 'linkUrl', 'placesText', 'config',
];

/** Keep child inputs stable between edits. Draft config metadata is replaced, not mutated. */
export class WidgetPreviewCache {
  private readonly entries = new WeakMap<WidgetDraft, { index: number; snapshot: WidgetDraft; widget: Widget }>();

  get(draft: WidgetDraft, index: number): Widget {
    const cached = this.entries.get(draft);
    if (cached?.index === index && previewFields.every(field => cached.snapshot[field] === draft[field])) {
      return cached.widget;
    }
    const widget: Widget = {
      id: draft.id ?? -(index + 1),
      type: draft.type,
      title: draft.title,
      layout: draft.layout,
      config: buildWidgetPayload(draft).config,
      enabled: draft.enabled,
      order: draft.order,
    };
    this.entries.set(draft, { index, snapshot: { ...draft }, widget });
    return widget;
  }
}
