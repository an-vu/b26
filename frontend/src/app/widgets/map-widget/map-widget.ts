import { Component, input } from '@angular/core';
import type { Widget } from '../../models/widget';

@Component({
  selector: 'app-map-widget',
  standalone: true,
  templateUrl: './map-widget.html',
  styleUrl: './map-widget.css',
})
export class MapWidgetComponent {
  readonly widget = input.required<Widget>();

  get places(): string[] {
    const maybePlaces = this.widget()?.config?.['places'];
    if (!Array.isArray(maybePlaces)) {
      return [];
    }
    return maybePlaces.filter((place): place is string => typeof place === 'string');
  }
}
