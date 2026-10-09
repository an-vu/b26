import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import type { WidgetDraft } from '../board-page.widget-edit';

@Component({ selector: 'app-widget-editor', standalone: true, imports: [CommonModule, FormsModule], templateUrl: './widget-editor.html', styleUrl: './widget-editor.css' })
export class WidgetEditorComponent {
  @Input() draft: WidgetDraft = undefined!;
  @Input() disabled: boolean = false;
  @Input() error: string = '';
  @Output() readonly fieldChange = new EventEmitter<void>();
}
