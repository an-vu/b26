import type { UpsertWidgetRequest, Widget } from '../../models/widget';

export type WidgetType =
  | 'embed'
  | 'map'
  | 'link'
  | 'user-settings'
  | 'admin-settings'
  | 'signin'
  | 'signup';

export type WidgetDraft = {
  id?: number;
  type: WidgetType;
  title: string;
  layout: string;
  enabled: boolean;
  order: number;
  embedUrl: string;
  linkUrl: string;
  placesText: string;
};

export function toWidgetDraft(widget: Widget): WidgetDraft {
  const places = Array.isArray(widget.config['places'])
    ? (widget.config['places'] as unknown[]).filter((place): place is string => typeof place === 'string')
    : [];

  return {
    id: widget.id,
    type: normalizeWidgetType(widget.type),
    title: widget.title,
    layout: widget.layout,
    enabled: widget.enabled,
    order: widget.order,
    embedUrl: typeof widget.config['embedUrl'] === 'string' ? widget.config['embedUrl'] : '',
    linkUrl: typeof widget.config['url'] === 'string' ? widget.config['url'] : '',
    placesText: places.join('\n'),
  };
}

export function createEmptyWidgetDraft(): WidgetDraft {
  return {
    type: 'embed',
    title: '',
    layout: 'span-1',
    enabled: true,
    order: 0,
    embedUrl: '',
    linkUrl: '',
    placesText: '',
  };
}

export function buildWidgetPayload(draft: WidgetDraft): UpsertWidgetRequest {
  const base: Omit<UpsertWidgetRequest, 'config'> = {
    type: draft.type,
    title: draft.title.trim(),
    layout: draft.layout.trim(),
    enabled: draft.enabled,
    order: draft.order,
  };

  if (draft.type === 'embed') {
    const url = normalizeHttpUrl(draft.embedUrl);
    return {
      ...base,
      config: url ? { embedUrl: url } : {},
    };
  }

  if (draft.type === 'link') {
    const url = normalizeHttpUrl(draft.linkUrl);
    return {
      ...base,
      config: url ? { url } : {},
    };
  }

  if (
    draft.type === 'user-settings' ||
    draft.type === 'admin-settings' ||
    draft.type === 'signin' ||
    draft.type === 'signup'
  ) {
    return {
      ...base,
      config: {},
    };
  }

  const places = draft.placesText
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  return {
    ...base,
    config: { places },
  };
}

export function resetWidgetConfigForType(draft: WidgetDraft): void {
  if (draft.type === 'embed') {
    draft.linkUrl = '';
    draft.placesText = '';
    return;
  }

  if (draft.type === 'link') {
    draft.embedUrl = '';
    draft.placesText = '';
    return;
  }

  if (
    draft.type === 'user-settings' ||
    draft.type === 'admin-settings' ||
    draft.type === 'signin' ||
    draft.type === 'signup'
  ) {
    draft.embedUrl = '';
    draft.linkUrl = '';
    draft.placesText = '';
    return;
  }

  draft.embedUrl = '';
  draft.linkUrl = '';
}

export function withNormalizedOrder(drafts: WidgetDraft[]): WidgetDraft[] {
  return drafts.map((draft, index) => ({ ...draft, order: index }));
}

export function getWidgetValidationMessage(draft: WidgetDraft): string {
  if (!draft.layout.trim()) {
    return 'Widget layout is required.';
  }
  return '';
}

export function normalizeWidgetType(type: string): WidgetType {
  if (
    type === 'embed' ||
    type === 'map' ||
    type === 'link' ||
    type === 'user-settings' ||
    type === 'admin-settings' ||
    type === 'signin' ||
    type === 'signup'
  ) {
    return type;
  }
  return 'embed';
}

export function normalizeHttpUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return null;
  }

  const hasScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed);
  const candidate = hasScheme ? trimmed : `https://${trimmed}`;

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}
