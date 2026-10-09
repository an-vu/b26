import { PanelComponent } from '../panel/panel';
import { PanelCloseAnimation } from '../../utils/panel-close-animation';
import { PanelBehaviorDirective } from '../../directives/panel-behavior';
import { ToolbarPanelAnchor } from '../../utils/toolbar-panel-anchor';
import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, DestroyRef, ElementRef, ViewChild, inject, signal } from '@angular/core';
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
  imports: [PanelComponent, PanelBehaviorDirective, CommonModule, RouterLink],
  templateUrl: './user-search.html',
  styleUrl: './user-search.css',
})
export class UserSearchComponent {
  private readonly exit = new PanelCloseAnimation();
  readonly isOpen = signal(false);
  @ViewChild('dialog', { static: true, read: ElementRef }) private dialog!: ElementRef<HTMLDialogElement>;
  private readonly service = inject(UserSearchService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly requests = new Subject<string>();
  private opener?: HTMLElement;
  readonly panelOpener = () => this.opener;
  private readonly anchor = new ToolbarPanelAnchor(() => this.dialog.nativeElement, 'left');
  query = '';
  state: SearchState = { status: 'idle', results: [] };

  constructor() {
    this.destroyRef.onDestroy(() => { this.exit.cancel(this.dialog.nativeElement); this.anchor.disconnect(); });
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
    if (this.dialog.nativeElement.open && !this.exit.closing) { this.close(); return; }
    this.exit.cancel(this.dialog.nativeElement);
    this.opener = event?.currentTarget instanceof HTMLElement ? event.currentTarget : undefined;
    this.setQuery('');
    this.dialog.nativeElement.show();
    this.isOpen.set(true);
    this.anchor.connect(this.opener);

    this.dialog.nativeElement.querySelector('input')?.focus();
  }

  close(restoreFocus = true): void {
    this.isOpen.set(false);
    this.exit.close(this.dialog.nativeElement, () => {
      if (this.dialog.nativeElement.open) this.dialog.nativeElement.close();
      this.anchor.disconnect();
      this.setQuery('');
      if (restoreFocus) this.opener?.focus();
    });
  }

  setQuery(value: string): void {
    this.query = value;
    this.requests.next(value);
  }

  retry(): void {
    this.requests.next(this.query);
  }

}
