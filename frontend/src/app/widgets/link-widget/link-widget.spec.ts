import { By } from '@angular/platform-browser';
import { WidgetHostComponent } from '../widget-host/widget-host';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { LinkWidgetComponent } from './link-widget';
import { vi } from 'vitest';
import { BehaviorSubject } from 'rxjs';
import { PageActivityService } from '../../services/page-activity.service';

describe('Instagram Social widget', () => {
  let visible: BehaviorSubject<boolean>;
  beforeEach(() => { visible = new BehaviorSubject(true); vi.stubGlobal('URL', URL); URL.createObjectURL = vi.fn(() => 'blob:test-image'); URL.revokeObjectURL = vi.fn(); vi.useFakeTimers(); TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), { provide: PageActivityService, useValue: { visible$: visible } }] }); });
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
  it('keeps loaded photos through unrelated edits and refetches when the photo layout changes', () => {
    const fixture = TestBed.createComponent(LinkWidgetComponent);
    const http = TestBed.inject(HttpTestingController);
    const widget = { id: 42, type: 'link', title: '', layout: 'span-1', enabled: true, order: 0,
      config: { url: 'instagram.com/instagram' } };
    fixture.componentRef.setInput('boardId', 'board-id');
    fixture.componentRef.setInput('widget', widget);
    fixture.detectChanges(); vi.advanceTimersByTime(0);
    const endpoint = '/api/board/board-id/widgets/42/instagram';
    http.expectOne(endpoint + '?expectedUsername=instagram').flush({ status: 'ready', followersCount: 100,
      posts: [{ url: 'https://instagram.com/p/one', imageUrl: '', timestamp: '' }] });
    http.expectOne(endpoint + '/images/0?expectedUsername=instagram').flush(new Blob(['image']));
    const loaded = fixture.componentInstance.instagram;
    fixture.componentRef.setInput('widget', { ...widget, title: 'New title', order: 3 });
    fixture.detectChanges(); vi.advanceTimersByTime(6000);
    http.expectNone(request => request.url.includes('/instagram'));
    expect(fixture.componentInstance.instagram).toBe(loaded);
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();

    fixture.componentRef.setInput('widget', { ...widget, layout: 'span-2x2' });
    fixture.detectChanges(); vi.advanceTimersByTime(0);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test-image');
    http.expectOne(endpoint + '?expectedUsername=instagram').flush({ status: 'ready', followersCount: 100,
      posts: Array.from({ length: 9 }, () => ({ url: '', imageUrl: '', timestamp: '' })) });
    const images = http.match(request => request.url.includes('/images/'));
    expect(images).toHaveLength(9);
    images.forEach(request => request.flush(new Blob(['image'])));
  });

  it('cancels old profile photos and clears private board data when context changes', () => {
    const fixture = TestBed.createComponent(LinkWidgetComponent);
    const http = TestBed.inject(HttpTestingController);
    const widget = { id: 42, type: 'link', title: '', layout: 'span-1', enabled: true, order: 0,
      config: { url: 'instagram.com/instagram' } };
    fixture.componentRef.setInput('boardId', 'first-board');
    fixture.componentRef.setInput('widget', widget);
    fixture.detectChanges(); vi.advanceTimersByTime(0);
    http.expectOne('/api/board/first-board/widgets/42/instagram?expectedUsername=instagram').flush({
      status: 'ready', followersCount: 100, posts: [{ url: '', imageUrl: '', timestamp: '' }],
    });
    const oldImage = http.expectOne('/api/board/first-board/widgets/42/instagram/images/0?expectedUsername=instagram');
    fixture.componentRef.setInput('widget', { ...widget, config: { url: 'instagram.com/newprofile' } });
    fixture.detectChanges(); vi.advanceTimersByTime(0);
    expect(oldImage.cancelled).toBe(true);
    expect(fixture.componentInstance.instagram).toBeUndefined();
    const oldProfile = http.expectOne('/api/board/first-board/widgets/42/instagram?expectedUsername=newprofile');
    fixture.componentRef.setInput('boardId', 'second-board');
    fixture.detectChanges(); vi.advanceTimersByTime(0);
    expect(oldProfile.cancelled).toBe(true);
    const newProfile = http.expectOne('/api/board/second-board/widgets/42/instagram?expectedUsername=newprofile');
    fixture.componentRef.setInput('boardId', undefined);
    fixture.detectChanges(); vi.advanceTimersByTime(6000);
    expect(newProfile.cancelled).toBe(true);
    expect(fixture.componentInstance.instagram).toBeUndefined();
    http.expectNone(request => request.url.includes('/instagram'));
  });
  it('pauses pending polling in hidden tabs, resumes once visible, and stops after ready', () => {
    const fixture = TestBed.createComponent(LinkWidgetComponent);
    const http = TestBed.inject(HttpTestingController);
    fixture.componentRef.setInput('boardId', 'board-id');
    fixture.componentRef.setInput('widget', { id: 42, type: 'link', layout: 'span-1', config: { url: 'instagram.com/instagram' } });
    visible.next(false);
    fixture.detectChanges(); vi.advanceTimersByTime(6000);
    http.expectNone(request => request.url.includes('/instagram'));
    visible.next(true); vi.advanceTimersByTime(0);
    const first = http.expectOne('/api/board/board-id/widgets/42/instagram?expectedUsername=instagram');
    visible.next(false);
    expect(first.cancelled).toBe(true);
    vi.advanceTimersByTime(6000);
    http.expectNone(request => request.url.includes('/instagram'));
    visible.next(true); vi.advanceTimersByTime(0);
    http.expectOne('/api/board/board-id/widgets/42/instagram?expectedUsername=instagram')
      .flush({ status: 'ready', followersCount: 100, posts: [] });
    visible.next(false); visible.next(true); vi.advanceTimersByTime(6000);
    http.expectNone(request => request.url.includes('/instagram'));
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
