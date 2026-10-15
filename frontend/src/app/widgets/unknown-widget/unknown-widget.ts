import { Component, input } from '@angular/core';
import type { Widget } from '../../models/widget';

@Component({
  selector: 'app-unknown-widget',
  standalone: true,
  templateUrl: './unknown-widget.html',
  styleUrl: './unknown-widget.css',
})
export class UnknownWidgetComponent {
  readonly widget = input.required<Widget>();
}
