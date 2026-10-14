import { widgetCornerInset, widgetCornerRadius } from '../../utils/widget-corner.util';
import type { BoardAppearance } from '../../models/board';

/** Geometry and animation only. Drafts, permission checks and save/cancel stay on the board. */
export class WidgetEditorMotion {
  constructor(private readonly host: HTMLElement, private readonly cornerStep: () => BoardAppearance['radiusStep']) {}
  bounds = { left: 0, top: 0, width: 0, height: 0 };
  origin = { x: 0, y: 0 };
  size = 440;
  backdropHeight = 0;
  readonly duration = 520;
  sourceSize = { width: 220, height: 220 };
  private widgetFlipAnimation?: Animation;
  private widgetFrontAnimation?: Animation;
  get panelInset() {
    const inset = widgetCornerInset(this.cornerStep());
    const x = inset * this.size / Math.max(1, this.sourceSize.width);
    const y = inset * this.size / Math.max(1, this.sourceSize.height);
    return `${y}px ${x}px`;
  }
  get radius() {
    const radius = widgetCornerRadius(this.cornerStep());
    return `${radius * this.size / Math.max(1, this.sourceSize.width)}px / ${radius * this.size / Math.max(1, this.sourceSize.height)}px`;
  }
  private animateWidgetFront(closing: boolean) {
    const front = this.host.querySelector<HTMLElement>('.widget-editor-front');
    this.widgetFrontAnimation?.cancel();
    // Backdrop filters may sample the reverse face even with backface-visibility.
    // Remove it from painting at the edge-on point, without changing either material.
    this.widgetFrontAnimation = front?.animate([
      { visibility: closing ? 'hidden' : 'visible', offset: 0 },
      { visibility: closing ? 'hidden' : 'visible', offset: .499 },
      { visibility: closing ? 'visible' : 'hidden', offset: .5 },
      { visibility: closing ? 'visible' : 'hidden', offset: 1 },
    ], { duration: this.duration, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'both' });
  }
  private widgetFlipFrames(closing = false): Keyframe[] {
    const { x, y } = this.origin;
    const slot = (angle: number) => ({ transform: `translate(${x}px, ${y}px) rotateY(${angle}deg) scale(${this.sourceSize.width / this.size}, ${this.sourceSize.height / this.size})` });
    const back = { transform: 'translate(0, 0) rotateY(180deg) scale(1)' };
    return closing ? [back, slot(360)] : [slot(0), back];
  }

  position() {
    const host = this.host;
    const board = host.querySelector<HTMLElement>('.board-content');
    if (!board) return;
    const bounds = board.getBoundingClientRect();
    const dockTop = host.querySelector('.bottom-actions')?.getBoundingClientRect().top ?? window.innerHeight;
    const top = Math.max(12, bounds.top);
    this.backdropHeight = window.innerHeight - top;
    this.bounds = { left: bounds.left, top, width: bounds.width, height: Math.max(0, dockTop - 12 - top) };
    const grid = board.querySelector<HTMLElement>('.board-grid');
    const style = grid ? getComputedStyle(grid) : null;
    const column = Number.parseFloat(style?.gridTemplateColumns ?? '') || 212;
    const gap = Number.parseFloat(style?.columnGap ?? '') || 16;
    // A 2×2 footprint, constrained only when the visible board cannot contain it.
    this.size = Math.max(1, Math.min(column * 2 + gap, bounds.width - 24, this.bounds.height - 24));
  }

  setOrigin(rect?: DOMRect) {
    const bounds = this.bounds;
    this.origin = rect ? {
      x: rect.left + rect.width / 2 - bounds.left - bounds.width / 2,
      y: rect.top + rect.height / 2 - bounds.top - bounds.height / 2,
    } : { x: 0, y: 0 };
    this.sourceSize = rect ? { width: rect.width, height: rect.height }
      : { width: this.size, height: this.size };
  }

  flip(closing = false): Animation | undefined {
    const flipper = this.host.querySelector<HTMLElement>('.widget-editor-flipper');
    if (!flipper?.animate || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    this.widgetFlipAnimation?.cancel();
    this.animateWidgetFront(closing);
    this.widgetFlipAnimation = flipper.animate(this.widgetFlipFrames(closing), {
      duration: this.duration, easing: 'cubic-bezier(.4,0,.2,1)', fill: closing ? 'both' : 'none',
    });
    return this.widgetFlipAnimation;
  }

  destroy() {
    this.widgetFlipAnimation?.cancel();
    this.widgetFrontAnimation?.cancel();
  }
}
