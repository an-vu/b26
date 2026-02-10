import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { switchMap } from 'rxjs/operators';

import type { Profile } from '../../models/profile';
import { ProfileService } from '../../services/profile.service';
import { ProfileHeaderComponent } from '../../components/profile-header/profile-header';
import { CardGridComponent } from '../../components/card-grid/card-grid';

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [CommonModule, ProfileHeaderComponent, CardGridComponent],
  templateUrl: './profile-page.html',
  styleUrl: './profile-page.css',
})
export class ProfilePageComponent {
  profile$ = this.route.paramMap.pipe(
    switchMap((params) => this.profileService.getProfile(params.get('profileId') ?? 'default'))
  );

  constructor(
    private route: ActivatedRoute,
    private profileService: ProfileService
  ) {}
}
