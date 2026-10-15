import { Component, Type, computed, input } from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import type { Widget } from '../../models/widget';
import { DEFAULT_WIDGET_COMPONENT, WIDGET_COMPONENT_REGISTRY } from '../widget-registry';

@Component({
  selector: 'app-widget-host',
  standalone: true,
  imports: [NgComponentOutlet],
  templateUrl: './widget-host.html',
  styleUrl: './widget-host.css',
  host: { '[class.widget-host-preview]': 'previewMode()' },
})
export class WidgetHostComponent {
  readonly widget = input.required<Widget>();
  readonly previewMode = input(false);
  readonly boardId = input<string>();

  readonly component = computed<Type<unknown>>(() => WIDGET_COMPONENT_REGISTRY[this.widget().type] ?? DEFAULT_WIDGET_COMPONENT);
  readonly componentInputs = computed<Record<string, unknown>>(() => {
    const widget = this.widget();
    return {
      widget,
      ...(widget.type === 'link' ? { boardId: this.previewMode() ? undefined : this.boardId() } : {}),
    };
  });
}
