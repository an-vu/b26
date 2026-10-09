/** Native dialogs stay open until their exit finishes; a reopen cancels that exit. */
export class PanelCloseAnimation {
  private animation?: Animation;
  private generation = 0;
  get closing() { return !!this.animation; }

  cancel(element: HTMLElement) {
    this.generation++;
    this.animation?.cancel();
    this.animation = undefined;
    element.style.removeProperty('animation');
  }

  close(element: HTMLDialogElement, complete: () => void) {
    if (this.closing) return;
    if (!element.open || !element.animate || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      complete(); return;
    }
    const token = ++this.generation;
    const current = getComputedStyle(element);
    const opacity = current.opacity;
    const translate = current.translate === 'none' ? '0 0' : current.translate;
    element.style.animation = 'none';
    const animation = element.animate([
      { opacity, translate }, { opacity: 0, translate: '0 28px' },
    ], { duration: 220, easing: 'cubic-bezier(.4,0,.8,.3)', fill: 'forwards' });
    this.animation = animation;
    void animation.finished.then(() => {
      if (token !== this.generation) return;
      this.animation = undefined;
      complete();
      animation.cancel();
      element.style.removeProperty('animation');
    }, () => {});
  }
}
