import { Directive, ElementRef, HostListener, Output, EventEmitter, effect, inject, input } from '@angular/core';

export type PanelDismissReason = 'back' | 'close' | 'outside';

/** Shared dismissal and height preservation for toolbar panels with internal views. */
@Directive({ selector: '[appPanelBehavior]', standalone: true })
export class PanelBehaviorDirective {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly panelOpen = input<boolean | undefined>(undefined);
  readonly panelOpener = input<() => HTMLElement | undefined>(() => undefined);
  private get open(): boolean {
    const element = this.host.nativeElement;
    return this.panelOpen() ?? (element instanceof HTMLDialogElement && element.open);
  }
  readonly panelBusy = input(false);
  @Output() readonly panelDismiss = new EventEmitter<PanelDismissReason>();
  private view = false;
  private height: number | null = null;

  readonly panelInternalView = input(false);

  constructor() {
    // Runs before the host view's embedded panel content refreshes, so the outgoing view is measured.
    effect(() => {
      const active = this.panelInternalView();
      const panel = this.host.nativeElement.querySelector<HTMLElement>('.toolbar-panel');
      if (active && !this.view) this.height = panel?.getBoundingClientRect().height ?? null;
      this.view = active;
      if (panel) panel.style.height = active && this.height !== null ? `${this.height}px` : '';
    });
  }

  @HostListener('keydown.escape', ['$event'])
  onDialogEscape(event: Event): void {
    if (this.host.nativeElement instanceof HTMLDialogElement) {
      event.stopPropagation();
      this.onEscape(event);
    }
  }

  @HostListener('document:keydown.escape', ['$event'])
  onEscape(event: Event): void {
    if (!this.open || this.panelBusy()) return;
    event.preventDefault();
    this.panelDismiss.emit(this.view ? 'back' : 'close');
  }

  @HostListener('document:click', ['$event'])
  onOutside(event: MouseEvent): void {
    if (this.open && !this.panelBusy() && event.target instanceof Node && !this.host.nativeElement.contains(event.target) && !this.panelOpener()()?.contains(event.target)) {
      this.panelDismiss.emit('outside');
    }
  }
}
