import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, DestroyRef, ElementRef, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Subject, catchError, map, of, switchMap, timer } from 'rxjs';
import { UserSearchService, UserSearchResult } from '../../services/user-search.service';

type SearchState =
  | { status: 'idle' | 'loading' | 'error' | 'too-long'; results: UserSearchResult[] }
  | { status: 'ready'; results: UserSearchResult[] };

@Component({
  selector: 'app-user-search',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './user-search.html',
  styleUrl: './user-search.css',
})
export class UserSearchComponent {
  @ViewChild('dialog', { static: true }) private dialog!: ElementRef<HTMLDialogElement>;
  private readonly service = inject(UserSearchService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly requests = new Subject<string>();
  query = '';
  state: SearchState = { status: 'idle', results: [] };

  constructor() {
    this.requests.pipe(
      // A new keystroke immediately cancels the old timer/request, preventing stale results.
      switchMap(raw => {
        const query = raw.trim().replace(/^@/, '').toLowerCase();
        if (query.length > 64) return of<SearchState>({ status: 'too-long', results: [] });
        if (query.length < 2) return of<SearchState>({ status: 'idle', results: [] });
        this.state = { status: 'loading', results: [] };
        return timer(300).pipe(
          switchMap(() => this.service.search(query)),
          map(results => ({ status: 'ready', results }) as SearchState),
          catchError(() => of<SearchState>({ status: 'error', results: [] })),
        );
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(state => {
      this.state = state;
      this.cdr.markForCheck();
    });
  }

  open(): void {
    this.setQuery('');
    if (!this.dialog.nativeElement.open) this.dialog.nativeElement.showModal();
  }

  close(): void {
    this.dialog.nativeElement.close();
    this.setQuery('');
  }

  setQuery(value: string): void {
    this.query = value;
    this.requests.next(value);
  }

  retry(): void {
    this.requests.next(this.query);
  }

  onBackdrop(event: MouseEvent): void {
    if (event.target !== this.dialog.nativeElement) return;
    const rect = this.dialog.nativeElement.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) this.close();
  }
}
