import { Component, input, model, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PanelComponent } from '../../../components/panel/panel';
import { IconComponent } from '../../../components/icon/icon';
import { AppearanceSettingsComponent } from '../../../components/appearance-settings/appearance-settings';
import { PanelBehaviorDirective, PanelDismissReason } from '../../../directives/panel-behavior';
import type { Board, BoardAppearance } from '../../../models/board';
import { boardRoute } from '../../../models/board-route';
import type { AccountMenuBoard } from '../board-editor.store';

@Component({
  selector: 'app-board-settings',
  standalone: true,
  imports: [PanelComponent, FormsModule, IconComponent, AppearanceSettingsComponent, PanelBehaviorDirective],
  templateUrl: './board-settings.html',
  styleUrl: './board-settings.css',
})
export class BoardSettingsComponent {
  readonly board = input.required<Board>();
  readonly menuLabel = input('');
  readonly boardIdentityNameDraft = model('');
  readonly boardIdentitySlugDraft = model('');
  readonly appearanceDraft = input.required<BoardAppearance>();
  readonly accountBoards = input<AccountMenuBoard[]>([]);
  readonly accountMainBoardId = input('');
  readonly pendingDelete = input<{ boardUrl: string; label: string } | null>(null);
  readonly accountActionError = input('');
  readonly boardDeleteError = input('');
  readonly deletingBoardUrl = input('');
  readonly identitySaveError = input('');
  readonly isSettingsReloading = input(false);
  readonly isBoardIdentityMenuOpen = input(false);
  readonly isWidgetEditMode = input(false);
  readonly isWidgetLoading = input(false);
  readonly isWidgetSaving = input(false);
  readonly isIdentitySaving = input(false);
  readonly isBoardSwitcherOpen = input(false);
  readonly isSettingMainBoard = input(false);
  readonly hasUnsavedChanges = input(false);
  readonly isDeletingBoard = input(false);
  readonly toggle = output<void>();
  readonly save = output<void>();
  readonly reset = output<void>();
  readonly toggleSwitcher = output<void>();
  readonly confirmDelete = output<void>();
  readonly appearancePreview = output<BoardAppearance>();
  readonly appearanceChange = output<BoardAppearance>();
  readonly switchBoard = output<string>();
  readonly deleteBoard = output<void>();
  readonly setMain = output<string>();
  readonly dismiss = output<PanelDismissReason>();
  readonly boardRoute = boardRoute;
}
