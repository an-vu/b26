import {
  afterNextRender,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  Injector,
  Input,
  input,
  model,
  output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { observeToolbarBounds } from '../../../utils/toolbar-panel-anchor';
import type { Board } from '../../../models/board';

@Component({
  selector: 'app-board-profile',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './board-profile.html',
  styleUrl: './board-profile.css',
})
export class BoardProfileComponent {
  private readonly host: HTMLElement = inject(ElementRef).nativeElement;
  private readonly injector = inject(Injector);
  private editing = false;

  readonly board = input.required<Board>();
  readonly profileNameDraft = model('');
  readonly boardDraftHeadline = model('');
  readonly boardDraftWebsite = model('');
  readonly isWidgetSaving = input(false);
  readonly canEdit = input(false);
  readonly isSettingsReloading = input(false);
  readonly isWidgetLoading = input(false);
  readonly isIdentitySaving = input(false);
  readonly settingsFeedback = input('');
  readonly edit = output<void>();
  readonly save = output<void>();
  readonly cancel = output<void>();

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const toolbar = this.host.closest('.page')?.querySelector<HTMLElement>('.bottom-actions');
      if (!toolbar) return;
      const disconnect = observeToolbarBounds(toolbar, (bounds) => {
        this.host.style.setProperty(
          '--profile-toolbar-clearance',
          `${window.innerHeight - bounds.top}px`,
        );
      });
      destroyRef.onDestroy(disconnect);
    });
  }

  /**
   * A setter rather than a signal input: the rail's position must be measured before the edit
   * fields render, and signal effects only run after this component's template has updated.
   */
  @Input() set isWidgetEditMode(value: boolean) {
    if (value === this.editing) return;
    const rail = this.host.querySelector<HTMLElement>('.board-rail');
    const previousTop = rail?.getBoundingClientRect().top;
    this.editing = value;
    if (!rail || previousTop === undefined) return;
    afterNextRender(
      () => {
        if (!rail.isConnected || !rail.animate) return;
        if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
        const distance = previousTop - rail.getBoundingClientRect().top;
        if (Math.abs(distance) < 1) return;
        rail.animate([{ translate: `0 ${distance}px` }, { translate: '0 0' }], {
          duration: 260,
          easing: 'cubic-bezier(.2,.7,.2,1)',
        });
      },
      { injector: this.injector },
    );
  }
  get isWidgetEditMode() {
    return this.editing;
  }

  safeWebsite(value?: string): string | null {
    try {
      const url = new URL(value || '');
      return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
    } catch {
      return null;
    }
  }
}
