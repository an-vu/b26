import { describe, expect, it } from 'vitest';
import {
  buildWidgetPayload,
  hasDraftChanged,
  toWidgetDraft,
  withWidgetType,
} from './board-page.widget-edit';

const config = { url: 'https://example.com/', imageUrl: '/photo.jpg', description: 'A favorite place' };
const widget = { id: 1, type: 'link', title: 'Trip', layout: 'span-1', config, enabled: true, order: 0 };

describe('Widget drafts', () => {
  it('preserves link images and descriptions through editing while applying URL edits', () => {
    const draft = toWidgetDraft(widget);
    expect(buildWidgetPayload(draft).config).toEqual(config);
    draft.linkUrl = 'https://example.org/';
    expect(buildWidgetPayload(draft).config).toEqual({ ...config, url: 'https://example.org/' });
    draft.linkUrl = '';
    expect(buildWidgetPayload(draft).config).toEqual({ imageUrl: '/photo.jpg', description: 'A favorite place' });
    expect(buildWidgetPayload(withWidgetType(draft, 'map')).config).toEqual({ places: [] });
  });

  it('restores the saved config when a type change is reverted, so nothing is lost on save', () => {
    const original = toWidgetDraft(widget);
    const originals = new Map([[1, original]]);
    const reverted = withWidgetType(withWidgetType(original, 'map', original), 'link', original);
    expect(hasDraftChanged(reverted, originals)).toBe(false);
    expect(buildWidgetPayload(reverted).config).toEqual(config);
  });

  it('counts a config-only difference as a change', () => {
    const original = toWidgetDraft(widget);
    const originals = new Map([[1, original]]);
    expect(hasDraftChanged({ ...original, config: {} }, originals)).toBe(true);
    expect(hasDraftChanged({ ...original, config: { ...config } }, originals)).toBe(false);
  });
});
