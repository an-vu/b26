import { PanelBehaviorDirective } from '../../directives/panel-behavior';
import { Component, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ABOUT_RELEASE } from './release-info';

@Component({
  selector: 'app-about-panel', standalone: true, imports: [PanelBehaviorDirective, CommonModule],
  templateUrl: './about-panel.html', styleUrl: './about-panel.css',
})
export class AboutPanelComponent {
  @ViewChild('dialog', { static: true }) private dialog!: ElementRef<HTMLDialogElement>;
  readonly release = ABOUT_RELEASE;
  private opener?: HTMLElement;
  readonly panelOpener = () => this.opener;
  open(event: Event): void {
    if (this.dialog.nativeElement.open) { this.close(); return; }
    this.opener = event.currentTarget instanceof HTMLElement ? event.currentTarget : undefined;
    this.dialog.nativeElement.show();
    this.dialog.nativeElement.focus();
  }
  contact(): void {
    if (this.release.contactUrl) window.location.assign(this.release.contactUrl);
  }
  close(restoreFocus = true): void {
    this.dialog.nativeElement.close();
    if (restoreFocus) this.opener?.focus();
  }


}
