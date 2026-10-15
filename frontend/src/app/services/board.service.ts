import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type {
  Board,
  BoardPage,
  BoardEdit,
  SaveBoardEditRequest,
  UpdateBoardIdentityRequest,
  UserMainBoard,
  UserProfile,
  UpdateUserPreferencesRequest,
  UpdateUserProfileRequest,
  UserPreferences,
  BoardPermissions,
} from '../models/board';
import type { Widget } from '../models/widget';
import type { HomeAppearance } from '../models/home-appearance';

@Injectable({ providedIn: 'root' })
export class BoardService {
  private readonly http = inject(HttpClient);

  getEditor(boardUrl: string): Observable<BoardEdit> {
    return this.http.get<BoardEdit>(`/api/board/${boardUrl}/editor`);
  }

  saveEditor(boardUrl: string, payload: SaveBoardEditRequest): Observable<BoardEdit> {
    return this.http.put<BoardEdit>(`/api/board/${boardUrl}/editor`, payload);
  }

  getBoardForUsername(username: string, slug: string): Observable<Board> {
    return this.http.get<Board>(`/api/board/by-owner/${encodeURIComponent(username)}/${encodeURIComponent(slug)}`);
  }

  getBoard(boardId: string): Observable<Board> {
    return this.http.get<Board>(`/api/board/${boardId}`);
  }

  getBoards(page = 0, size = 20): Observable<BoardPage> {
    return this.http.get<BoardPage>('/api/board', { params: { page, size } });
  }

  getMyBoards(): Observable<Board[]> {
    return this.http.get<Board[]>(`/api/board/mine`);
  }

  createBoard(): Observable<Board> {
    return this.http.post<Board>(`/api/board`, {});
  }

  deleteBoard(boardId: string): Observable<void> {
    return this.http.delete<void>(`/api/board/${boardId}`);
  }

  updateBoardIdentity(boardId: string, payload: UpdateBoardIdentityRequest): Observable<Board> {
    return this.http.patch<Board>(
      `/api/board/${boardId}/identity`,
      payload
    );
  }

  updateBoardVisibility(slug: string, visibility: 'public' | 'private', version: number): Observable<Board> {
    return this.http.patch<Board>(`/api/board/${slug}/visibility`, { visibility, version });
  }

  getBoardPermissions(boardId: string): Observable<BoardPermissions> {
    return this.http.get<BoardPermissions>(`/api/board/${boardId}/permissions`);
  }

  getWidgets(boardId: string): Observable<Widget[]> {
    return this.http.get<Widget[]>(`/api/board/${boardId}/widgets`);
  }

  getMyPreferences(): Observable<UserPreferences> {
    return this.http.get<UserPreferences>(`/api/users/me/preferences`);
  }

  getHomeAppearance(): Observable<HomeAppearance> {
    return this.http.get<HomeAppearance>('/api/users/me/preferences/home');
  }

  updateHomeAppearance(appearance: HomeAppearance): Observable<HomeAppearance> {
    return this.http.put<HomeAppearance>('/api/users/me/preferences/home', appearance);
  }

  updateMyPreferences(payload: UpdateUserPreferencesRequest): Observable<UserPreferences> {
    return this.http.patch<UserPreferences>(
      `/api/users/me/preferences`,
      payload
    );
  }

  getUserMainBoard(username: string): Observable<UserMainBoard> {
    return this.http.get<UserMainBoard>(`/api/users/${username}/main-board`);
  }

  getMyProfile(): Observable<UserProfile> {
    return this.http.get<UserProfile>(`/api/users/me`);
  }

  updateMyProfile(payload: UpdateUserProfileRequest): Observable<UserProfile> {
    return this.http.patch<UserProfile>(
      `/api/users/me`,
      payload
    );
  }

}
