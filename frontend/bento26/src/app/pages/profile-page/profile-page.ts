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
import type { UpsertWidgetRequest, Widget } from '../../models/widget';
import { WidgetHostComponent } from '../../widgets/widget-host/widget-host';

type ProfilePageState =
  | { status: 'loading' }
  | { status: 'ready'; profile: Profile }
  | { status: 'missing' };

type WidgetType = 'embed' | 'map';
type WidgetDraft = {
  id?: number;
  type: WidgetType;
  title: string;
  layout: string;
  enabled: boolean;
  order: number;
  embedUrl: string;
  placesText: string;
};

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
  isWidgetEditMode = false;
  isWidgetSaving = false;
  widgetSaveError = '';
  widgetDrafts: WidgetDraft[] = [];
  newWidgetDraft: WidgetDraft = this.createEmptyWidgetDraft();

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

  startWidgetEdit(widgets: Widget[]) {
    this.widgetDrafts = widgets.map((widget) => this.toWidgetDraft(widget));
    this.newWidgetDraft = this.createEmptyWidgetDraft();
    this.widgetSaveError = '';
    this.isWidgetEditMode = true;
  }

  cancelWidgetEdit() {
    this.isWidgetEditMode = false;
    this.isWidgetSaving = false;
    this.widgetSaveError = '';
    this.widgetDrafts = [];
    this.newWidgetDraft = this.createEmptyWidgetDraft();
  }

  saveWidget(profileId: string, draft: WidgetDraft) {
    const payload = this.buildWidgetPayload(draft);
    if (!payload) {
      this.widgetSaveError = 'Invalid widget config.';
      return;
    }
    this.isWidgetSaving = true;
    this.widgetSaveError = '';

    const request$ = draft.id
      ? this.profileService.updateWidget(profileId, draft.id, payload)
      : this.profileService.createWidget(profileId, payload);

    request$.subscribe({
      next: () => this.refreshWidgetDrafts(profileId),
      error: (error) => {
        this.isWidgetSaving = false;
        this.widgetSaveError = error?.error?.message ?? 'Unable to save widget.';
      },
    });
  }

  deleteWidget(profileId: string, draft: WidgetDraft) {
    if (!draft.id) {
      this.widgetDrafts = this.widgetDrafts.filter((item) => item !== draft);
      return;
    }

    this.isWidgetSaving = true;
    this.widgetSaveError = '';
    this.profileService.deleteWidget(profileId, draft.id).subscribe({
      next: () => this.refreshWidgetDrafts(profileId),
      error: (error) => {
        this.isWidgetSaving = false;
        this.widgetSaveError = error?.error?.message ?? 'Unable to delete widget.';
      },
    });
  }

  addNewWidget(profileId: string) {
    this.saveWidget(profileId, this.newWidgetDraft);
  }

  onNewWidgetTypeChange() {
    this.resetWidgetConfigForType(this.newWidgetDraft);
  }

  onWidgetTypeChange(draft: WidgetDraft) {
    this.resetWidgetConfigForType(draft);
  }

  private refreshWidgetDrafts(profileId: string) {
    this.profileService.getWidgets(profileId).subscribe({
      next: (widgets) => {
        this.isWidgetSaving = false;
        this.widgetDrafts = widgets.map((widget) => this.toWidgetDraft(widget));
        this.newWidgetDraft = this.createEmptyWidgetDraft();
        this.reload$.next();
      },
      error: (error) => {
        this.isWidgetSaving = false;
        this.widgetSaveError = error?.error?.message ?? 'Unable to reload widgets.';
      },
    });
  }

  private toWidgetDraft(widget: Widget): WidgetDraft {
    const places = Array.isArray(widget.config['places'])
      ? (widget.config['places'] as unknown[]).filter((place): place is string => typeof place === 'string')
      : [];
    return {
      id: widget.id,
      type: widget.type === 'map' ? 'map' : 'embed',
      title: widget.title,
      layout: widget.layout,
      enabled: widget.enabled,
      order: widget.order,
      embedUrl: typeof widget.config['embedUrl'] === 'string' ? widget.config['embedUrl'] : '',
      placesText: places.join('\n'),
    };
  }

  private createEmptyWidgetDraft(): WidgetDraft {
    return {
      type: 'embed',
      title: 'New widget',
      layout: 'span-1',
      enabled: true,
      order: 0,
      embedUrl: '',
      placesText: '',
    };
  }

  private buildWidgetPayload(draft: WidgetDraft): UpsertWidgetRequest | null {
    const base: Omit<UpsertWidgetRequest, 'config'> = {
      type: draft.type,
      title: draft.title.trim(),
      layout: draft.layout.trim(),
      enabled: draft.enabled,
      order: draft.order,
    };

    if (draft.type === 'embed') {
      if (!draft.embedUrl.trim()) {
        return null;
      }
      return {
        ...base,
        config: { embedUrl: draft.embedUrl.trim() },
      };
    }

    const places = draft.placesText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    if (places.length === 0) {
      return null;
    }
    return {
      ...base,
      config: { places },
    };
  }

  private resetWidgetConfigForType(draft: WidgetDraft) {
    if (draft.type === 'embed') {
      draft.placesText = '';
      return;
    }
    draft.embedUrl = '';
  }
}
