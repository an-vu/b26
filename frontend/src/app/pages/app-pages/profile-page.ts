import { Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { catchError, map, of, startWith, switchMap } from 'rxjs';
import { BoardService } from '../../services/board.service';
import { UserMainBoard } from '../../models/board';
import { BoardPageComponent } from '../board-page/board-page';
import { AppPageShellComponent } from './app-page-shell';

type ProfileState = { loading: boolean; profile: UserMainBoard | null };

@Component({
  standalone: true, imports: [AsyncPipe, BoardPageComponent, AppPageShellComponent],
  template: `
    @if (profile$ | async; as state) {
      @if (state.profile?.mainBoardUrl) {
        <app-board-page />
      } @else {
        <app-page-shell>
          @if (state.loading) {
            <p>Loading profile…</p>
          } @else {
            <h1>{{state.profile?.displayName || state.profile?.username || 'Profile unavailable'}}</h1>
            @if (state.profile) {
              <p>@{{state.profile.username}}</p>
            }
            <p>{{state.profile ? 'No public board yet' : 'This profile could not be found.'}}</p>
          }
        </app-page-shell>
      }
    }`
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
