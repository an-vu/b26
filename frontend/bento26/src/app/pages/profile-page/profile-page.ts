import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { switchMap } from 'rxjs/operators';
import { catchError, map, of, startWith, Subject } from 'rxjs';
import { FormsModule } from '@angular/forms';

import { ProfileService } from '../../services/profile.service';
import { ProfileHeaderComponent } from '../../components/profile-header/profile-header';
import { CardGridComponent } from '../../components/card-grid/card-grid';
import type { Profile, UpdateProfileRequest } from '../../models/profile';
import type { Widget } from '../../models/widget';
import { WidgetHostComponent } from '../../widgets/widget-host/widget-host';

type ProfilePageState =
  | { status: 'loading' }
  | { status: 'ready'; profile: Profile }
  | { status: 'missing' };

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ProfileHeaderComponent, CardGridComponent, WidgetHostComponent],
  templateUrl: './profile-page.html',
  styleUrl: './profile-page.css',
})
export class ProfilePageComponent {
  private route = inject(ActivatedRoute);
  private profileService = inject(ProfileService);
  private reload$ = new Subject<void>();

  isEditMode = false;
  isSaving = false;
  saveError = '';
  editDraft: UpdateProfileRequest | null = null;

  pageState$ = this.reload$.pipe(
    startWith(undefined),
    switchMap(() =>
      this.route.paramMap.pipe(
        switchMap((params) =>
          this.profileService.getProfile(params.get('profileId') ?? 'default').pipe(
            map((profile): ProfilePageState => ({ status: 'ready', profile })),
            catchError(() => of<ProfilePageState>({ status: 'missing' })),
            startWith<ProfilePageState>({ status: 'loading' })
          )
        )
      )
    )
  );

  widgets$ = this.reload$.pipe(
    startWith(undefined),
    switchMap(() =>
      this.route.paramMap.pipe(
        switchMap((params) =>
          this.profileService.getWidgets(params.get('profileId') ?? 'default').pipe(catchError(() => of<Widget[]>([])))
        )
      )
    )
  );

  startEdit(profile: Profile) {
    this.editDraft = {
      name: profile.name,
      headline: profile.headline,
      cards: profile.cards.map((card) => ({ ...card })),
    };
    this.saveError = '';
    this.isEditMode = true;
  }

  cancelEdit() {
    this.isEditMode = false;
    this.isSaving = false;
    this.saveError = '';
    this.editDraft = null;
  }

  saveProfile(profileId: string) {
    if (!this.editDraft || this.isSaving) {
      return;
    }
    this.isSaving = true;
    this.saveError = '';

    this.profileService.updateProfile(profileId, this.editDraft).subscribe({
      next: () => {
        this.cancelEdit();
        this.reload$.next();
      },
      error: (error) => {
        this.isSaving = false;
        this.saveError = error?.error?.message ?? 'Unable to save profile.';
      },
    });
  }

  trackWidget(index: number, widget: Widget) {
    return widget.id ?? index;
  }
}
