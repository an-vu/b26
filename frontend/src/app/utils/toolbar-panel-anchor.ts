/** Shared viewport positioning for compact dialogs anchored to the toolbar. */
export class ToolbarPanelAnchor {
  private toolbar?: HTMLElement;
  private observer?: ResizeObserver;

  constructor(private readonly dialog: () => HTMLDialogElement, private readonly edge: 'left' | 'right') {}

  connect(opener?: HTMLElement): void {
    this.disconnect();
    this.toolbar = opener?.closest<HTMLElement>('.bottom-actions')
      ?? document.querySelector<HTMLElement>('.bottom-actions') ?? undefined;
    this.position();
    if (this.toolbar && typeof ResizeObserver !== 'undefined') {
      this.observer = new ResizeObserver(() => this.position());
      this.observer.observe(this.toolbar);
    }
  }

  disconnect(): void { this.observer?.disconnect(); }

  position(): void {
    const panel = this.dialog();
    if (!this.toolbar || !panel.open) return;
    const bounds = this.toolbar.getBoundingClientRect();
    const gap = parseFloat(getComputedStyle(this.toolbar).getPropertyValue('--toolbar-panel-gap')) || 12;
    panel.style.bottom = `${window.innerHeight - bounds.top + gap}px`;
    panel.style[this.edge] = `${this.edge === 'left' ? bounds.left : window.innerWidth - bounds.right}px`;
    panel.style.maxHeight = `${Math.max(80, bounds.top - gap - 12)}px`;
  }
}
