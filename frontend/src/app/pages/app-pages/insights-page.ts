import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { BehaviorSubject, catchError, of, switchMap } from 'rxjs';
import { BoardService } from '../../services/board.service';
import { InsightsService } from '../../services/insights.service';
import { AppPageShellComponent } from './app-page-shell';

@Component({
  standalone: true, imports: [CommonModule, FormsModule, RouterLink, AppPageShellComponent],
  template: `
    <app-page-shell>
      <h1>Insights</h1>
      <ng-container *ngIf="boards$ | async as boards">
        <label>Board
          <select [ngModel]="selected" (ngModelChange)="select($event)">
            <option value="">Choose a board</option>
            <option *ngFor="let board of boards" [value]="board.id">{{board.boardName}}</option>
          </select>
        </label>
        <p *ngIf="!boards.length">No boards available. <a routerLink="/signin">Sign in</a> to view your insights.</p>
      </ng-container>
      <ng-container *ngIf="summary$ | async as summary">
        <dl>
          <dt>Total visits</dt><dd>{{summary.totalVisits}}</dd>
          <dt>Visits today</dt><dd>{{summary.visitsToday}}</dd>
          <dt>Last 30 days</dt><dd>{{summary.visitsLast30Days}}</dd>
          <dt>Total clicks</dt><dd>{{summary.totalClicks}}</dd>
        </dl>
      </ng-container>
      <p role="alert" *ngIf="error">{{error}}</p>
    </app-page-shell>`,
  styleUrl: './insights-page.css'
})
export class InsightsPageComponent {
  private readonly boardService = inject(BoardService);
  private readonly insights = inject(InsightsService);
  private readonly cdr = inject(ChangeDetectorRef);
  readonly boards$ = this.boardService.getMyBoards().pipe(catchError(() => of([])));
  private readonly selection = new BehaviorSubject<string>('');
  selected = '';
  error = '';
  readonly summary$ = this.selection.pipe(switchMap(id => id ? this.insights.getSummary(id).pipe(
    catchError(() => {
      this.error = 'Unable to load insights. Please retry.';
      this.cdr.markForCheck();
      return of(null);
    })
  ) : of(null)));
  select(id: string) {
    this.selected = id;
    this.error = '';
    this.selection.next(id);
  }
}
