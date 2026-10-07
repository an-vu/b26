import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export type UserSearchResult = { username: string; displayName: string };

@Injectable({ providedIn: 'root' })
export class UserSearchService {
  private readonly http = inject(HttpClient);

  search(query: string) {
    return this.http.get<UserSearchResult[]>('/api/search/users', { params: { q: query } });
  }
}
