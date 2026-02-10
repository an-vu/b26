import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { Profile } from '../models/profile';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  constructor(private http: HttpClient) {}

  getProfile(profileId: string): Observable<Profile> {
    return this.http.get<Profile>(`assets/profiles/${profileId}.json`);
  }
}
