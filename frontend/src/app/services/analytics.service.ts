import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import type { AnalyticsSummary } from '../models/analytics';

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  constructor(private http: HttpClient) {}

  recordView(boardId: string, source = 'direct'): Observable<void> {
    return this.http.post<void>(`${environment.apiBaseUrl}/api/analytics/view`, { boardId, source });
  }

  getSummary(boardId: string): Observable<AnalyticsSummary> {
    return this.http.get<AnalyticsSummary>(`${environment.apiBaseUrl}/api/analytics/${boardId}/summary`);
  }
}
