import { IconComponent } from '../../components/icon/icon';
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { WidgetHostComponent } from '../../widgets/widget-host/widget-host';
import { HOME_PREVIEW_BOARDS } from './home-preview-data';
import { getWidgetFootprint } from '../../utils/widget-layout.util';
import { boardRoute } from '../../models/board-route';

@Component({
  selector: 'app-home-feed-preview', standalone: true,
  imports: [IconComponent, CommonModule, RouterLink, WidgetHostComponent],
  templateUrl: './home-feed-preview.html', styleUrl: './home-feed-preview.css',
})
export class HomeFeedPreviewComponent {
  readonly posts = [...HOME_PREVIEW_BOARDS].sort((a, b) => a.minutesAgo - b.minutesAgo);
  readonly suggestions = HOME_PREVIEW_BOARDS.filter(item => ['daily', 'feature'].includes(item.board.ownerUsername ?? ''));
  readonly boardRoute = boardRoute;
  columns(layout: string) { return getWidgetFootprint(layout)[0]; }
  rows(layout: string) { return getWidgetFootprint(layout)[1]; }
}
