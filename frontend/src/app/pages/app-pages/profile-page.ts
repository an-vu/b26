import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { catchError, map, of, startWith, switchMap } from 'rxjs';
import { BoardService } from '../../services/board.service';
import { UserMainBoard } from '../../models/board';
import { BoardPageComponent } from '../board-page/board-page';
import { AppPageShellComponent } from './app-page-shell';

type ProfileState = { loading: boolean; profile: UserMainBoard | null };

@Component({
  standalone: true, imports: [CommonModule, BoardPageComponent, AppPageShellComponent],
  template: `
    <ng-container *ngIf="profile$ | async as state">
      <app-board-page *ngIf="state.profile?.mainBoardUrl; else minimal" />
      <ng-template #minimal>
        <app-page-shell>
          <p *ngIf="state.loading; else loaded">Loading profile…</p>
          <ng-template #loaded>
            <h1>{{state.profile?.displayName || state.profile?.username || 'Profile unavailable'}}</h1>
            <p *ngIf="state.profile">@{{state.profile.username}}</p>
            <p>{{state.profile ? 'No public board yet' : 'This profile could not be found.'}}</p>
          </ng-template>
        </app-page-shell>
      </ng-template>
    </ng-container>`
})
export class ProfilePageComponent {
  private readonly service = inject(BoardService);
  readonly profile$ = inject(ActivatedRoute).paramMap.pipe(
    switchMap(params => this.service.getUserMainBoard(params.get('username') || '').pipe(
      map(profile => ({ loading: false, profile } as ProfileState)),
      catchError(() => of<ProfileState>({ loading: false, profile: null })),
      startWith<ProfileState>({ loading: true, profile: null })
    ))
  );
}
