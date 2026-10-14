import { bindHomeIntroScroll, type HomeIntroController } from './home-intro-scroll';
import { animateHomeEntrance } from '../utils/home-entrance.util';
import { AfterViewInit, Directive, ElementRef, Input, NgZone, OnChanges, OnDestroy, inject } from '@angular/core';

/** Paint the hero transition and hand intro gestures off to native feed scrolling. */
@Directive({ selector: '[appHeroWordmark]', standalone: true })
export class HeroWordmarkDirective implements AfterViewInit, OnChanges, OnDestroy {
  @Input() appHeroWordmark = false;
  private readonly element: HTMLElement = inject(ElementRef).nativeElement;
  private readonly zone = inject(NgZone);
  private scroller: HTMLElement | null = null;
  private frame = 0;
  private dirty = true;
  private destroyed = false;
  private resize?: ResizeObserver;
  private entered = false;
  private controller?: HomeIntroController;
  private entrances: Animation[] = [];
  private authRow: HTMLElement | null = null;
  private geometry = { distance: 1, scale: 1, lift: 0, authLift: 0, authShift: 0 };
  private lastProgress = -1;
  private readonly motion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  private reduceMotion = () => { if (this.motion?.matches) this.cancelEntrances(); this.lastProgress = -1; this.schedule(); };
  ngAfterViewInit() {
    this.scroller = this.element.closest('.app-page');
    this.zone.runOutsideAngular(() => {
      if (this.scroller) this.controller = bindHomeIntroScroll(this.scroller, () =>
        this.appHeroWordmark && !this.dirty ? this.geometry.distance : null, progress => this.paint(progress));
      this.scroller?.addEventListener('scroll', this.schedule, { passive: true });
      window.addEventListener('resize', this.invalidate);
      this.motion?.addEventListener('change', this.reduceMotion);
      if (typeof ResizeObserver !== 'undefined') {
        this.resize = new ResizeObserver(this.invalidate);
        if (this.scroller) this.resize.observe(this.scroller);
        const content = this.scroller?.querySelector('.app-page-content');
        if (content) this.resize.observe(content);
      }
      document.fonts?.ready.then(() => { if (!this.destroyed) this.invalidate(); });
      this.schedule();
    });
  }
  ngOnChanges() { this.invalidate(); }
  private invalidate = () => { this.dirty = true; this.lastProgress = -1; this.schedule(); };
  private schedule = () => {
    if (!this.frame && !this.destroyed) this.frame = requestAnimationFrame(() => { this.frame = 0; this.update(); });
  };
  private measure() {
    const scroller = this.scroller!;
    const content = scroller.querySelector<HTMLElement>('.app-page-content');
    // Rasterize at hero size; enlarging a header-sized composited layer blurs in Safari.
    this.element.style.removeProperty('font-size');
    const font = parseFloat(getComputedStyle(this.element).fontSize);
    const width = content?.clientWidth ?? scroller.clientWidth * .9;
    // Measure at a large size so small-font rounding doesn't make the hero overflow.
    this.element.style.fontSize = '100px';
    const heroFont = 100 * width / Math.max(1, this.element.offsetWidth);
    const scale = heroFont / font;
    const size = `${heroFont}px`;
    this.element.style.fontSize = size;
    // Complete layout and positioning in one frame before revealing either moving element.
    if (scroller.style.getPropertyValue('--visitor-brand-size') !== size) {
      scroller.style.setProperty('--visitor-brand-size', size);
    }
    const board = scroller.querySelector<HTMLElement>('.community-board');
    const introSection = scroller.querySelector<HTMLElement>('.home-intro');
    const heading = scroller.querySelector<HTMLElement>('.feed-heading');
    const firstTile = scroller.querySelector<HTMLElement>('.feed-tile');
    const navigation = scroller.querySelector<HTMLElement>('.bottom-actions');
    if (introSection && heading && firstTile && navigation) {
      const headingStyle = getComputedStyle(heading);
      const headingSpace = heading.offsetHeight + (parseFloat(headingStyle.marginTop) || 0)
        + (parseFloat(headingStyle.marginBottom) || 0);
      const introTop = introSection.getBoundingClientRect().top + scroller.scrollTop;
      const previewHeight = firstTile.offsetHeight / 3 + 16;
      const minHeight = Math.max(0, Math.round(navigation.getBoundingClientRect().top - previewHeight - introTop - headingSpace));
      const minimum = `${minHeight}px`;
      if (scroller.style.getPropertyValue('--visitor-intro-min-height') !== minimum) {
        scroller.style.setProperty('--visitor-intro-min-height', minimum);
      }
    }
    const inset = parseFloat(getComputedStyle(scroller).scrollPaddingTop) || 64;
    const slot = scroller.querySelector<HTMLElement>('.intro-auth-slot');
    this.authRow = scroller.querySelector<HTMLElement>('.home-auth-row');
    const intro = slot?.getBoundingClientRect();
    const dock = this.authRow?.parentElement?.getBoundingClientRect();
    this.geometry = {
      distance: Math.max(1, (board?.getBoundingClientRect().top ?? 1) - scroller.getBoundingClientRect().top + scroller.scrollTop - inset),
      scale: 1 / scale,
      lift: scroller.clientHeight * .5 - font * scale * .3 - (this.element.parentElement?.offsetHeight ?? 44) / 2,
      authShift: intro && dock ? intro.left + intro.width / 2 - dock.left - dock.width / 2 : 0,
      authLift: intro && dock ? intro.top + scroller.scrollTop + intro.height / 2 - dock.top - dock.height / 2 : 0,
    };
    this.dirty = false;
    return true;
  }
  private update() {
    if (!this.appHeroWordmark || !this.scroller) {
      this.cancelEntrances(); this.entered = false;
      this.element.style.removeProperty('transform');
      this.element.style.removeProperty('font-size'); return;
    }
    if (this.dirty) this.measure();
    const progress = Math.min(1, Math.max(0, this.scroller.scrollTop / this.geometry.distance));
    this.paint(this.controller?.progress ?? progress);
    this.element.style.visibility = 'visible';
    if (this.authRow) this.authRow.style.visibility = 'visible';
    if (!this.entered) {
      this.entered = true;
      if (!this.motion?.matches && this.scroller.scrollTop <= 1 && typeof this.element.animate === 'function') {
        this.entrances.push(animateHomeEntrance(this.element, 60));
        if (this.authRow) this.entrances.push(animateHomeEntrance(this.authRow, 240));
      }
    }
  }
  private paint(progress: number) {
    if (!this.scroller) return;
    if (progress > 0) this.cancelEntrances();
    if (progress !== this.lastProgress) {
      this.lastProgress = progress;
      const remaining = this.motion?.matches ? (progress > 0 ? 0 : 1) : 1 - progress;
      const blurProgress = Math.min(1, Math.max(0, (progress - .03) / .52));
      this.scroller.style.setProperty('--visitor-header-opacity', String(blurProgress * blurProgress * (3 - 2 * blurProgress)));
      this.scroller.style.setProperty('--community-heading-opacity', String(1 - Math.min(1, progress / .65)));
      if (this.authRow) {
        this.authRow.style.setProperty('--auth-hero', String(remaining));
        this.authRow.style.transform = `translate(${this.geometry.authShift * remaining}px, ${this.geometry.authLift * remaining}px)`;
      }
      this.element.style.transform = `translateY(${this.geometry.lift * remaining}px) scale(${this.geometry.scale + (1 - this.geometry.scale) * remaining})`;
    }
  }
  private cancelEntrances() {
    this.entrances.forEach(animation => animation.cancel());
    this.entrances = [];
  }
  ngOnDestroy() {
    this.destroyed = true;
    this.controller?.destroy();
    cancelAnimationFrame(this.frame); this.resize?.disconnect(); this.cancelEntrances();
    this.motion?.removeEventListener('change', this.reduceMotion);
    this.scroller?.removeEventListener('scroll', this.schedule);
    window.removeEventListener('resize', this.invalidate);
  }
}
