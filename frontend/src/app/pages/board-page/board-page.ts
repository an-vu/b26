import {
  afterNextRender,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  HostListener,
  inject,
  Injector,
  signal,
} from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import { Router } from '@angular/router';

import { BoardAtmosphereComponent } from '../../components/board-atmosphere/board-atmosphere';
import { IconComponent } from '../../components/icon/icon';
import { PanelComponent } from '../../components/panel/panel';
import { SiteNavigationComponent } from '../../components/site-navigation/site-navigation';
import type { PanelDismissReason } from '../../directives/panel-behavior';
import { WidgetBounceDirective } from '../../directives/widget-bounce';
import type { BoardAppearance } from '../../models/board';
import { SiteThemeService } from '../../services/site-theme.service';
import { widgetCornerInset, widgetCornerRadius } from '../../utils/widget-corner.util';
import { getTileLayoutClass } from '../../utils/widget-layout.util';
import { WidgetHostComponent } from '../../widgets/widget-host/widget-host';
import { BoardEditorStore, type EditorDraft } from './board-editor.store';
import { BoardProfileComponent } from './board-profile/board-profile';
import { BoardSettingsComponent } from './board-settings/board-settings';
import { WidgetEditorComponent } from './widget-editor/widget-editor';
import { WidgetEditorMotion } from './widget-editor-motion';
import { WidgetLibraryComponent } from './widget-library/widget-library';

