import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { Board, UpdateBoardMetaRequest, UpdateBoardRequest } from '../models/board';
import type { UpsertWidgetRequest, Widget } from '../models/widget';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class BoardService {
  constructor(private http: HttpClient) {}

  getBoard(boardId: string): Observable<Board> {
    return this.http.get<Board>(`${environment.apiBaseUrl}/api/board/${boardId}`);
  }

  updateBoard(boardId: string, payload: UpdateBoardRequest): Observable<Board> {
    return this.http.put<Board>(`${environment.apiBaseUrl}/api/board/${boardId}`, payload);
  }

  updateBoardMeta(boardId: string, payload: UpdateBoardMetaRequest): Observable<Board> {
    return this.http.patch<Board>(`${environment.apiBaseUrl}/api/board/${boardId}/meta`, payload);
  }

  getWidgets(boardId: string): Observable<Widget[]> {
    return this.http.get<Widget[]>(`${environment.apiBaseUrl}/api/board/${boardId}/widgets`);
  }

  createWidget(boardId: string, payload: UpsertWidgetRequest): Observable<Widget> {
    return this.http.post<Widget>(`${environment.apiBaseUrl}/api/board/${boardId}/widgets`, payload);
  }

  updateWidget(boardId: string, widgetId: number, payload: UpsertWidgetRequest): Observable<Widget> {
    return this.http.put<Widget>(
      `${environment.apiBaseUrl}/api/board/${boardId}/widgets/${widgetId}`,
      payload
    );
  }

  deleteWidget(boardId: string, widgetId: number): Observable<void> {
    return this.http.delete<void>(`${environment.apiBaseUrl}/api/board/${boardId}/widgets/${widgetId}`);
  }
}
