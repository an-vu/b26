/** Keep dock-anchored surfaces aligned when the dock or viewport changes size. */
export function observeToolbarBounds(toolbar: HTMLElement, update: (bounds: DOMRect) => void): () => void {
  const position = () => update(toolbar.getBoundingClientRect());
  const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(position);
  observer?.observe(toolbar);
  window.addEventListener('resize', position);
  position();
  return () => {
    observer?.disconnect();
    window.removeEventListener('resize', position);
  };
}

/** Shared viewport positioning for compact dialogs anchored to the toolbar.
 * CSS owns the gap; measurements only supply the dock's actual bounds.
 */
export class ToolbarPanelAnchor {
  private stopObserving?: () => void;

  constructor(private readonly dialog: () => HTMLDialogElement, private readonly edge: 'left' | 'right') {}

  connect(opener?: HTMLElement): void {
    this.disconnect();
    const toolbar = opener?.closest<HTMLElement>('.bottom-actions')
      ?? document.querySelector<HTMLElement>('.bottom-actions');
    if (!toolbar) return;
    this.stopObserving = observeToolbarBounds(toolbar, bounds => {
      const panel = this.dialog();
      if (!panel.open) return;
      panel.style.bottom = `calc(${window.innerHeight - bounds.top}px + var(--toolbar-panel-gap))`;
      panel.style[this.edge] = `${this.edge === 'left' ? bounds.left : window.innerWidth - bounds.right}px`;
      panel.style.maxHeight = `max(80px, calc(${bounds.top}px - var(--toolbar-panel-gap) - 12px))`;
    });
  }

  disconnect(): void {
    this.stopObserving?.();
    this.stopObserving = undefined;
  }
}
