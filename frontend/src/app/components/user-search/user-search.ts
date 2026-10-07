import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, DestroyRef, ElementRef, ViewChild, HostListener, inject } from '@angular/core';
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
  private opener?: HTMLElement;
  private toolbar?: HTMLElement;
  private observer?: ResizeObserver;
  query = '';
  state: SearchState = { status: 'idle', results: [] };

  constructor() {
    this.destroyRef.onDestroy(() => this.observer?.disconnect());
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

  open(event?: Event): void {
    if (this.dialog.nativeElement.open) { this.close(); return; }
    this.opener = event?.currentTarget instanceof HTMLElement ? event.currentTarget : undefined;
    this.toolbar = this.opener?.closest<HTMLElement>('.bottom-actions') ?? document.querySelector<HTMLElement>('.bottom-actions') ?? undefined;
    this.setQuery('');
    this.dialog.nativeElement.show();
    this.position();
    this.observer?.disconnect();
    if (this.toolbar && typeof ResizeObserver !== 'undefined') {
      this.observer = new ResizeObserver(() => this.position()); this.observer.observe(this.toolbar);
    }
    this.dialog.nativeElement.querySelector('input')?.focus();
  }

  close(restoreFocus = true): void {
    this.dialog.nativeElement.close();
    this.observer?.disconnect();
    this.setQuery('');
    if (restoreFocus) this.opener?.focus();
  }

  @HostListener('window:resize')
  position(): void {
    if (!this.toolbar || !this.dialog.nativeElement.open) return;
    const bounds = this.toolbar.getBoundingClientRect();
    const gap = parseFloat(getComputedStyle(this.toolbar).getPropertyValue('--toolbar-panel-gap')) || 12;
    const dialog = this.dialog.nativeElement;
    dialog.style.bottom = `${window.innerHeight - bounds.top + gap}px`;
    dialog.style.left = `${bounds.left}px`;
    dialog.style.maxHeight = `${Math.max(80, bounds.top - gap - 12)}px`;
  }

  @HostListener('document:click', ['$event'])
  onOutsideClick(event: MouseEvent): void {
    const target = event.target;
    if (this.dialog.nativeElement.open && target instanceof Node && !this.dialog.nativeElement.contains(target) && !this.opener?.contains(target)) this.close(false);
  }

  setQuery(value: string): void {
    this.query = value;
    this.requests.next(value);
  }

  retry(): void {
    this.requests.next(this.query);
  }

}
