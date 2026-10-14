import { HOME_FEED_ENTER } from './home-intro-scroll';
import { animateHomeEntrance } from '../utils/home-entrance.util';
import { AfterViewInit, Directive, ElementRef, NgZone, OnDestroy, inject } from '@angular/core';

/** Viewport entrances share a spring; tiles with the same grid top share a delay. */
@Directive({ selector: '[appHomeEntrance]', standalone: true })
export class HomeEntranceDirective implements AfterViewInit, OnDestroy {
  private readonly host: HTMLElement = inject(ElementRef).nativeElement;
  private readonly zone = inject(NgZone);
  private observer?: IntersectionObserver;
  private changes?: MutationObserver;
  private seen = new WeakSet<Element>();
  private animations = new Map<Element, Animation>();
  private replaying = new WeakSet<Element>();
  private scroller: Element | null = null;
  private motion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  ngAfterViewInit() {
    this.zone.runOutsideAngular(() => {
      if (!('IntersectionObserver' in window)) return;
      this.scroller = this.host.closest('.app-page');
      this.scroller?.addEventListener(HOME_FEED_ENTER, this.replayFeed);
      this.observer = new IntersectionObserver(entries => {
        const visible = entries.filter(entry => entry.isIntersecting);
        const tops = [...new Set(visible.map(entry => Math.round(entry.boundingClientRect.top)))].sort((a, b) => a - b);
        for (const entry of visible) {
          this.observer!.unobserve(entry.target);
          if (this.motion?.matches) continue;
          const row = tops.indexOf(Math.round(entry.boundingClientRect.top));
          const animation = animateHomeEntrance(entry.target, (this.replaying.has(entry.target) ? 40 : 150) + Math.min(600, row * 90));
          this.animations.get(entry.target)?.cancel();
          this.animations.set(entry.target, animation);
          animation.onfinish = () => {
            if (this.animations.get(entry.target) === animation) this.animations.delete(entry.target);
          };
        }
      }, { root: this.host.closest('.app-page'), threshold: .05 });
      this.observe();
      this.changes = new MutationObserver(() => this.observe());
      this.changes.observe(this.host, { childList: true, subtree: true });
      this.motion?.addEventListener('change', this.reduceMotion);
    });
  }
  private replayFeed = () => {
    if (this.motion?.matches) return;
    // Re-observe even the first row, whose initial entrance ran in the hero preview.
    // Offscreen rows keep waiting until they enter the viewport.
    this.host.querySelectorAll('.feed-tile').forEach(element => {
      this.animations.get(element)?.cancel();
      this.animations.delete(element);
      this.replaying.add(element);
      this.observer?.unobserve(element);
      this.observer?.observe(element);
    });
  };
  private observe() {
    this.host.querySelectorAll('.intro-hook, .feed-heading, .feed-tile').forEach(element => {
      if (!this.seen.has(element)) { this.seen.add(element); this.observer?.observe(element); }
    });
  }
  private reduceMotion = () => { if (this.motion?.matches) { this.animations.forEach(animation => animation.cancel()); this.animations.clear(); } };
  ngOnDestroy() {
    this.scroller?.removeEventListener(HOME_FEED_ENTER, this.replayFeed);
    this.observer?.disconnect(); this.changes?.disconnect();
    this.animations.forEach(animation => animation.cancel());
    this.motion?.removeEventListener('change', this.reduceMotion);
  }
}
