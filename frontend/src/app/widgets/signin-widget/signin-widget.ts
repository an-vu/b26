import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { Widget } from '../../models/widget';

@Component({
  selector: 'app-signin-widget',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './signin-widget.html',
  styleUrl: './signin-widget.css',
})
export class SigninWidgetComponent {
  @Input({ required: true }) widget!: Widget;
}
