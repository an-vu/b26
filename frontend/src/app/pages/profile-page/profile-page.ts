import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { switchMap } from 'rxjs/operators';
import { catchError, finalize, forkJoin, map, of, startWith, Subject } from 'rxjs';
import { FormsModule } from '@angular/forms';

import { ProfileService } from '../../services/profile.service';
import { ProfileHeaderComponent } from '../../components/profile-header/profile-header';
import type { Profile } from '../../models/profile';
import type { UpsertWidgetRequest, Widget } from '../../models/widget';
import { WidgetHostComponent } from '../../widgets/widget-host/widget-host';

type ProfilePageState =
  | { status: 'loading' }
  | { status: 'ready'; profile: Profile }
  | { status: 'missing' };

type WidgetType = 'embed' | 'map' | 'link';
type WidgetDraft = {
  id?: number;
  type: WidgetType;
  title: string;
  layout: string;
  enabled: boolean;
  order: number;
  embedUrl: string;
  linkUrl: string;
  placesText: string;
};

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ProfileHeaderComponent, WidgetHostComponent],
  templateUrl: './profile-page.html',
  styleUrl: './profile-page.css',
})
export class ProfilePageComponent {
  private route = inject(ActivatedRoute);
  private profileService = inject(ProfileService);
  private reload$ = new Subject<void>();

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
          this.profileService
            .getWidgets(params.get('profileId') ?? 'default')
            .pipe(
              map((widgets) => [...widgets].sort((a, b) => a.order - b.order)),
              catchError(() => of<Widget[]>([]))
            )
        )
      )
    )
  );

  trackWidget(index: number, widget: Widget) {
    return widget.id ?? index;
  }

  startWidgetEdit(widgets: Widget[]) {
    this.widgetDrafts = widgets.map((widget) => this.toWidgetDraft(widget)).sort((a, b) => a.order - b.order);
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
      this.widgetSaveError =
        draft.type === 'map'
          ? 'Map widgets need at least one place.'
          : 'Widget URL must start with http:// or https://.';
      return;
    }
    this.isWidgetSaving = true;
    this.widgetSaveError = '';

    const request$ = draft.id
      ? this.profileService.updateWidget(profileId, draft.id, payload)
      : this.profileService.createWidget(profileId, payload);

    request$.pipe(finalize(() => (this.isWidgetSaving = false))).subscribe({
      next: () => this.refreshWidgetDrafts(profileId),
      error: (error) => {
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
    this.profileService
      .deleteWidget(profileId, draft.id)
      .pipe(finalize(() => (this.isWidgetSaving = false)))
      .subscribe({
      next: () => this.refreshWidgetDrafts(profileId),
      error: (error) => {
        this.widgetSaveError = error?.error?.message ?? 'Unable to delete widget.';
      },
    });
  }

  addNewWidget(profileId: string) {
    this.saveWidget(profileId, { ...this.newWidgetDraft });
  }

  moveWidget(profileId: string, draft: WidgetDraft, direction: -1 | 1) {
    if (this.isWidgetSaving) {
      return;
    }
    const currentIndex = this.widgetDrafts.indexOf(draft);
    if (currentIndex < 0) {
      return;
    }
    const targetIndex = currentIndex + direction;
    if (targetIndex < 0 || targetIndex >= this.widgetDrafts.length) {
      return;
    }

    const nextDrafts = [...this.widgetDrafts];
    [nextDrafts[currentIndex], nextDrafts[targetIndex]] = [nextDrafts[targetIndex], nextDrafts[currentIndex]];
    this.widgetDrafts = this.withNormalizedOrder(nextDrafts);
    this.persistWidgetOrder(profileId);
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
        this.widgetDrafts = widgets.map((widget) => this.toWidgetDraft(widget)).sort((a, b) => a.order - b.order);
        this.newWidgetDraft = this.createEmptyWidgetDraft();
        this.reload$.next();
      },
      error: (error) => {
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
      type: widget.type === 'map' ? 'map' : widget.type === 'link' ? 'link' : 'embed',
      title: widget.title,
      layout: widget.layout,
      enabled: widget.enabled,
      order: widget.order,
      embedUrl: typeof widget.config['embedUrl'] === 'string' ? widget.config['embedUrl'] : '',
      linkUrl: typeof widget.config['url'] === 'string' ? widget.config['url'] : '',
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
      linkUrl: '',
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

    if (draft.type === 'embed' || draft.type === 'link') {
      const url = (draft.type === 'embed' ? draft.embedUrl : draft.linkUrl).trim();
      if (!/^https?:\/\//i.test(url)) {
        return null;
      }
      return {
        ...base,
        config: draft.type === 'embed' ? { embedUrl: url } : { url },
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
      draft.linkUrl = '';
      draft.placesText = '';
      return;
    }
    if (draft.type === 'link') {
      draft.embedUrl = '';
      draft.placesText = '';
      return;
    }
    draft.embedUrl = '';
    draft.linkUrl = '';
  }

  private withNormalizedOrder(drafts: WidgetDraft[]): WidgetDraft[] {
    return drafts.map((draft, index) => ({ ...draft, order: index }));
  }

  private persistWidgetOrder(profileId: string) {
    const existingDrafts = this.widgetDrafts.filter((draft): draft is WidgetDraft & { id: number } => !!draft.id);
    if (existingDrafts.length === 0) {
      return;
    }

    this.isWidgetSaving = true;
    this.widgetSaveError = '';
    const updates = existingDrafts.map((draft) => {
      const payload = this.buildWidgetPayload(draft);
      if (!payload) {
        return of(null);
      }
      return this.profileService.updateWidget(profileId, draft.id, payload);
    });

    forkJoin(updates)
      .pipe(finalize(() => (this.isWidgetSaving = false)))
      .subscribe({
        next: () => this.reload$.next(),
        error: (error) => {
          this.widgetSaveError = error?.error?.message ?? 'Unable to reorder widgets.';
        },
      });
  }

}
