import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InsightsService } from '../../services/insights.service';
import type { Widget } from '../../models/widget';

@Component({
  selector: 'app-link-widget',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './link-widget.html',
  styleUrl: './link-widget.css',
})
export class LinkWidgetComponent {
  @Input({ required: true }) widget!: Widget;
  @Input() boardId?: string;
  private readonly insights = inject(InsightsService);

  recordClick() {
    if (this.boardId && this.widget.id > 0) {
      this.insights.recordWidgetClick(this.boardId, this.widget.id).subscribe({ error: () => {} });
    }
  }

  get description(): string { return typeof this.widget?.config?.['description'] === 'string' ? this.widget.config['description'] as string : ''; }
  get imageUrl(): string | null {
    const value = this.widget?.config?.['imageUrl'];
    return typeof value === 'string' && (value.startsWith('https://') || (value.startsWith('/') && !value.startsWith('//'))) ? value : null;
  }

  get url(): string | null {
    const maybeUrl = this.widget?.config?.['url'];
    if (typeof maybeUrl !== 'string' || !maybeUrl.startsWith('http')) {
      return null;
    }
    return maybeUrl;
  }
}
