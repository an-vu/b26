import { TestBed } from '@angular/core/testing';
import { BehaviorSubject, of, Subject } from 'rxjs';
import { InsightsPageComponent } from './insights-page';
import { AuthService } from '../../services/auth.service';
import { BoardService } from '../../services/board.service';
import { InsightsService } from '../../services/insights.service';
import type { AuthUser } from '../../models/auth';

describe('Account-scoped insights', () => {
  it('clears summaries and cancels old account requests when switching accounts or signing out', () => {
    const alice = { id: 'alice' } as AuthUser;
    const user$ = new BehaviorSubject<AuthUser | null>(alice);
    const pending = new Subject<any>();
    const summary = { totalVisits: 123, visitsToday: 1, visitsLast30Days: 2, totalClicks: 3 };
    const service = { getMyBoards: vi.fn(() => of([{ id: 'alice-board' }])) };
    const insights = { getSummary: vi.fn(() => pending) };
    TestBed.configureTestingModule({ providers: [
      { provide: AuthService, useValue: { user$ } },
      { provide: BoardService, useValue: service },
      { provide: InsightsService, useValue: insights },
    ] }).overrideComponent(InsightsPageComponent, { set: { template: '', imports: [] } });
    const page = TestBed.createComponent(InsightsPageComponent).componentInstance;
    let boards: unknown[] = []; let current: unknown;
    const boardSubscription = page.boards$.subscribe(value => boards = value);
    const summarySubscription = page.summary$.subscribe(value => current = value);
    page.select('alice-board'); pending.next(summary);
    expect(current).toEqual(summary);
    const oldBoards = new Subject<any[]>(); service.getMyBoards.mockReturnValue(oldBoards);
    user$.next({ id: 'bob' } as AuthUser);
    expect(pending.observed).toBe(false);
    expect(page.selected).toBe(''); expect(current).toBeNull(); expect(boards).toEqual([]);
    user$.next(null);
    expect(oldBoards.observed).toBe(false);
    oldBoards.next([{ id: 'bob-board' }]); pending.next(summary);
    expect(current).toBeNull(); expect(boards).toEqual([]);
    page.select('alice-board'); expect(insights.getSummary).toHaveBeenCalledTimes(1);
    boardSubscription.unsubscribe(); summarySubscription.unsubscribe();
  });
});
