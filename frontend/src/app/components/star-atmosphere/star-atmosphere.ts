import { afterNextRender, Component, DestroyRef, effect, ElementRef, inject, input } from '@angular/core';
import { PageActivityService } from '../../services/page-activity.service';
import type { BoardThemeId } from '../../themes/board-theme';
import { StarSky, type StarLevel } from './star-sky';

/** The Stars pattern: night sky on dark boards, pearl stars on light boards, tinted by the theme. */
@Component({
  selector: 'app-star-atmosphere', standalone: true,
  template: '<canvas aria-hidden="true"></canvas>',
  styles: [':host { position:absolute; inset:0; overflow:hidden; } canvas { width:100%; height:100%; display:block; }'],
})
export class StarAtmosphereComponent {
  readonly intensity = input<StarLevel>('light');
  readonly dark = input(false);
  readonly themeId = input<BoardThemeId>('berry');
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly destroy = inject(DestroyRef);
  private readonly activity = inject(PageActivityService);
  private sky?: StarSky;
  private redraw?: () => void;

  constructor() {
    effect(() => {
      this.sky?.configure({ level: this.intensity(), dark: this.dark(), themeId: this.themeId() });
      // A still (reduced-motion) sky only repaints on request, so ask for one after any change.
      this.redraw?.();
    });
    afterNextRender(() => this.start());
  }

  private start() {
    const sky = new StarSky(this.host.querySelector('canvas')!);
    this.sky = sky;
    sky.configure({ level: this.intensity(), dark: this.dark(), themeId: this.themeId() });
    const motion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const still = () => !!motion?.matches;
    let frame = 0;
    const draw = (now: number) => {
      frame = 0;
      if (!this.activity.visible) return;
      sky.draw(now, still());
      // With reduced motion the sky is drawn once and holds still.
      if (!still()) frame = requestAnimationFrame(draw);
    };
    const resume = () => { cancelAnimationFrame(frame); frame = 0; sky.resetTiming(); if (this.activity.visible) frame = requestAnimationFrame(draw); };
    if (typeof ResizeObserver === 'undefined') return;
    const resize = new ResizeObserver(() => {
      const { width, height } = this.host.getBoundingClientRect();
      sky.resize(width, height, devicePixelRatio);
      resume();
    });
    resize.observe(this.host);
    const subscription = this.activity.visible$.subscribe(resume);
    motion?.addEventListener('change', resume);
    this.redraw = () => { if (still()) resume(); };
    this.destroy.onDestroy(() => { cancelAnimationFrame(frame); subscription.unsubscribe(); resize.disconnect(); motion?.removeEventListener('change', resume); this.redraw = undefined; });
  }
}
