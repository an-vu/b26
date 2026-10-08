import { Directive, ElementRef, HostListener, Input, Output, EventEmitter, inject } from '@angular/core';

export type PanelDismissReason = 'back' | 'close' | 'outside';

/** Shared dismissal and height preservation for toolbar panels with internal views. */
@Directive({ selector: '[appPanelBehavior]', standalone: true })
export class PanelBehaviorDirective {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  @Input() panelOpen?: boolean;
  @Input() panelOpener: () => HTMLElement | undefined = () => undefined;
  private get open(): boolean {
    const element = this.host.nativeElement;
    return this.panelOpen ?? (element instanceof HTMLDialogElement && element.open);
  }
  @Input() panelBusy = false;
  @Output() readonly panelDismiss = new EventEmitter<PanelDismissReason>();
  private view = false;
  private height: number | null = null;

  @Input() set panelInternalView(active: boolean) {
    const panel = this.host.nativeElement.querySelector<HTMLElement>('.toolbar-panel');
    if (active && !this.view) this.height = panel?.getBoundingClientRect().height ?? null;
    this.view = active;
    if (panel) panel.style.height = active && this.height !== null ? `${this.height}px` : '';
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
    if (!this.open || this.panelBusy) return;
    event.preventDefault();
    this.panelDismiss.emit(this.view ? 'back' : 'close');
  }

  @HostListener('document:click', ['$event'])
  onOutside(event: MouseEvent): void {
    if (this.open && !this.panelBusy && event.target instanceof Node && !this.host.nativeElement.contains(event.target) && !this.panelOpener()?.contains(event.target)) {
      this.panelDismiss.emit('outside');
    }
  }
}
