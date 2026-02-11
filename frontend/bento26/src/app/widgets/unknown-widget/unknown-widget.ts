import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { Widget } from '../../models/widget';

@Component({
  selector: 'app-unknown-widget',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './unknown-widget.html',
  styleUrl: './unknown-widget.css',
})
export class UnknownWidgetComponent {
  @Input({ required: true }) widget!: Widget;
}
