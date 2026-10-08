import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import type { Board, BoardAppearance } from '../../../models/board';
import type { AccountMenuBoard } from '../board-page.account';
import { IconComponent } from '../../../components/icon/icon';
import { AppearanceSettingsComponent } from '../../../components/appearance-settings/appearance-settings';
import { PanelBehaviorDirective, PanelDismissReason } from '../../../directives/panel-behavior';
import { boardRoute } from '../../../models/board-route';

@Component({ selector: 'app-board-settings', standalone: true, imports: [CommonModule, FormsModule, IconComponent, AppearanceSettingsComponent, PanelBehaviorDirective], templateUrl: './board-settings.html', styleUrl: './board-settings.css' })
export class BoardSettingsComponent {
  @Input() board: Board = undefined!;
  @Input() menuLabel: string = '';
  @Input() boardIdentityNameDraft: string = '';
  @Input() boardIdentitySlugDraft: string = '';
  @Input() appearanceDraft: BoardAppearance = undefined!;
  @Input() accountBoards: AccountMenuBoard[] = [];
  @Input() accountMainBoardId: string = '';
  @Input() pendingDeleteBoardUrl: string | null = null;
  @Input() pendingDeleteBoardLabel: string = '';
  @Input() accountActionError: string = '';
  @Input() boardDeleteError: string = '';
  @Input() deletingBoardUrl: string = '';
  @Input() identitySaveError: string = '';
  @Input() isSettingsReloading: boolean = false;
  @Input() isBoardIdentityMenuOpen: boolean = false;
  @Input() isWidgetEditMode: boolean = false;
  @Input() isWidgetLoading: boolean = false;
  @Input() isWidgetSaving: boolean = false;
  @Input() isIdentitySaving: boolean = false;
  @Input() isBoardSwitcherOpen: boolean = false;
  @Input() isSettingMainBoard: boolean = false;
  @Input() hasUnsavedChanges: boolean = false;
  @Input() isDeletingBoard: boolean = false;
  @Output() readonly toggle = new EventEmitter<void>();
  @Output() readonly save = new EventEmitter<void>();
  @Output() readonly reset = new EventEmitter<void>();
  @Output() readonly toggleSwitcher = new EventEmitter<void>();
  @Output() readonly confirmDelete = new EventEmitter<void>();
  @Output() readonly boardIdentityNameDraftChange = new EventEmitter<string>();
  @Output() readonly boardIdentitySlugDraftChange = new EventEmitter<string>();
  @Output() readonly appearanceChange = new EventEmitter<BoardAppearance>();
  @Output() readonly switchBoard = new EventEmitter<string>();
  @Output() readonly deleteBoard = new EventEmitter<MouseEvent>();
  @Output() readonly setMain = new EventEmitter<{ id: string; event: MouseEvent }>();
  @Output() readonly dismiss = new EventEmitter<PanelDismissReason>();
  readonly boardRoute = boardRoute;
}
