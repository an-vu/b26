import { By } from '@angular/platform-browser';
import { WidgetHostComponent } from '../widget-host/widget-host';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { LinkWidgetComponent } from './link-widget';
import { vi } from 'vitest';

describe('Instagram Social widget', () => {
  beforeEach(() => { vi.stubGlobal('URL', URL); URL.createObjectURL = vi.fn(() => 'blob:test-image'); URL.revokeObjectURL = vi.fn(); vi.useFakeTimers(); TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] }); });
  afterEach(() => { TestBed.inject(HttpTestingController).verify(); TestBed.resetTestingModule(); vi.useRealTimers(); });
  it.each(['span-1', 'span-2x2'])('displays the saved profile count and the photo layout for %s', (layout) => {
    const fixture = TestBed.createComponent(LinkWidgetComponent);
    fixture.componentRef.setInput('boardId', 'board-id');
    fixture.componentRef.setInput('widget', { id: 42, type: 'link', title: '', layout, config: { url: 'instagram.com/instagram' }, enabled: true, order: 0 });
    fixture.detectChanges(); vi.advanceTimersByTime(0);
    TestBed.inject(HttpTestingController).expectOne('/api/board/board-id/widgets/42/instagram?expectedUsername=instagram').flush({ status: 'ready', followersCount: 12345,
      posts: Array.from({ length: 9 }, (_, i) => ({ url: `https://www.instagram.com/p/${i}/`, imageUrl: `https://scontent.cdninstagram.com/${i}.jpg`, timestamp: '2026-10-01T00:00:00Z' })) });
    const imageRequests = TestBed.inject(HttpTestingController).match(request => request.url.includes('/images/'));
    expect(imageRequests).toHaveLength(layout === 'span-1' ? 1 : 9);
    imageRequests.forEach(request => request.flush(new Blob(['image'], { type: 'image/jpeg' })));
    fixture.detectChanges();
    expect(fixture.componentInstance.followerCount).toBe('12.3K');
    expect(fixture.nativeElement.querySelectorAll('.instagram-posts a')).toHaveLength(layout === 'span-1' ? 0 : 9);
    const background = fixture.nativeElement.querySelector('.instagram-background');
    if (layout === 'span-1') expect(background.src).toBe('blob:test-image');
    else expect(background).toBeNull();
    vi.advanceTimersByTime(6000);
    TestBed.inject(HttpTestingController).expectNone(request => request.url.includes('/instagram'));
  });
  it('does not fetch from an unsaved picker preview', () => {
    const fixture = TestBed.createComponent(LinkWidgetComponent);
    fixture.componentRef.setInput('widget', { id: -1, type: 'link', config: { url: 'instagram.com/instagram' } });
    fixture.detectChanges(); vi.advanceTimersByTime(6000);
    TestBed.inject(HttpTestingController).expectNone(request => request.url.includes('/instagram'));
    expect(fixture.componentInstance.followerCount).toBe('—');
  });
});

describe('Link widget tracking', () => {
  beforeEach(() => TestBed.configureTestingModule({
    imports: [WidgetHostComponent], providers: [provideHttpClient(), provideHttpClientTesting()],
  }));

  it('records the board and widget only when a real board link is clicked', () => {
    const fixture = TestBed.createComponent(WidgetHostComponent);
    fixture.componentRef.setInput('widget', {
      id: 42, type: 'link', title: 'Link', layout: 'span-1', enabled: true, order: 0,
      config: { url: 'https://example.com' },
    });
    fixture.componentRef.setInput('boardId', 'stable-board-id');
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http.expectNone('/api/insights/widgets/42/click');
    fixture.debugElement.query(By.css('a.link')).triggerEventHandler('click');
    const request = http.expectOne('/api/insights/widgets/42/click');
    expect(request.request.body).toEqual({ boardId: 'stable-board-id' });
    request.flush({}, { status: 429, statusText: 'Too Many Requests' });
    expect(fixture.nativeElement.querySelector('a').href).toBe('https://example.com/');
    http.verify();

    fixture.componentRef.setInput('previewMode', true);
    fixture.detectChanges();
    fixture.debugElement.query(By.css('a.link')).triggerEventHandler('click');
    http.expectNone('/api/insights/widgets/42/click');
    fixture.componentRef.setInput('previewMode', false);
    fixture.componentRef.setInput('boardId', undefined);
    fixture.detectChanges();
    fixture.debugElement.query(By.css('a.link')).triggerEventHandler('click');
    http.expectNone('/api/insights/widgets/42/click');
  });
});
