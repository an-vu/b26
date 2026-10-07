import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { GridAtmosphereComponent } from './grid-atmosphere';

describe('Meteor animation lifecycle', () => {
  let hidden: boolean;
  let reduced: boolean;
  let time: number;
  let frames: Map<number, FrameRequestCallback>;
  let nextId: number;
  let motionChanged: (() => void) | undefined;
  let paints: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    hidden = false; reduced = false; time = 100; nextId = 0; frames = new Map();
    vi.spyOn(document, 'hidden', 'get').mockImplementation(() => hidden);
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.set(++nextId, callback); return nextId; });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
    vi.stubGlobal('matchMedia', () => ({ get matches() { return reduced; }, addEventListener: (_: string, fn: () => void) => { motionChanged = fn; }, removeEventListener: () => { motionChanged = undefined; } }));
    vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
    vi.stubGlobal('Path2D', class { moveTo() {} lineTo() {} addPath() {} });
    paints = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      clearRect: paints, setTransform() {}, stroke() {}, beginPath() {}, moveTo() {}, lineTo() {}, fill() {}, drawImage() {},
      createLinearGradient: () => ({ addColorStop() {} }),
    } as unknown as CanvasRenderingContext2D);
  });
  afterEach(() => { TestBed.resetTestingModule(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
  function tick(ms = 16) {
    time += ms; const pending = [...frames.values()]; frames.clear(); pending.forEach(frame => frame(time));
  }
  function visibility(value: boolean) { hidden = value; document.dispatchEvent(new Event('visibilitychange')); }
  function setup() { const fixture = TestBed.createComponent(GridAtmosphereComponent); fixture.detectChanges(); return fixture; }

  it('does no rendering or scheduling while hidden and resumes without catching up', () => {
    const fixture = setup(); tick(); tick();
    const before = (fixture.componentInstance as unknown as { elapsed: number }).elapsed;
    const count = paints.mock.calls.length;
    visibility(true);
    expect(document.documentElement.hasAttribute('data-page-hidden')).toBe(true);
    expect(frames.size).toBe(0);
    tick(60_000); expect(paints).toHaveBeenCalledTimes(count);
    visibility(false); expect(frames.size).toBe(1); tick();
    expect((fixture.componentInstance as unknown as { elapsed: number }).elapsed).toBe(before);
    tick(); expect((fixture.componentInstance as unknown as { elapsed: number }).elapsed).toBe(before + 16);
    expect(document.documentElement.hasAttribute('data-page-hidden')).toBe(false);
  });

  it('renders reduced motion once, then sleeps until an input changes', () => {
    reduced = true; const fixture = setup(); tick();
    expect(paints).toHaveBeenCalledTimes(1); expect(frames.size).toBe(0);
    tick(500); expect(paints).toHaveBeenCalledTimes(1);
    fixture.componentRef.setInput('intensity', 'heavy'); fixture.detectChanges(); tick();
    expect(paints).toHaveBeenCalledTimes(2); expect(frames.size).toBe(0);
    reduced = false; motionChanged?.(); tick(); expect(frames.size).toBe(1);
  });

  it('starts hidden without rendering and stops permanently after destruction', () => {
    hidden = true; const fixture = setup(); expect(frames.size).toBe(0);
    visibility(false); tick(); expect(paints).toHaveBeenCalledTimes(1);
    fixture.destroy(); expect(frames.size).toBe(0);
    visibility(true); visibility(false); tick(); expect(paints).toHaveBeenCalledTimes(1);
  });

  it('suspends on pagehide and restores from the back-forward cache', () => {
    setup(); tick(); window.dispatchEvent(new Event('pagehide'));
    expect(frames.size).toBe(0);
    window.dispatchEvent(new Event('pageshow')); expect(frames.size).toBe(1);
  });
});
