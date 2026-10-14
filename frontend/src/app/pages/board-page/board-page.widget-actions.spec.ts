import { WidgetPreviewCache } from './board-page.widget-actions';
import { createEmptyWidgetDraft } from './board-page.widget-edit';

describe('Widget draft previews', () => {
  it('keeps unchanged previews stable while reflecting edits and cancellation', () => {
    const cache = new WidgetPreviewCache();
    const draft = { ...createEmptyWidgetDraft(), embedUrl: 'example.com/first' };
    const original = { ...draft };
    const first = cache.get(draft, 0);
    expect(cache.get(draft, 0)).toBe(first);
    draft.embedUrl = 'example.com/second';
    const edited = cache.get(draft, 0);
    expect(edited).not.toBe(first);
    expect(edited.config['embedUrl']).toBe('https://example.com/second');
    expect(cache.get(draft, 0)).toBe(edited);
    Object.assign(draft, original);
    expect(cache.get(draft, 0).config).toEqual(first.config);
  });

  it('updates identity, layout and config when a draft is moved or replaced', () => {
    const cache = new WidgetPreviewCache();
    const draft = createEmptyWidgetDraft();
    expect(cache.get(draft, 0).id).toBe(-1);
    expect(cache.get(draft, 2).id).toBe(-3);
    draft.id = 42;
    draft.layout = 'span-2x2';
    draft.config = { description: 'New description' };
    expect(cache.get(draft, 2)).toMatchObject({ id: 42, layout: 'span-2x2', config: draft.config });
    expect(cache.get({ ...draft, title: 'Updated' }, 2).title).toBe('Updated');
  });
});
