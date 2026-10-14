import { TestBed } from '@angular/core/testing';
import { DomSanitizer } from '@angular/platform-browser';
import { vi } from 'vitest';
import { EmbedWidgetComponent } from './embed-widget';

describe('Embed widget rendering', () => {
  it('reuses the trusted URL and iframe across unrelated edits, but updates changed URLs', () => {
    const fixture = TestBed.createComponent(EmbedWidgetComponent);
    const trust = vi.spyOn(TestBed.inject(DomSanitizer), 'bypassSecurityTrustResourceUrl');
    const widget = { id: 1, type: 'embed', title: 'Video', layout: 'span-1', enabled: true, order: 0,
      config: { embedUrl: 'https://example.com/first' } };
    fixture.componentRef.setInput('widget', widget);
    fixture.detectChanges();
    const frame = fixture.nativeElement.querySelector('iframe');
    const trusted = fixture.componentInstance.safeEmbedUrl;
    fixture.componentRef.setInput('widget', { ...widget, title: 'Renamed', order: 2 });
    fixture.detectChanges();
    expect(fixture.componentInstance.safeEmbedUrl).toBe(trusted);
    expect(fixture.nativeElement.querySelector('iframe')).toBe(frame);
    expect(trust).toHaveBeenCalledTimes(1);
    fixture.componentRef.setInput('widget', { ...widget, config: { embedUrl: 'https://example.com/second' } });
    fixture.detectChanges();
    expect(frame.src).toBe('https://example.com/second');
    expect(trust).toHaveBeenCalledTimes(2);
    fixture.componentRef.setInput('widget', { ...widget, config: {} });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('iframe')).toBeNull();
    expect(fixture.componentInstance.safeEmbedUrl).toBeNull();
  });
});
