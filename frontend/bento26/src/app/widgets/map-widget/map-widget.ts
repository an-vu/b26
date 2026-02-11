import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { Widget } from '../../models/widget';

@Component({
  selector: 'app-map-widget',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './map-widget.html',
  styleUrl: './map-widget.css',
})
export class MapWidgetComponent {
  @Input({ required: true }) widget!: Widget;

  get places(): string[] {
    const maybePlaces = this.widget?.config?.['places'];
    if (!Array.isArray(maybePlaces)) {
      return [];
    }
    return maybePlaces.filter((place): place is string => typeof place === 'string');
  }
}
