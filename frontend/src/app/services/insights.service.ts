import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { InsightsSummary } from '../models/insights';

@Injectable({ providedIn: 'root' })
export class InsightsService {
  constructor(private http: HttpClient) {}

  recordView(boardId: string, source = 'direct'): Observable<void> {
    return this.http.post<void>(`/api/insights/view`, { boardId, source });
  }

  getSummary(boardId: string): Observable<InsightsSummary> {
    return this.http.get<InsightsSummary>(`/api/insights/${boardId}/summary`);
  }
}
