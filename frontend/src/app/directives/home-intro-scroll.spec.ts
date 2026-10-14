import { vi } from 'vitest';
import { bindHomeIntroScroll, HOME_FEED_ENTER, type HomeIntroController } from './home-intro-scroll';

describe('Home intro stage controller', () => {
  let scroller: HTMLElement, content: HTMLElement, controller: HomeIntroController, now: number;
  let frames: Map<number, FrameRequestCallback>, nextFrame: number;
  const wheel = (deltaY: number, elapsed = 16) => {
    now += elapsed;
    const event = new WheelEvent('wheel', { deltaY, bubbles: true, cancelable: true });
    scroller.dispatchEvent(event);
    return event;
  };
  const step = () => {
    now += 16;
    const pending = [...frames.values()]; frames.clear();
    pending.forEach(callback => callback(now));
  };
  const settle = (momentum = false, delta = 2) => {
    for (let i = 0; frames.size && i < 200; i++) {
      step();
      if (momentum) expect(wheel(delta, 0).defaultPrevented).toBe(true);
    }
    expect(frames.size).toBe(0);
  };
  beforeEach(() => {
    scroller = document.createElement('main');
    content = document.createElement('section'); content.className = 'app-page-content';
    scroller.append(content); document.body.append(scroller);
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    now = 1000; frames = new Map(); nextFrame = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {
      frames.set(++nextFrame, callback); return nextFrame;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => { frames.delete(id); });
    controller = bindHomeIntroScroll(scroller, () => 600);
  });
  afterEach(() => { controller.destroy(); scroller.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });

  it('moves the stage without scrolling, then hands off at the exact feed position', () => {
    wheel(16); step();
    expect(scroller.scrollTop).toBe(0);
    expect(content.style.translate).not.toBe('');
    expect(scroller.style.overflowY).toBe('hidden');
    expect(controller.progress).toBeGreaterThan(0);
    settle();
    expect(scroller.scrollTop).toBe(600);
    expect(content.style.translate).toBe('');
    expect(controller.progress).toBeNull();
    expect(scroller.style.overflowY).toBe('');
  });
  it('keeps the gesture consumed after settling, even with a long momentum tail', () => {
    wheel(100); settle(true, 100);
    for (const delta of [80, 60, 40, 20, 10, 6, 4, 3, 2, 1]) {
      expect(wheel(delta, 100).defaultPrevented).toBe(true);
    }
    expect(scroller.scrollTop).toBe(600);
    expect(wheel(24, 200).defaultPrevented).toBe(false);
    scroller.scrollTop = 1800;
    expect(wheel(100).defaultPrevented).toBe(false);
    step();
    expect(scroller.scrollTop).toBe(1800);
  });
  it('accepts a quick second upward push without waiting for the idle timer', () => {
    scroller.scrollTop = 1000;
    wheel(-500);
    for (const delta of [-30, -12, -3]) wheel(delta);
    expect(scroller.style.overflowY).toBe('hidden');
    wheel(-20, 16);
    expect(controller.progress).not.toBeNull();
    settle();
    expect(scroller.scrollTop).toBe(0);
  });
  it('immediately releases the boundary for a downward reversal', () => {
    scroller.scrollTop = 1000;
    wheel(-500); wheel(-4);
    expect(wheel(20, 16).defaultPrevented).toBe(false);
    expect(scroller.style.overflowY).toBe('');
  });
  it('holds small fluctuations in the momentum tail', () => {
    scroller.scrollTop = 1000;
    wheel(-500);
    for (const delta of [-12, -8, -5, -6, -3, -4, -2]) {
      expect(wheel(delta).defaultPrevented).toBe(true);
    }
    expect(scroller.scrollTop).toBe(600);
    expect(controller.progress).toBeNull();
  });
  it('reverses to the intro and replays feed entry on the next downward gesture', () => {
    const enter = vi.fn(); scroller.addEventListener(HOME_FEED_ENTER, enter);
    wheel(16); settle();
    expect(enter).toHaveBeenCalledTimes(1);
    expect(wheel(-16).defaultPrevented).toBe(true); settle();
    expect(scroller.scrollTop).toBe(0);
    wheel(16); settle();
    expect(enter).toHaveBeenCalledTimes(2);
  });
  it('can reverse a transition before it lands', () => {
    wheel(100);
    for (let i = 0; i < 8; i++) step();
    expect(wheel(-20).defaultPrevented).toBe(true);
    settle();
    expect(scroller.scrollTop).toBe(0);
    expect(content.style.translate).toBe('');
  });
  it('does not release a fresh gesture that began while the stage was moving', () => {
    wheel(16); step();
    expect(wheel(30, 200).defaultPrevented).toBe(true);
    settle(true);
    expect(wheel(2).defaultPrevented).toBe(true);
    expect(wheel(20, 200).defaultPrevented).toBe(false);
  });
  it('owns a touch swipe until finger-up and leaves the next feed swipe native', () => {
    const touch = (type: string, y: number) => {
      const event = new Event(type, { cancelable: true });
      Object.defineProperty(event, 'touches', { value: [{ clientY: y, clientX: 0 }] });
      scroller.dispatchEvent(event);
      return event;
    };
    touch('touchstart', 200);
    expect(touch('touchmove', 150).defaultPrevented).toBe(true);
    settle();
    expect(touch('touchmove', 100).defaultPrevented).toBe(true);
    touch('touchend', 100);
    touch('touchstart', 200);
    expect(touch('touchmove', 150).defaultPrevented).toBe(false);
  });
  it('stops an upward feed gesture at the board, requiring another gesture for the intro', () => {
    scroller.scrollTop = 1800;
    expect(wheel(-800).defaultPrevented).toBe(false);
    scroller.scrollTop = 1000; // Browser applies the unclaimed wheel event.
    expect(wheel(-800).defaultPrevented).toBe(true);
    expect(scroller.scrollTop).toBe(600);
    for (const delta of [-200, -100, -40, -10]) expect(wheel(delta).defaultPrevented).toBe(true);
    step();
    expect(frames.size).toBe(0);
    expect(wheel(-20, 200).defaultPrevented).toBe(true);
    settle();
    expect(scroller.scrollTop).toBe(0);
  });
  it('clamps native touch momentum at the board boundary', () => {
    scroller.scrollTop = 1000;
    const start = new Event('touchstart');
    Object.defineProperty(start, 'touches', { value: [{ clientY: 100, clientX: 0 }] });
    scroller.dispatchEvent(start);
    scroller.dispatchEvent(new Event('touchend'));
    scroller.scrollTop = 550;
    scroller.dispatchEvent(new Event('scroll'));
    expect(scroller.scrollTop).toBe(600);
    step();
    expect(frames.size).toBe(0);
  });
  it('does not repeatedly correct subpixel rounding at the boundary', () => {
    scroller.scrollTop = 1000;
    wheel(-500);
    step();
    scroller.scrollTop = 599.6;
    for (let i = 0; i < 10; i++) scroller.dispatchEvent(new Event('scroll'));
    expect(scroller.scrollTop).toBe(599.6);
    expect(frames.size).toBe(0);
    vi.advanceTimersByTime(180);
    expect(scroller.style.overflowY).toBe('');
  });
  it('keeps the boundary locked across frames until wheel momentum is quiet', () => {
    scroller.scrollTop = 1000;
    wheel(-500);
    for (let i = 0; i < 10; i++) {
      step();
      vi.advanceTimersByTime(100);
      expect(wheel(-2, 100).defaultPrevented).toBe(true);
      expect(scroller.style.overflowY).toBe('hidden');
    }
    vi.advanceTimersByTime(179);
    expect(scroller.style.overflowY).toBe('hidden');
    vi.advanceTimersByTime(1);
    expect(scroller.style.overflowY).toBe('');
    expect(scroller.scrollTop).toBe(600);
  });
  it('requires a separate PageUp press after reaching the board start', () => {
    Object.defineProperty(scroller, 'clientHeight', { value: 800 });
    scroller.scrollTop = 1000;
    scroller.dispatchEvent(new KeyboardEvent('keydown', { key: 'PageUp', cancelable: true }));
    expect(scroller.scrollTop).toBe(600);
    step();
    scroller.dispatchEvent(new KeyboardEvent('keydown', { key: 'PageUp', repeat: true, cancelable: true }));
    expect(frames.size).toBe(0);
    scroller.dispatchEvent(new KeyboardEvent('keyup', { key: 'PageUp' }));
    scroller.dispatchEvent(new KeyboardEvent('keydown', { key: 'PageUp', cancelable: true }));
    settle();
    expect(scroller.scrollTop).toBe(0);
  });
  it('does not intercept panel, zoom, or keyboard scrolling inside the feed', () => {
    const panel = document.createElement('div'); panel.className = 'toolbar-panel'; scroller.append(panel);
    const event = new WheelEvent('wheel', { deltaY: 100, bubbles: true, cancelable: true });
    panel.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    const zoom = new WheelEvent('wheel', { deltaY: 100, ctrlKey: true, cancelable: true });
    scroller.dispatchEvent(zoom);
    expect(zoom.defaultPrevented).toBe(false);
    scroller.scrollTop = 1000;
    const key = new KeyboardEvent('keydown', { key: 'PageDown', cancelable: true });
    scroller.dispatchEvent(key);
    expect(key.defaultPrevented).toBe(false);
  });
  it('settles immediately with reduced motion', () => {
    controller.destroy();
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    controller = bindHomeIntroScroll(scroller, () => 600);
    wheel(16);
    expect(scroller.scrollTop).toBe(600);
    expect(frames.size).toBe(0);
  });
  it('removes the temporary stage transform on teardown', () => {
    wheel(100); step(); controller.destroy();
    expect(frames.size).toBe(0);
    expect(content.style.translate).toBe('');
  });
});
