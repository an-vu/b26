import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, map, of, startWith } from 'rxjs';
import { AnalyticsService } from '../../services/analytics.service';
import { BoardHeaderComponent } from '../../components/board-header/board-header';

type AnalyticsPageState =
  | { status: 'loading' }
  | {
      status: 'ready';
      summary: {
        totalVisits: number;
        visitsLast30Days: number;
        visitsToday: number;
        totalClicks: number;
        topClickedLinks: Array<{ cardId: string; clickCount: number }>;
      };
    }
  | { status: 'error' };

@Component({
  selector: 'app-analytics-page',
  standalone: true,
  imports: [CommonModule, RouterLink, BoardHeaderComponent],
  templateUrl: './analytics-page.html',
  styleUrl: './analytics-page.css',
})
export class AnalyticsPageComponent {
  private analyticsService = inject(AnalyticsService);
  private elementRef = inject(ElementRef<HTMLElement>);

  isAccountMenuOpen = false;
  private readonly analyticsBoardId = 'default';

  accountBoards = [
    { label: 'Default', route: '/b/default' },
    { label: 'Berkshire', route: '/b/berkshire' },
    { label: 'Union Pacific', route: '/b/union-pacific' },
  ];
  accountUser = {
    name: 'An Vu',
    username: '@anvu',
  };

  state$ = this.analyticsService.getSummary(this.analyticsBoardId).pipe(
    map(
      (summary): AnalyticsPageState => ({
        status: 'ready',
        summary: {
          totalVisits: summary.totalVisits,
          visitsLast30Days: summary.visitsLast30Days,
          visitsToday: summary.visitsToday,
          totalClicks: summary.totalClicks,
          topClickedLinks: summary.topClickedLinks,
        },
      })
    ),
    catchError(() => of<AnalyticsPageState>({ status: 'error' })),
    startWith<AnalyticsPageState>({ status: 'loading' })
  );

  constructor() {
    this.analyticsService.recordView(this.analyticsBoardId, 'analytics').subscribe({ error: () => {} });
  }

  toggleAccountMenu() {
    this.isAccountMenuOpen = !this.isAccountMenuOpen;
  }

  closeAccountMenu() {
    this.isAccountMenuOpen = false;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.isAccountMenuOpen) {
      return;
    }
    const target = event.target;
    const menuWrap = this.elementRef.nativeElement.querySelector('.account-menu-wrap');
    if (!(target instanceof Node) || !menuWrap || !menuWrap.contains(target)) {
      this.closeAccountMenu();
    }
  }

  @HostListener('document:keydown.escape')
  onEscapeKey() {
    if (this.isAccountMenuOpen) {
      this.closeAccountMenu();
    }
  }
}
