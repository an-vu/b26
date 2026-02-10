import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { switchMap } from 'rxjs/operators';
import { catchError, map, of, startWith } from 'rxjs';

import { ProfileService } from '../../services/profile.service';
import { ProfileHeaderComponent } from '../../components/profile-header/profile-header';
import { CardGridComponent } from '../../components/card-grid/card-grid';
import type { Profile } from '../../models/profile';

type ProfilePageState =
  | { status: 'loading' }
  | { status: 'ready'; profile: Profile }
  | { status: 'missing' };

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [CommonModule, ProfileHeaderComponent, CardGridComponent],
  templateUrl: './profile-page.html',
  styleUrl: './profile-page.css',
})
export class ProfilePageComponent {
  private route = inject(ActivatedRoute);
  private profileService = inject(ProfileService);

  pageState$ = this.route.paramMap.pipe(
    switchMap((params) =>
      this.profileService.getProfile(params.get('profileId') ?? 'default').pipe(
        map((profile): ProfilePageState => ({ status: 'ready', profile })),
        catchError(() => of<ProfilePageState>({ status: 'missing' })),
        startWith<ProfilePageState>({ status: 'loading' })
      )
    )
  );
}
