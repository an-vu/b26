import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import type { Widget } from '../../models/widget';

@Component({
  selector: 'app-embed-widget',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './embed-widget.html',
  styleUrl: './embed-widget.css',
})
export class EmbedWidgetComponent {
  private sanitizer = inject(DomSanitizer);

  @Input({ required: true }) widget!: Widget;

  get safeEmbedUrl(): SafeResourceUrl | null {
    const embedUrl = this.widget?.config?.['embedUrl'];
    if (typeof embedUrl !== 'string' || !embedUrl.startsWith('http')) {
      return null;
    }
    return this.sanitizer.bypassSecurityTrustResourceUrl(embedUrl);
  }
}
