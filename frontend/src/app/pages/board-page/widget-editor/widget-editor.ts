import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import type { WidgetDraft } from '../board-page.widget-edit';

@Component({ selector: 'app-widget-editor', standalone: true, imports: [CommonModule, FormsModule], templateUrl: './widget-editor.html', styleUrl: './widget-editor.css' })
export class WidgetEditorComponent {
  @Input() draft: WidgetDraft = undefined!;
  @Input() isNew: boolean = false;
  @Input() i: number = 0;
  @Input() total: number = 0;
  @Input() disabled: boolean = false;
  @Input() saving: boolean = false;
  @Input() error: string = '';
  @Output() readonly fieldChange = new EventEmitter<void>();
  @Output() readonly typeChange = new EventEmitter<void>();
  @Output() readonly move = new EventEmitter<-1 | 1>();
  @Output() readonly add = new EventEmitter<void>();
}
