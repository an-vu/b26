import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import type {
  Board,
  SystemRoutes,
  UpdateBoardIdentityRequest,
  UpdateBoardMetaRequest,
  UpdateBoardRequest,
  UpdateBoardUrlRequest,
  UpdateSystemRoutesRequest,
  UserMainBoard,
  UserProfile,
  UpdateUserPreferencesRequest,
  UpdateUserProfileRequest,
  UserPreferences,
  BoardPermissions,
} from '../models/board';
import type { SyncWidgetsRequest, UpsertWidgetRequest, Widget } from '../models/widget';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class BoardService {
  constructor(private http: HttpClient) {}

  getBoard(boardId: string): Observable<Board> {
    return this.http.get<Board>(`/api/board/${boardId}`);
  }

  getBoards(): Observable<Board[]> {
    return this.http.get<Board[]>(`/api/board`);
  }

  getMyBoards(): Observable<Board[]> {
    return this.http.get<Board[]>(`/api/board/mine`);
  }

  createBoard(): Observable<Board> {
    return this.http.post<Board>(`/api/board`, {}, this.withAdminHeader());
  }

  updateBoard(boardId: string, payload: UpdateBoardRequest): Observable<Board> {
    return this.http.put<Board>(`/api/board/${boardId}`, payload, this.withAdminHeader());
  }

  updateBoardMeta(boardId: string, payload: UpdateBoardMetaRequest): Observable<Board> {
    return this.http.patch<Board>(
      `/api/board/${boardId}/meta`,
      payload,
      this.withAdminHeader()
    );
  }

  updateBoardUrl(boardId: string, payload: UpdateBoardUrlRequest): Observable<Board> {
    return this.http.patch<Board>(
      `/api/board/${boardId}/url`,
      payload,
      this.withAdminHeader()
    );
  }

  updateBoardIdentity(boardId: string, payload: UpdateBoardIdentityRequest): Observable<Board> {
    return this.http.patch<Board>(
      `/api/board/${boardId}/identity`,
      payload,
      this.withAdminHeader()
    );
  }

  getBoardPermissions(boardId: string): Observable<BoardPermissions> {
    return this.http.get<BoardPermissions>(`/api/board/${boardId}/permissions`);
  }

  getWidgets(boardId: string): Observable<Widget[]> {
    return this.http.get<Widget[]>(`/api/board/${boardId}/widgets`);
  }

  createWidget(boardId: string, payload: UpsertWidgetRequest): Observable<Widget> {
    return this.http.post<Widget>(
      `/api/board/${boardId}/widgets`,
      payload,
      this.withAdminHeader()
    );
  }

  updateWidget(boardId: string, widgetId: number, payload: UpsertWidgetRequest): Observable<Widget> {
    return this.http.put<Widget>(
      `/api/board/${boardId}/widgets/${widgetId}`,
      payload,
      this.withAdminHeader()
    );
  }

  deleteWidget(boardId: string, widgetId: number): Observable<void> {
    return this.http.delete<void>(
      `/api/board/${boardId}/widgets/${widgetId}`,
      this.withAdminHeader()
    );
  }

  syncWidgets(boardId: string, payload: SyncWidgetsRequest): Observable<Widget[]> {
    return this.http.put<Widget[]>(
      `/api/board/${boardId}/widgets/sync`,
      payload,
      this.withAdminHeader()
    );
  }

  getSystemRoutes(): Observable<SystemRoutes> {
    return this.http.get<SystemRoutes>(`/api/system/routes`);
  }

  updateSystemRoutes(payload: UpdateSystemRoutesRequest): Observable<SystemRoutes> {
    return this.http.patch<SystemRoutes>(
      `/api/system/routes`,
      payload,
      this.withAdminHeader()
    );
  }

  getMyPreferences(): Observable<UserPreferences> {
    return this.http.get<UserPreferences>(`/api/users/me/preferences`);
  }

  updateMyPreferences(payload: UpdateUserPreferencesRequest): Observable<UserPreferences> {
    return this.http.patch<UserPreferences>(
      `/api/users/me/preferences`,
      payload,
      this.withAdminHeader()
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
      payload,
      this.withAdminHeader()
    );
  }

  private withAdminHeader() {
    const token = this.resolveAdminToken();
    if (!token) {
      return {};
    }
    return { headers: new HttpHeaders({ 'X-Admin-Token': token }) };
  }

  private resolveAdminToken(): string {
    if (environment.adminToken && environment.adminToken.trim()) {
      return environment.adminToken.trim();
    }

    try {
      return localStorage.getItem('b26_admin_token')?.trim() ?? '';
    } catch {
      return '';
    }
  }
}
