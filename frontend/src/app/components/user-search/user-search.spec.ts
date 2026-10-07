import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { vi } from 'vitest';
import { UserSearchComponent } from './user-search';

describe('Username search', () => {
  function setup() {
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] });
    const fixture = TestBed.createComponent(UserSearchComponent);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance, http: TestBed.inject(HttpTestingController) };
  }
  afterEach(() => { vi.useRealTimers(); });

  it('waits for two characters and debounces typing', async () => {
    vi.useFakeTimers();
    const { component, http } = setup();
    component.setQuery('@e');
    await vi.advanceTimersByTimeAsync(350);
    http.expectNone(req => req.url === '/api/search/users');
    component.setQuery('@EM');
    await vi.advanceTimersByTimeAsync(150);
    component.setQuery('@EMMA');
    await vi.advanceTimersByTimeAsync(299);
    http.expectNone(req => req.url === '/api/search/users');
    await vi.advanceTimersByTimeAsync(1);
    const req = http.expectOne('/api/search/users?q=emma');
    req.flush([{ username: 'emma', displayName: 'Emma' }]);
    expect(component.state.results[0].username).toBe('emma');
    http.verify();
  });

  it('explains the query length limit without sending an invalid request', async () => {
    vi.useFakeTimers();
    const { fixture, component, http } = setup();
    component.setQuery('a'.repeat(65));
    await vi.advanceTimersByTimeAsync(350);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Use at most 64 username characters');
    http.expectNone(req => req.url === '/api/search/users');
  });

  it('cancels stale requests immediately, including when clearing the input', async () => {
    vi.useFakeTimers();
    const { component, http } = setup();
    component.setQuery('em'); await vi.advanceTimersByTimeAsync(300);
    const old = http.expectOne('/api/search/users?q=em');
    component.setQuery('nori');
    expect(old.cancelled).toBe(true);
    await vi.advanceTimersByTimeAsync(300);
    const next = http.expectOne('/api/search/users?q=nori');
    component.setQuery('');
    expect(next.cancelled).toBe(true);
    expect(component.state.status).toBe('idle');
    expect(component.state.results).toEqual([]);
    http.verify();
  });

  it('closes on Escape from the search input and cancels an outstanding request', async () => {
    vi.useFakeTimers();
    const { fixture, component, http } = setup();
    const dialog = fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;
    // jsdom does not implement native dialog closing/focus restoration.
    dialog.setAttribute('open', '');
    dialog.close = () => dialog.removeAttribute('open');
    component.setQuery('emma'); await vi.advanceTimersByTimeAsync(300);
    const request = http.expectOne('/api/search/users?q=emma');
    const escape = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    fixture.nativeElement.querySelector('input').dispatchEvent(escape);
    expect(escape.defaultPrevented).toBe(true);
    expect(dialog.hasAttribute('open')).toBe(false);
    expect(component.query).toBe('');
    expect(request.cancelled).toBe(true);
    http.verify();
  });

  it('distinguishes empty results from errors and supports retry', async () => {
    vi.useFakeTimers();
    const { fixture, component, http } = setup();
    component.setQuery('emma'); await vi.advanceTimersByTimeAsync(300);
    http.expectOne('/api/search/users?q=emma').flush('offline', { status: 503, statusText: 'Unavailable' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Search is unavailable');
    component.retry(); await vi.advanceTimersByTimeAsync(300);
    http.expectOne('/api/search/users?q=emma').flush([]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No users found');
    component.setQuery('nori'); await vi.advanceTimersByTimeAsync(300);
    http.expectOne('/api/search/users?q=nori').flush([{ username: 'nori', displayName: 'Nori' }]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('a').getAttribute('href')).toBe('/nori');
    http.verify();
  });
});
