import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { Profile, UpdateProfileRequest } from '../models/profile';
import type { Widget } from '../models/widget';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  constructor(private http: HttpClient) {}

  getProfile(profileId: string): Observable<Profile> {
    return this.http.get<Profile>(`${environment.apiBaseUrl}/api/profile/${profileId}`);
  }

  updateProfile(profileId: string, payload: UpdateProfileRequest): Observable<Profile> {
    return this.http.put<Profile>(`${environment.apiBaseUrl}/api/profile/${profileId}`, payload);
  }

  getWidgets(profileId: string): Observable<Widget[]> {
    return this.http.get<Widget[]>(`${environment.apiBaseUrl}/api/profile/${profileId}/widgets`);
  }
}
