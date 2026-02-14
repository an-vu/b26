import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { Widget } from '../../models/widget';

@Component({
  selector: 'app-user-settings-widget',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-settings-widget.html',
  styleUrl: './user-settings-widget.css',
})
export class UserSettingsWidgetComponent {
  @Input({ required: true }) widget!: Widget;
}
