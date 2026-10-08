import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import type { Board } from '../../../models/board';

@Component({ selector: 'app-board-profile', standalone: true, imports: [CommonModule, FormsModule], templateUrl: './board-profile.html', styleUrl: './board-profile.css' })
export class BoardProfileComponent {
  @Input() board: Board = undefined!;
  @Input() isWidgetEditMode: boolean = false;
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
