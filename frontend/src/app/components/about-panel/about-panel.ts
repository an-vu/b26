import { PanelComponent } from '../panel/panel';
import { PanelCloseAnimation } from '../../utils/panel-close-animation';
import { PanelBehaviorDirective } from '../../directives/panel-behavior';
import { Component, ElementRef, ViewChild, inject, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ABOUT_RELEASE } from './release-info';

@Component({
  selector: 'app-about-panel', standalone: true, imports: [PanelComponent, PanelBehaviorDirective, CommonModule],
  templateUrl: './about-panel.html', styleUrl: './about-panel.css',
})
export class AboutPanelComponent {
  private readonly exit = new PanelCloseAnimation();
  constructor() { inject(DestroyRef).onDestroy(() => this.exit.cancel(this.dialog.nativeElement)); }
  @ViewChild('dialog', { static: true, read: ElementRef }) private dialog!: ElementRef<HTMLDialogElement>;
  readonly release = ABOUT_RELEASE;
  private opener?: HTMLElement;
  readonly panelOpener = () => this.opener;
  open(event: Event): void {
    if (this.dialog.nativeElement.open && !this.exit.closing) { this.close(); return; }
    this.exit.cancel(this.dialog.nativeElement);
    this.opener = event.currentTarget instanceof HTMLElement ? event.currentTarget : undefined;
    this.dialog.nativeElement.show();
    this.dialog.nativeElement.focus();
  }
  contact(): void {
    if (this.release.contactUrl) window.location.assign(this.release.contactUrl);
  }
  close(restoreFocus = true): void {
    this.exit.close(this.dialog.nativeElement, () => {
      if (this.dialog.nativeElement.open) this.dialog.nativeElement.close();
      if (restoreFocus) this.opener?.focus();
    });
  }


}
