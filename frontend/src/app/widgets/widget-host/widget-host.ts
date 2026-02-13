import { Component, HostBinding, Input, OnChanges, Type } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { Widget } from '../../models/widget';
import { DEFAULT_WIDGET_COMPONENT, WIDGET_COMPONENT_REGISTRY } from '../widget-registry';

@Component({
  selector: 'app-widget-host',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './widget-host.html',
  styleUrl: './widget-host.css',
})
export class WidgetHostComponent implements OnChanges {
  @Input({ required: true }) widget!: Widget;
  @Input() previewMode = false;
  @HostBinding('class.widget-host-preview') get isPreviewMode() {
    return this.previewMode;
  }

  component: Type<unknown> = DEFAULT_WIDGET_COMPONENT;
  componentInputs: Record<string, unknown> = {};

  ngOnChanges() {
    this.component = WIDGET_COMPONENT_REGISTRY[this.widget.type] ?? DEFAULT_WIDGET_COMPONENT;
    this.componentInputs = { widget: this.widget };
  }
}
