import { Component, Input, Output, EventEmitter, afterNextRender, inject, ElementRef, DestroyRef, Injector } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { observeToolbarBounds } from '../../../utils/toolbar-panel-anchor';
import type { Board } from '../../../models/board';

@Component({ selector: 'app-board-profile', standalone: true, imports: [CommonModule, FormsModule], templateUrl: './board-profile.html', styleUrl: './board-profile.css' })
export class BoardProfileComponent {
  constructor() {
    const host: HTMLElement = inject(ElementRef).nativeElement;
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const toolbar = host.closest('.page')?.querySelector<HTMLElement>('.bottom-actions');
      if (!toolbar) return;
      const disconnect = observeToolbarBounds(toolbar, bounds => {
        host.style.setProperty('--profile-toolbar-clearance', `${window.innerHeight - bounds.top}px`);
      });
      destroyRef.onDestroy(disconnect);
    });
  }

  @Input() board: Board = undefined!;
  private editing = false;
  private readonly element = inject(ElementRef);
  private readonly injector = inject(Injector);
  @Input() set isWidgetEditMode(value: boolean) {
    if (value === this.editing) return;
    const rail = (this.element.nativeElement as HTMLElement).querySelector<HTMLElement>('.board-rail');
    const previousTop = rail?.getBoundingClientRect().top;
    this.editing = value;
    if (!rail || previousTop === undefined) return;
    afterNextRender(() => {
      if (!rail.isConnected || !rail.animate || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
      const distance = previousTop - rail.getBoundingClientRect().top;
      if (Math.abs(distance) < 1) return;
      rail.animate([{ translate: `0 ${distance}px` }, { translate: '0 0' }],
        { duration: 260, easing: 'cubic-bezier(.2,.7,.2,1)' });
    }, { injector: this.injector });
  }
  get isWidgetEditMode() { return this.editing; }
  @Input() profileNameDraft: string = '';
  @Input() boardDraftHeadline: string = '';
  @Input() boardDraftWebsite: string = '';
  @Input() isWidgetSaving: boolean = false;
  @Input() readOnlyView: boolean = false;
  @Input() canEditBoard: boolean = false;
  @Input() isSettingsReloading: boolean = false;
  @Input() isWidgetLoading: boolean = false;
  @Input() isIdentitySaving: boolean = false;
  @Input() settingsFeedback: string = '';
  @Output() readonly profileNameDraftChange = new EventEmitter<string>();
  @Output() readonly boardDraftHeadlineChange = new EventEmitter<string>();
  @Output() readonly boardDraftWebsiteChange = new EventEmitter<string>();
  @Output() readonly edit = new EventEmitter<void>();
  @Output() readonly save = new EventEmitter<void>();
  @Output() readonly cancel = new EventEmitter<void>();
  safeWebsite(value?: string): string | null { try { const url = new URL(value || ''); return ['http:', 'https:'].includes(url.protocol) ? url.href : null; } catch { return null; } }
}
