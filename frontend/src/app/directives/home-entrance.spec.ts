import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { HomeEntranceDirective } from './home-entrance';
import { HOME_FEED_ENTER } from './home-intro-scroll';

@Component({ standalone: true, imports: [HomeEntranceDirective], template: `
  <main class="app-page"><section appHomeEntrance><div class="feed-tile"></div></section></main>
` })
class Host {}

describe('Home feed entrance replay', () => {
  afterEach(() => { TestBed.resetTestingModule(); vi.unstubAllGlobals(); });
  it('replays a previewed row when entering the feed and cancels its previous entrance', () => {
    let intersect: IntersectionObserverCallback;
    const observe = vi.fn(), unobserve = vi.fn();
    vi.stubGlobal('IntersectionObserver', class {
      constructor(callback: IntersectionObserverCallback) { intersect = callback; }
      observe = observe; unobserve = unobserve; disconnect = vi.fn();
    });
    const fixture = TestBed.createComponent(Host);
    const tile = fixture.nativeElement.querySelector('.feed-tile') as HTMLElement;
    const cancel = vi.fn();
    const animate = vi.fn(() => ({ cancel, onfinish: null }));
    Object.defineProperty(tile, 'animate', { value: animate });
    fixture.detectChanges();
    const entries = [{ target: tile, isIntersecting: true, boundingClientRect: { top: 100 } }] as unknown as IntersectionObserverEntry[];
    intersect!(entries, {} as IntersectionObserver);
    expect(animate).toHaveBeenCalledTimes(1);
    fixture.nativeElement.querySelector('main').dispatchEvent(new Event(HOME_FEED_ENTER));
    expect(cancel).toHaveBeenCalledOnce();
    expect(observe).toHaveBeenCalledTimes(2);
    intersect!(entries, {} as IntersectionObserver);
    expect(animate).toHaveBeenCalledTimes(2);
    expect(animate.mock.calls[1]).toEqual([expect.any(Array), expect.objectContaining({ delay: 40 })]);
  });
});
