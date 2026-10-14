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
  private lastEmbedUrl: unknown;
  private trustedEmbedUrl: SafeResourceUrl | null = null;

  @Input({ required: true }) widget!: Widget;

  get safeEmbedUrl(): SafeResourceUrl | null {
    const embedUrl = this.widget?.config?.['embedUrl'];
    if (embedUrl !== this.lastEmbedUrl) {
      this.lastEmbedUrl = embedUrl;
      this.trustedEmbedUrl = typeof embedUrl === 'string' && embedUrl.startsWith('http')
        ? this.sanitizer.bypassSecurityTrustResourceUrl(embedUrl) : null;
    }
    return this.trustedEmbedUrl;
  }
}
