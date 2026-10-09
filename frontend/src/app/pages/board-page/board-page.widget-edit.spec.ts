import { expect, it } from 'vitest';
import { buildWidgetPayload, resetWidgetConfigForType, toWidgetDraft } from './board-page.widget-edit';

it('preserves link images and descriptions through editing while applying URL edits', () => {
  const config = { url: 'https://example.com/', imageUrl: '/photo.jpg', description: 'A favorite place' };
  const draft = toWidgetDraft({ id: 1, type: 'link', title: 'Trip', layout: 'span-1', config, enabled: true, order: 0 });
  expect(buildWidgetPayload(draft).config).toEqual(config);
  draft.linkUrl = 'https://example.org/';
  expect(buildWidgetPayload(draft).config).toEqual({ ...config, url: 'https://example.org/' });
  draft.linkUrl = '';
  expect(buildWidgetPayload(draft).config).toEqual({ imageUrl: '/photo.jpg', description: 'A favorite place' });
  draft.type = 'map'; resetWidgetConfigForType(draft);
  expect(buildWidgetPayload(draft).config).toEqual({ places: [] });
});
