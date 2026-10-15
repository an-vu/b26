import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { WidgetDraft } from '../board-page.widget-edit';

/** Edits one draft; changes are emitted as patches so the store can replace the draft. */
@Component({
  selector: 'app-widget-editor',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './widget-editor.html',
  styleUrl: './widget-editor.css',
})
export class WidgetEditorComponent {
  readonly draft = input.required<WidgetDraft>();
  readonly disabled = input(false);
  readonly error = input('');
  readonly draftChange = output<Partial<WidgetDraft>>();
}
