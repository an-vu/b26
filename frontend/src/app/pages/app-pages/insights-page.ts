import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { BehaviorSubject, catchError, distinctUntilChanged, map, of, shareReplay, startWith, switchMap, tap } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { BoardService } from '../../services/board.service';
import { InsightsService } from '../../services/insights.service';
import { AppPageShellComponent } from './app-page-shell';

@Component({
  standalone: true, imports: [AsyncPipe, FormsModule, RouterLink, AppPageShellComponent],
  template: `
    <app-page-shell>
      <h1>Insights</h1>
      @if (boards$ | async; as boards) {
        <label>Board
          <select [ngModel]="selected" (ngModelChange)="select($event)">
            <option value="">Choose a board</option>
            @for (board of boards; track board.id) {
              <option [value]="board.id">{{board.boardName}}</option>
            }
          </select>
        </label>
        @if (!boards.length && !error) {
          <p>No boards available. @if (!(signedIn$ | async)) {<a routerLink="/signin">Sign in</a> to view your insights.}</p>
        }
      }
      @if (summary$ | async; as summary) {
        <dl>
          <dt>Total visits</dt><dd>{{summary.totalVisits}}</dd>
          <dt>Visits today</dt><dd>{{summary.visitsToday}}</dd>
          <dt>Last 30 days</dt><dd>{{summary.visitsLast30Days}}</dd>
          <dt>Total clicks</dt><dd>{{summary.totalClicks}}</dd>
        </dl>
      }
      @if (error) {
        <p role="alert">{{error}}</p>
      }
    </app-page-shell>`,
  styleUrl: './insights-page.css'
})
export class InsightsPageComponent {
  private readonly boardService = inject(BoardService);
  private readonly insights = inject(InsightsService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly account$ = inject(AuthService).user$.pipe(
    map(user => user?.id ?? ''), distinctUntilChanged(),
    tap(() => { this.selected = ''; this.error = ''; this.selection.next(''); }),
    shareReplay({ bufferSize: 1, refCount: true })
  );
  readonly signedIn$ = this.account$.pipe(map(Boolean));
  readonly boards$ = this.account$.pipe(switchMap(id => id ? this.boardService.getMyBoards().pipe(
    catchError(() => { this.error = 'Unable to load your boards. Please retry.'; this.cdr.markForCheck(); return of([]); }),
    startWith([])
  ) : of([])));
  private readonly selection = new BehaviorSubject<string>('');
  selected = '';
  error = '';
  readonly summary$ = this.account$.pipe(switchMap(accountId => {
    return accountId ? this.selection.pipe(switchMap(id => id ? this.insights.getSummary(id).pipe(
      catchError(() => {
        this.error = 'Unable to load insights. Please retry.';
        this.cdr.markForCheck();
        return of(null);
      }), startWith(null)
    ) : of(null))) : of(null);
  }));
  select(id: string) {
    this.selected = id;
    this.error = '';
    this.selection.next(id);
  }
}
