import { PageActivityService } from '../services/page-activity.service';
import { Subscription } from 'rxjs';
import { AfterViewInit, Directive, ElementRef, NgZone, OnDestroy, inject } from '@angular/core';

/** Gesture-driven overscroll: input changes a target, only animation moves the widgets. */
@Directive({ selector: '[appWidgetBounce]', standalone: true })
export class WidgetBounceDirective implements AfterViewInit, OnDestroy {
  private element: HTMLElement = inject(ElementRef).nativeElement;
  private zone = inject(NgZone);
  private scroller?: HTMLElement;
  private activity = inject(PageActivityService);
  private visibility?: Subscription;
  private frame = 0;
  private offset = 0;
  private velocity = 0;
  private target = 0;
  private distance = 0;
  private previous = 0;
  private lastWheel = -Infinity;
  private wheelEligible = false;
  private touch?: { x: number; y: number; eligible: boolean };
  private motion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  ngAfterViewInit() {
    this.scroller = this.element.parentElement?.closest<HTMLElement>('.panel-body, .page-fixed-scroll, .app-page') ?? undefined;
    this.zone.runOutsideAngular(() => {
      this.scroller?.addEventListener('wheel', this.wheel, { passive: false });
      this.scroller?.addEventListener('touchstart', this.touchStart, { passive: true });
      this.scroller?.addEventListener('touchmove', this.touchMove, { passive: false });
      this.scroller?.addEventListener('touchend', this.touchEnd, { passive: true });
      this.scroller?.addEventListener('touchcancel', this.touchEnd, { passive: true });
      this.scroller?.addEventListener('scroll', this.scroll, { passive: true });
      window.addEventListener('blur', this.reset);
      this.motion?.addEventListener('change', this.reset);
      this.visibility = this.activity.visible$.subscribe(visible => { if (!visible) this.reset(); });
    });
  }
  private atBottom() {
    const s = this.scroller;
    return !!s && s.scrollTop + s.clientHeight >= s.scrollHeight - 2;
  }
  private accepts(target: EventTarget | null) {
    if (!this.activity.visible || this.motion?.matches || !(target instanceof Element)) return false;
    if (target.closest('input, textarea, select, [contenteditable="true"]')) return false;
    const overlay = target.closest('.bottom-actions, dialog');
    if (overlay && !overlay.contains(this.scroller ?? null)) return false;
    // Leave independently scrollable widget content to the browser.
    for (let node: Element | null = target; node && node !== this.scroller; node = node.parentElement) {
      if (node.scrollHeight > node.clientHeight + 2 && /auto|scroll/.test(getComputedStyle(node).overflowY)) return false;
    }
    return true;
  }
  private pull(delta: number) {
    this.distance += Math.max(0, delta);
    // Progressive resistance, not a travel cap: continued input keeps lifting.
    // Integral of dx / d(input) = 1 / (1 + x / 200).
    this.target = -200 * (Math.sqrt(1 + this.distance / 100) - 1);
    if (this.target < this.offset) this.velocity = Math.min(0, this.velocity);
    if (!this.frame) {
      this.previous = performance.now();
      this.frame = requestAnimationFrame(this.step);
    }
  }
  private release() { this.target = 0; this.distance = 0; }
  private wheel = (event: WheelEvent) => {
    if (event.ctrlKey || Math.abs(event.deltaX) >= Math.abs(event.deltaY) || !this.accepts(event.target)) return;
    const now = performance.now();
    if (now - this.lastWheel > 140) {
      // A gesture which arrives at the bottom must finish before a fresh pull.
      this.wheelEligible = this.atBottom();
      const lift = Math.max(0, -this.offset, -this.target);
      this.distance = lift + lift * lift / 400;
    }
    this.lastWheel = now;
    if (event.deltaY < 0 || !this.atBottom()) { this.wheelEligible = false; this.release(); return; }
    if (!this.wheelEligible) return;
    if (event.cancelable) event.preventDefault();
    this.pull(event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? this.scroller!.clientHeight : 1));
  };
  private touchStart = (event: TouchEvent) => {
    this.touch = event.touches.length === 1 ? { x: event.touches[0].clientX, y: event.touches[0].clientY, eligible: this.atBottom() && this.accepts(event.target) } : undefined;
    this.distance = 0;
  };
  private touchMove = (event: TouchEvent) => {
    if (!this.touch || event.touches.length !== 1) { this.touchEnd(); return; }
    const point = event.touches[0], dx = this.touch.x - point.clientX, dy = this.touch.y - point.clientY;
    this.touch.x = point.clientX; this.touch.y = point.clientY;
    if (Math.abs(dx) >= Math.abs(dy)) return;
    if (dy < 0 || !this.atBottom()) { this.touch.eligible = false; this.release(); return; }
    if (!this.touch.eligible) return;
    if (event.cancelable) event.preventDefault();
    this.pull(dy * 2);
  };
  private touchEnd = () => { this.touch = undefined; this.release(); };
  private scroll = () => { if (!this.atBottom()) { this.wheelEligible = false; this.release(); } };
  private step = (now: number) => {
    if (!this.activity.visible || this.motion?.matches) { this.reset(); return; }
    if (!this.touch && now - this.lastWheel > 140) this.release();
    const dt = Math.min((now - this.previous) / 1000, .064); this.previous = now;
    // Exact critically damped spring: stable across refresh rates and long frames.
    const frequency = this.target < 0 ? 22 : 10;
    const displacement = this.offset - this.target;
    const impulse = this.velocity + frequency * displacement;
    const decay = Math.exp(-frequency * dt);
    this.offset = this.target + (displacement + impulse * dt) * decay;
    this.velocity = (this.velocity - frequency * impulse * dt) * decay;
    this.element.style.transform = `translate3d(0, ${Math.min(0, this.offset)}px, 0)`;
    if (!this.target && Math.abs(this.offset) < .04 && Math.abs(this.velocity) < .1) this.reset();
    else this.frame = requestAnimationFrame(this.step);
  };
  private reset = () => {
    cancelAnimationFrame(this.frame);
    this.frame = this.offset = this.velocity = this.target = this.distance = 0;
    this.lastWheel = -Infinity; this.wheelEligible = false; this.touch = undefined;
    this.element.style.removeProperty('transform');
  };
  ngOnDestroy() {
    this.reset(); this.visibility?.unsubscribe();
    this.scroller?.removeEventListener('wheel', this.wheel);
    this.scroller?.removeEventListener('touchstart', this.touchStart);
    this.scroller?.removeEventListener('touchmove', this.touchMove);
    this.scroller?.removeEventListener('touchend', this.touchEnd);
    this.scroller?.removeEventListener('touchcancel', this.touchEnd);
    this.scroller?.removeEventListener('scroll', this.scroll);
    window.removeEventListener('blur', this.reset);
    this.motion?.removeEventListener('change', this.reset);
  }
}
