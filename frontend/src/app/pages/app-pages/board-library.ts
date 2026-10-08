import { ChangeDetectorRef, Component, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, switchMap, of, Observable, distinctUntilChanged, map } from 'rxjs';
import { BoardService } from '../../services/board.service';
import { BoardStoreService } from '../../services/board-store.service';
import { UserStoreService } from '../../services/user-store.service';
import { Board } from '../../models/board';
import { boardRoute } from '../../models/board-route';
import { getApiErrorMessage } from '../../utils/api-error.util';

@Component({
  selector: 'app-board-library', standalone: true, imports: [CommonModule, RouterLink],
  template: `<section class="board-library" aria-labelledby="library-title"><h2 id="library-title">Your boards</h2>
    <p>Public boards can be visited by anyone with the link. Your main board appears at your username. Making a board public does not publish it to Home.</p>
    <p *ngIf="error" role="alert">{{error}}</p><p *ngIf="loading">Loading boards…</p>
    <article *ngFor="let board of boards"><div><a [routerLink]="boardRoute(board)">{{board.boardName}}</a><small>{{board.visibility === 'private' ? 'Private' : 'Public'}}{{board.id === mainId ? ' · Main board' : ''}}</small></div>
      <div class="actions"><button class="app-button" type="button" [disabled]="busy" (click)="changeVisibility(board)">{{board.visibility === 'private' ? 'Make public' : 'Make private'}}</button>
      <button class="app-button" type="button" [disabled]="busy" (click)="setMain(board)">{{board.id === mainId ? 'Remove main board' : 'Set as main board'}}</button></div>
    </article><p *ngIf="!loading && !boards.length">Sign in to manage your boards.</p>
    <button class="app-button" *ngIf="boards.length" type="button" [disabled]="busy" (click)="create()">Create private board</button>
  </section>`,
  styleUrl: './board-library.css'
})
export class BoardLibraryComponent {
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly service = inject(BoardService);
  private readonly boardStore = inject(BoardStoreService);
  private readonly userStore = inject(UserStoreService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly boardRoute = boardRoute;
  boards: Board[] = []; mainId = ''; busy = false; loading = true; error = '';
  constructor() {
    this.userStore.profile$.pipe(
      map(profile => profile?.username), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef)
    ).subscribe(() => this.refresh());
  }
  private refresh() {
    forkJoin({ boards: this.service.getMyBoards(), preferences: this.service.getMyPreferences() })
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: ({boards, preferences}) => { this.boards = boards; this.mainId = preferences.mainBoardId; this.loading = false; this.userStore.setMainBoardId(this.mainId); this.cdr.markForCheck(); },
        error: () => { this.loading = false; this.cdr.markForCheck(); }
      });
  }
  changeVisibility(board: Board) {
    if (this.busy) return;
    const visibility = board.visibility === 'private' ? 'public' : 'private';
    const isMain = board.id === this.mainId;
    if (!window.confirm(visibility === 'public' ? `Make “${board.boardName}” public? Anyone with its link will be able to see it.` : isMain ? `Make “${board.boardName}” private and remove it as your main board?` : `Make “${board.boardName}” private? Only you and administrators will be able to see it.`)) return;
    this.busy = true; this.error = '';
    const before: Observable<unknown> = isMain && visibility === 'private' ? this.service.updateMyPreferences({mainBoardId: ''}) : of(null);
    before.pipe(
      switchMap(() => this.service.updateBoardVisibility(board.boardUrl, visibility, board.version ?? 0)),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({next: () => this.finish(), error: error => this.fail(error)});
  }
  setMain(board: Board) {
    if (this.busy) return;
    const remove = this.mainId === board.id;
    if (board.visibility === 'private' && !window.confirm(`Make “${board.boardName}” public and set it as your main board? Anyone will be able to visit it at your username.`)) return;
    this.busy = true; this.error = '';
    (!remove && board.visibility === 'private' ? this.service.updateBoardVisibility(board.boardUrl, 'public', board.version ?? 0) : of(board)).pipe(
      switchMap(() => this.service.updateMyPreferences({mainBoardId: remove ? '' : board.id})),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({next: () => this.finish(), error: error => this.fail(error)});
  }
  create() {
    if (this.busy) return;
    this.busy = true; this.error = '';
    this.service.createBoard().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: board => { this.finish(); void this.router.navigateByUrl(boardRoute(board)); }, error: error => this.fail(error)
    });
  }
  private finish() { this.busy = false; this.boardStore.refreshBoards(); this.refresh(); }
  private fail(error: unknown) { this.busy = false; this.error = getApiErrorMessage(error, 'Unable to update board.'); this.refresh(); }
}
