import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { WidgetBounceDirective } from './widget-bounce';

@Component({ standalone: true, imports: [WidgetBounceDirective], template: '<main class="page-fixed-scroll"><section appWidgetBounce></section></main>' })
class BounceHost {}

describe('Widget bottom-edge bounce', () => {
  let time: number;
  let next: FrameRequestCallback | undefined;
  let main: HTMLElement;
  let section: HTMLElement;
  beforeEach(() => {
    time = 0;
    next = undefined;
    vi.spyOn(performance, 'now').mockImplementation(() => time);
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { next = callback; return 1; });
    vi.stubGlobal('cancelAnimationFrame', () => { next = undefined; });
    const fixture = TestBed.createComponent(BounceHost);
    fixture.detectChanges();
    main = fixture.nativeElement.querySelector('main');
    section = fixture.nativeElement.querySelector('section');
    Object.defineProperties(main, { clientHeight: { value: 600 }, scrollHeight: { value: 1200 } });
    main.scrollTop = 600;
  });
  afterEach(() => { TestBed.resetTestingModule(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
  const tick = (ms = 16) => { time += ms; const callback = next; next = undefined; callback?.(time); };
  const wheel = (deltaY: number) => section.dispatchEvent(new WheelEvent('wheel', { deltaY, bubbles: true, cancelable: true }));
  const offset = () => Number(section.style.transform.match(/, (-?[\d.]+)px/)?.[1] ?? 0);

  it('pulls steadily during sustained input and returns without oscillation', () => {
    let previous = 0;
    for (let i = 0; i < 40; i++) {
      wheel(12); tick();
      expect(offset()).toBeLessThanOrEqual(previous);
      expect(offset()).toBeGreaterThanOrEqual(-480);
      previous = offset();
    }
    expect(previous).toBeLessThan(-150);
    for (let i = 0; i < 10; i++) tick();
    previous = offset();
    for (let i = 0; i < 120; i++) {
      tick(i % 3 === 0 ? 33 : 16);
      expect(offset()).toBeGreaterThanOrEqual(previous - .001);
      expect(offset()).toBeLessThanOrEqual(0);
      previous = offset();
    }
    expect(section.style.transform).toBe('');
  });

  it('allows continued pulling beyond a viewport without a hard travel cap', () => {
    for (let i = 0; i < 100; i++) { wheel(100); tick(); }
    const first = offset();
    expect(first).toBeLessThan(-main.clientHeight);
    for (let i = 0; i < 100; i++) { wheel(100); tick(); }
    expect(offset()).toBeLessThan(first - 300);
    for (let i = 0; i < 240; i++) tick();
    expect(section.style.transform).toBe('');
    expect(main.scrollTop).toBe(600);
  });

  it('resumes an interrupted pull from its current position', () => {
    for (let i = 0; i < 25; i++) { wheel(12); tick(); }
    tick(180);
    const before = offset();
    wheel(12);
    expect(offset()).toBe(before); // Input never jumps the rendered position.
    tick();
    expect(offset()).toBeLessThanOrEqual(before);
  });

  it('cancels the spring when the page becomes hidden', () => {
    wheel(100); tick(); expect(offset()).toBeLessThan(0);
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
    document.dispatchEvent(new Event('visibilitychange'));
    expect(next).toBeUndefined(); expect(section.style.transform).toBe('');
    wheel(100); tick(); expect(next).toBeUndefined();
  });

  it('does not turn arrival momentum into another pull', () => {
    main.scrollTop = 300; wheel(100); tick();
    main.scrollTop = 600;
    for (let i = 0; i < 30; i++) { wheel(20); tick(); }
    expect(section.style.transform).toBe('');
    tick(200); wheel(40); tick();
    expect(offset()).toBeLessThan(0);
  });
});
