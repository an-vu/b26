import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { Widget } from '../../models/widget';

@Component({
  selector: 'app-admin-settings-widget',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-settings-widget.html',
  styleUrl: './admin-settings-widget.css',
})
export class AdminSettingsWidgetComponent {
  @Input({ required: true }) widget!: Widget;
}
