export const HOME_FEED_ENTER = 'home-feed-enter';

/** Advance the intro once per gesture, then leave the feed's scrolling native. */
export interface HomeIntroController { destroy(): void; readonly progress: number | null; }

export function bindHomeIntroScroll(
  scroller: HTMLElement,
  destination: () => number | null,
  paint: (progress: number) => void = () => {},
): HomeIntroController {
  let frame = 0, total = 0, lastWheel = -Infinity, direction = 0, consumed = false, previousDelta = 0;
  let touchY: number | null = null, touchClaimed = false;
  let holdFeedBoundary = false, lastTouchY = 0, keyBoundaryHeld = false;
  let progress: number | null = null;
  // Direction of the running spring; only meaningful while `frame` is non-zero.
  let animatingIn = false;
  const content = scroller.querySelector<HTMLElement>('.app-page-content');
  const originalOverflow = scroller.style.overflowY;
  let boundaryTimer: ReturnType<typeof setTimeout> | undefined;
  let boundaryLocked = false;
  const setOverflow = (value: string) => {
    clearTimeout(boundaryTimer); boundaryTimer = undefined;
    boundaryLocked = false;
    if (value) scroller.style.overflowY = value;
    else scroller.style.removeProperty('overflow-y');
  };
  const unlockScroll = () => setOverflow(originalOverflow);
  const lockScroll = () => setOverflow('hidden');
  const pixels = (event: WheelEvent) => event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? scroller.clientHeight : 1);
  const releaseBoundaryAfterGesture = () => {
    clearTimeout(boundaryTimer);
    boundaryTimer = setTimeout(() => {
      if (!frame && touchY === null) unlockScroll();
    }, 180);
  };
  const landAtBoundary = (target: number) => {
    // Cancel native momentum before placing the board; don't chase it in scroll events.
    lockScroll();
    scroller.scrollTop = target;
    consumed = true;
    paint(1);
    boundaryLocked = true;
    releaseBoundaryAfterGesture();
  };
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const nestedControl = (target: EventTarget | null) => {
    if (!(target instanceof Element)) return false;
    if (target.closest('input, textarea, select, [contenteditable="true"], .toolbar-panel')) return true;
    for (let node = target; node !== scroller && node instanceof HTMLElement; node = node.parentElement!) {
      if (node.scrollHeight > node.clientHeight && /auto|scroll/.test(getComputedStyle(node).overflowY)) return true;
    }
    return false;
  };
  const stop = () => {
    cancelAnimationFrame(frame); frame = 0;
    if (progress !== null) {
      // Commit the visual position before releasing control (also used on teardown).
      content?.style.removeProperty('translate');
      scroller.scrollTop = (destination() ?? 0) * progress;
      progress = null;
    }
    unlockScroll();
  };
  const advance = (target: number, entering = true) => {
    stop();
    holdFeedBoundary = false;
    lockScroll();
    const startScroll = scroller.scrollTop;
    let value = Math.min(1, Math.max(0, startScroll / target)), velocity = 0;
    const goal = entering ? 1 : 0;
    let previous = performance.now();
    animatingIn = entering;
    progress = value;
    if (entering) scroller.dispatchEvent(new Event(HOME_FEED_ENTER));
    const render = () => {
      progress = Math.min(1, Math.max(0, value));
      // Move a fixed stage, not scrollTop. Native scroll takes over only at settlement.
      if (content) content.style.translate = `0 ${startScroll - target * progress}px`;
      paint(progress);
    };
    const finish = () => {
      value = goal; render();
      content?.style.removeProperty('translate');
      scroller.scrollTop = target * goal;
      progress = null; frame = 0;
      unlockScroll();
    };
    if (reduced?.matches) { finish(); return; }
    const tick = (now: number) => {
      const dt = Math.min((now - previous) / 1000, 1 / 30); previous = now;
      // vHuman's smooth/returning spring presets, independent of frame rate.
      const stiffness = entering ? 180 : 230, damping = entering ? 27.5 : 31;
      for (let i = 0; i < 4; i++) {
        velocity += ((goal - value) * stiffness - velocity * damping) * dt / 4;
        value += velocity * dt / 4;
      }
      render();
      if (Math.abs(goal - value) < .001 && Math.abs(velocity) < .001) finish();
      else frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
  };
  const wheel = (event: WheelEvent) => {
    if (event.ctrlKey || Math.abs(event.deltaX) > Math.abs(event.deltaY) || nestedControl(event.target)) return;
    const target = destination();
    if (target === null) { stop(); return; }
    const now = performance.now(), nextDirection = Math.sign(event.deltaY);
    if (!nextDirection) return;
    const delta = pixels(event);
    const magnitude = Math.abs(delta);
    // Wheel events have no finger-down signal. A clear increase in force after the
    // previous tail is a fresh push; small fluctuations in fading momentum aren't.
    const freshPush = consumed && !frame && magnitude >= 8
      && magnitude - previousDelta >= Math.max(6, previousDelta * .75);
    if (now - lastWheel > 180 || nextDirection !== direction || freshPush) {
      if (boundaryLocked) unlockScroll();
      consumed = false; total = 0;
      holdFeedBoundary = nextDirection < 0 && scroller.scrollTop > target + 2;
    }
    direction = nextDirection; lastWheel = now; previousDelta = magnitude;
    if (consumed) {
      event.preventDefault();
      if (boundaryLocked) releaseBoundaryAfterGesture();
      return;
    }
    if (frame) {
      event.preventDefault();
      consumed = true;
      // Reverse a running transition when the gesture opposes it.
      if (animatingIn !== direction > 0) advance(target, direction > 0);
      return;
    }
    if (holdFeedBoundary && direction < 0 && scroller.scrollTop + delta <= target) {
      event.preventDefault();
      landAtBoundary(target);
      return;
    }
    const inIntro = scroller.scrollTop < target - 2;
    const atFeedStart = scroller.scrollTop <= target + 2;
    if (direction > 0 && !inIntro || direction < 0 && (!atFeedStart || scroller.scrollTop <= 0)) return;
    event.preventDefault();
    total += magnitude;
    if (total >= 16) { consumed = true; total = 0; advance(target, direction > 0); }
  };
  const touchStart = (event: TouchEvent) => {
    if (boundaryLocked) unlockScroll();
    touchY = !nestedControl(event.target) && event.touches.length === 1 ? event.touches[0].clientY : null;
    touchClaimed = false;
    lastTouchY = touchY ?? 0;
    const target = destination();
    holdFeedBoundary = touchY !== null && target !== null && scroller.scrollTop > target + 2;
  };
  const touchMove = (event: TouchEvent) => {
    if (touchY === null || event.touches.length !== 1) return;
    const target = destination();
    if (target === null) return;
    const point = event.touches[0].clientY;
    const delta = lastTouchY - point;
    lastTouchY = point;
    const distance = touchY - point;
    if (holdFeedBoundary && delta < 0 && scroller.scrollTop + delta <= target) {
      event.preventDefault(); landAtBoundary(target); touchClaimed = true; return;
    }
    if (touchClaimed) { event.preventDefault(); return; }
    if (!distance || distance > 0 && scroller.scrollTop >= target - 2
      || distance < 0 && (scroller.scrollTop > target + 2 || scroller.scrollTop <= 0)) return;
    event.preventDefault();
    if (Math.abs(distance) >= 28) { touchClaimed = true; advance(target, distance > 0); }
  };
  const touchEnd = () => {
    touchY = null; touchClaimed = false;
    if (boundaryLocked) releaseBoundaryAfterGesture();
  };
  const keepFeedBoundary = () => {
    const target = destination();
    if (!frame && holdFeedBoundary && target !== null && scroller.scrollTop < target - 1) {
      landAtBoundary(target);
      if (touchY !== null) touchClaimed = true;
    }
  };
  const keyUp = () => { keyBoundaryHeld = false; if (boundaryLocked) unlockScroll(); };
  const key = (event: KeyboardEvent) => {
    if (nestedControl(event.target) || event.target instanceof Element && event.target.closest('button, a')) return;
    const target = destination();
    if (target === null) return;
    if (boundaryLocked && !event.repeat) unlockScroll();
    const upward = ['ArrowUp', 'PageUp'].includes(event.key) || event.key === ' ' && event.shiftKey;
    if (upward && !frame) {
      if (keyBoundaryHeld && event.repeat) { event.preventDefault(); return; }
      if (scroller.scrollTop > target + 2) {
        holdFeedBoundary = true;
        const step = event.key === 'ArrowUp' ? 40 : scroller.clientHeight;
        if (scroller.scrollTop - step <= target) {
          event.preventDefault(); landAtBoundary(target); keyBoundaryHeld = true;
        }
        return;
      }
      if (scroller.scrollTop > 0) { event.preventDefault(); advance(target, false); return; }
    }
    if (['ArrowDown', 'PageDown', ' '].includes(event.key) && !event.shiftKey && (frame || scroller.scrollTop < target - 2)) {
      event.preventDefault();
      if (!frame) advance(target);
    } else if (['ArrowUp', 'PageUp'].includes(event.key) && scroller.scrollTop <= target + 2 && scroller.scrollTop > 0) {
      event.preventDefault(); advance(target, false);
    } else if (['Home', 'End'].includes(event.key)) { holdFeedBoundary = false; stop(); }
  };
  // Only wheel and touchmove may cancel native scrolling; everything else stays passive.
  const listeners = new AbortController(), signal = listeners.signal;
  scroller.addEventListener('wheel', wheel, { passive: false, signal });
  scroller.addEventListener('touchmove', touchMove, { passive: false, signal });
  scroller.addEventListener('touchstart', touchStart, { passive: true, signal });
  scroller.addEventListener('touchend', touchEnd, { passive: true, signal });
  scroller.addEventListener('touchcancel', touchEnd, { passive: true, signal });
  scroller.addEventListener('scroll', keepFeedBoundary, { passive: true, signal });
  scroller.addEventListener('keydown', key, { signal });
  scroller.addEventListener('keyup', keyUp, { passive: true, signal });
  return { get progress() { return progress; }, destroy() { stop(); listeners.abort(); } };
}