/** View layer of a board: focus, motion and dialogs. State and requests live in BoardEditorStore. */
@Component({
  selector: 'app-board-page',
  standalone: true,
  imports: [
    PanelComponent,
    WidgetLibraryComponent,
    BoardProfileComponent,
    BoardSettingsComponent,
    WidgetEditorComponent,
    IconComponent,
    SiteNavigationComponent,
    WidgetBounceDirective,
    BoardAtmosphereComponent,
    TitleCasePipe,
    WidgetHostComponent,
  ],
  providers: [BoardEditorStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './board-page.html',
  styleUrls: ['./board-page.layout.css', './board-page.grid.css', './board-page.widget-edit.css'],
})
export class BoardPageComponent {
  readonly store = inject(BoardEditorStore);
  readonly settings = this.store.settings;
  readonly siteTheme = inject(SiteThemeService);
  private readonly router = inject(Router);
  private readonly host: HTMLElement = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly injector = inject(Injector);

  readonly editorMotion = new WidgetEditorMotion(this.host, () => this.settings.appearance().radiusStep);
  readonly widgetEditorClosing = signal(false);
  private widgetEditorOpener?: HTMLElement;
  private widgetEditorSnapshot?: { draft: EditorDraft; index: number };

  readonly tileLayoutClass = getTileLayoutClass;

  constructor() {
    // A board shows its own look (theme, color, light/dark), for its owner and for visitors.
    // Settings drafts flow through, so edits preview instantly. While the next board loads, the
    // current look stays to avoid a flash; a missing or denied board falls back to the app theme.
    effect(() => {
      const status = this.store.page().status;
      if (status === 'ready') this.siteTheme.showPageAppearance(this, this.settings.appearance());
      else if (status !== 'loading') this.siteTheme.releasePageAppearance(this);
    });
    this.destroyRef.onDestroy(() => {
      this.editorMotion.destroy();
      this.siteTheme.releasePageAppearance(this);
    });
  }

  get boardRadius() {
    return widgetCornerRadius(this.settings.appearance().radiusStep);
  }

  get widgetEditorInset() {
    return widgetCornerInset(this.settings.appearance().radiusStep);
  }

  canLeaveBoard(): boolean {
    return this.store.canLeave();
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent) {
    if (this.store.blocksUnload()) {
      event.preventDefault();
      event.returnValue = '';
    }
  }

  readonly prepareSignOut = () => {
    if (!this.canLeaveBoard()) return false;
    this.store.cancelEdit();
    this.store.resetIdentityDraft();
    return true;
  };

  switchToBoard(route: string) {
    if (!this.canLeaveBoard()) return;
    this.store.closeSettings();
    void this.router.navigateByUrl(route);
  }

  // Board settings panel ---------------------------------------------------------------------

  toggleBoardIdentityMenu() {
    if (!this.store.canEdit() || this.store.settingsReloading()) return;
    if (this.store.settingsOpen()) {
      this.closeBoardIdentityMenu(true);
      return;
    }
    this.store.openSettings();
    this.focusAfterRender('input[name="board-identity-name"]');
  }

  closeBoardIdentityMenu(restoreFocus = false) {
    this.store.closeSettings();
    if (restoreFocus) this.host.querySelector<HTMLElement>('.board-identity-button')?.focus();
  }

  dismissBoardSettings(reason: PanelDismissReason) {
    if (reason !== 'back') this.closeBoardIdentityMenu(reason === 'close');
    else if (this.store.pendingDelete()) this.store.cancelBoardDelete();
    else this.store.switcherOpen.set(false);
  }

  saveSettings() {
    this.store.saveSettings(this.focusSettingsError);
  }

  changeAppearance(appearance: BoardAppearance) {
    this.store.changeAppearance(appearance, this.focusSettingsError);
  }

  resetAppearance() {
    this.store.resetAppearance(this.focusSettingsError);
  }

  private readonly focusSettingsError = () => this.focusAfterRender('#board-settings-error');

  // Widget editor ----------------------------------------------------------------------------

  addWidgetFromLibrary(selection: { type: 'link' | 'embed' | 'map'; origin: DOMRect }) {
    const added = this.store.addDraft(selection.type);
    if (!added) return;
    afterNextRender(
      () => {
        if (!this.store.editing() || this.store.drafts().at(-1)?.key !== added.key) return;
        const tiles = this.host.querySelectorAll<HTMLElement>('.widget-edit-tile');
        const tile = tiles.item(tiles.length - 1);
        if (!tile) return;
        tile.scrollIntoView?.({ block: 'nearest', behavior: 'instant' });
        if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || !tile.animate) return;
        const target = tile.getBoundingClientRect();
        const x = selection.origin.left - target.left;
        const y = selection.origin.top - target.top;
        const scale = target.width ? selection.origin.width / target.width : 1;
        const frame = { transformOrigin: '0 0', zIndex: '21' };
        tile.animate(
          [
            { ...frame, transform: `translate(${x}px, ${y}px) scale(${scale})`, opacity: 0.5 },
            {
              ...frame,
              transform: `translate(${x * 0.5}px, ${y * 0.5 - 50}px) scale(1.08)`,
              opacity: 1,
              offset: 0.55,
            },
            { ...frame, transform: 'translate(0, 0) scale(1)', opacity: 1 },
          ],
          { duration: 480, easing: 'cubic-bezier(.2,.7,.2,1)' },
        );
      },
      { injector: this.injector },
    );
  }

  @HostListener('window:resize')
  positionWidgetEditor() {
    this.editorMotion.position();
  }

  @HostListener('document:pointerdown', ['$event'])
  dismissWidgetEditorOutside(event: PointerEvent) {
    const target = event.target;
    if (
      this.store.selectedDraft() &&
      target instanceof Element &&
      !target.closest('.widget-editor-flipper')
    ) {
      this.closeWidgetSettings(true);
    }
  }

  openWidgetSettings(draft: EditorDraft, event?: Event) {
    const index = this.store.drafts().indexOf(draft);
    if (!this.store.selectDraft(draft)) return;
    this.widgetEditorSnapshot = { draft, index };
    this.positionWidgetEditor();
    this.widgetEditorOpener =
      event?.currentTarget instanceof HTMLElement ? event.currentTarget : undefined;
    this.editorMotion.setOrigin(this.widgetEditorOpener?.getBoundingClientRect());
    afterNextRender(
      () => {
        this.editorMotion.flip();
        this.host
          .querySelector<HTMLInputElement>('.widget-editor-back input')
          ?.focus({ preventScroll: true });
      },
      { injector: this.injector },
    );
  }

  closeWidgetSettings(cancel = false) {
    if (this.widgetEditorClosing()) return;
    const snapshot = this.widgetEditorSnapshot;
    if (cancel && this.store.selectedDraft() && snapshot) {
      this.store.restoreDraft(snapshot.draft, snapshot.index);
    }
    const finish = () => {
      if (this.destroyRef.destroyed) return;
      this.store.selectedKey.set(null);
      this.widgetEditorClosing.set(false);
      afterNextRender(() => this.widgetEditorOpener?.focus(), { injector: this.injector });
    };
    // Render now: layout or order may have changed while the back was open.
    this.cdr.detectChanges();
    const destination = this.host
      .querySelector<HTMLElement>('.widget-edit-source-hidden')
      ?.getBoundingClientRect();
    if (destination && destination.width > 0 && destination.height > 0) {
      this.editorMotion.setOrigin(destination);
    }
    const animation = this.editorMotion.flip(true);
    if (!animation) {
      finish();
      return;
    }
    this.widgetEditorClosing.set(true);
    animation.finished.then(finish, finish);
  }

  trapWidgetEditorFocus(event: Event) {
    const keyboard = event as KeyboardEvent;
    const panel = event.currentTarget as HTMLElement;
    const controls = Array.from(
      panel.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled)',
      ),
    );
    const first = controls[0];
    const last = controls.at(-1);
    if (keyboard.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!keyboard.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }

  private focusAfterRender(selector: string) {
    afterNextRender(() => this.host.querySelector<HTMLElement>(selector)?.focus(), {
      injector: this.injector,
    });
  }
}
