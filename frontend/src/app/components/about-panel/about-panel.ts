import { Component, DestroyRef, ElementRef, HostListener, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ABOUT_RELEASE } from './release-info';

@Component({
  selector: 'app-about-panel', standalone: true, imports: [CommonModule],
  templateUrl: './about-panel.html', styleUrl: './about-panel.css',
})
export class AboutPanelComponent {
  @ViewChild('dialog', { static: true }) private dialog!: ElementRef<HTMLDialogElement>;
  readonly release = ABOUT_RELEASE;
  private opener?: HTMLElement;
  private toolbar?: HTMLElement;
  private observer?: ResizeObserver;
  constructor() { inject(DestroyRef).onDestroy(() => this.observer?.disconnect()); }
  open(event: Event): void {
    if (this.dialog.nativeElement.open) { this.close(); return; }
    this.opener = event.currentTarget instanceof HTMLElement ? event.currentTarget : undefined;
    this.toolbar = this.opener?.closest<HTMLElement>('.bottom-actions') ?? undefined;
    this.dialog.nativeElement.show(); this.position();
    this.observer?.disconnect();
    if (this.toolbar && typeof ResizeObserver !== 'undefined') {
      this.observer = new ResizeObserver(() => this.position()); this.observer.observe(this.toolbar);
    }
    this.dialog.nativeElement.focus();
  }
  contact(): void {
    if (this.release.contactUrl) window.location.assign(this.release.contactUrl);
  }
  close(restoreFocus = true): void {
    this.dialog.nativeElement.close(); this.observer?.disconnect();
    if (restoreFocus) this.opener?.focus();
  }
  @HostListener('window:resize')
  position(): void {
    if (!this.toolbar || !this.dialog.nativeElement.open) return;
    const bounds = this.toolbar.getBoundingClientRect();
    const gap = parseFloat(getComputedStyle(this.toolbar).getPropertyValue('--toolbar-panel-gap')) || 12;
    const panel = this.dialog.nativeElement;
    panel.style.bottom = `${innerHeight - bounds.top + gap}px`;
    panel.style.right = `${innerWidth - bounds.right}px`;
    panel.style.maxHeight = `${Math.max(80, bounds.top - gap - 12)}px`;
  }
  @HostListener('document:click', ['$event'])
  outside(event: MouseEvent): void {
    const target = event.target;
    if (this.dialog.nativeElement.open && target instanceof Node && !this.dialog.nativeElement.contains(target) && !this.opener?.contains(target)) this.close(false);
  }
}
