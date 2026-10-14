import { HttpClient } from '@angular/common/http';
import { Subscription, timer, exhaustMap, takeWhile, take, catchError, of, EMPTY, switchMap } from 'rxjs';
import { detectSocialProfile } from '../../utils/social-profile.util';
import { Component, Input, inject, OnChanges, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InsightsService } from '../../services/insights.service';
import { PageActivityService } from '../../services/page-activity.service';
import type { Widget } from '../../models/widget';

interface InstagramData {
  status: 'ready' | 'loading' | 'private' | 'unavailable' | 'not_configured';
  followersCount: number | null;
  posts: { url: string; imageUrl: string; timestamp: string }[];
}

const followerFormatter = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });

@Component({
  selector: 'app-link-widget',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './link-widget.html',
  styleUrl: './link-widget.css',
})
export class LinkWidgetComponent implements OnChanges, OnDestroy {
  @Input({ required: true }) widget!: Widget;
  @Input() boardId?: string;
  private readonly insights = inject(InsightsService);
  private readonly http = inject(HttpClient);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly activity = inject(PageActivityService);
  private request?: Subscription;
  private requestKey = '';
  private profileUrl?: string;
  private parsedProfile: ReturnType<typeof detectSocialProfile> = null;
  instagram?: InstagramData;
  private images = new Subscription();
  private imageUrls: string[] = [];
  private clearImages() {
    this.images.unsubscribe(); this.images = new Subscription();
    this.imageUrls.forEach(url => URL.revokeObjectURL(url)); this.imageUrls = [];
  }
  ngOnChanges() {
    const profile = this.socialProfile;
    const endpoint = profile?.platform === 'Instagram' && this.boardId && this.widget.id > 0
      ? `/api/board/${encodeURIComponent(this.boardId)}/widgets/${this.widget.id}/instagram` : null;
    const count = this.widget.layout === 'span-1' ? 1 : 9;
    const username = profile?.handle.replace(/^@/, '') ?? '';
    const key = endpoint ? JSON.stringify([endpoint, username, count]) : '';
    // Title/order edits and repeated renders must not restart polling or discard loaded photos.
    if (key === this.requestKey) return;
    this.requestKey = key;
    this.request?.unsubscribe(); this.clearImages(); this.instagram = undefined;
    if (!endpoint) return;
    this.request = this.activity.visible$.pipe(
      switchMap(visible => visible ? timer(0, 3000).pipe(
        exhaustMap(() => this.http.get<InstagramData>(endpoint, { params: { expectedUsername: username } })
          .pipe(catchError(() => of<InstagramData>({ status: 'unavailable', followersCount: null, posts: [] }))))
      ) : EMPTY),
      takeWhile(data => data.status === 'loading', true), take(31),
    ).subscribe(data => {
      this.clearImages();
      this.instagram = { ...data, posts: data.posts.map(post => ({ ...post, imageUrl: '' })) };
      data.posts.slice(0, count).forEach((_, index) => {
        this.images.add(this.http.get(`${endpoint}/images/${index}`, {
          params: { expectedUsername: username }, responseType: 'blob',
        }).subscribe({ next: blob => {
          const url = URL.createObjectURL(blob); this.imageUrls.push(url);
          this.instagram!.posts[index].imageUrl = url; this.cdr.markForCheck();
        }, error: () => {} }));
      });
      this.cdr.markForCheck();
    });
  }
  ngOnDestroy() { this.request?.unsubscribe(); this.clearImages(); }
  hideFailedImage(event: Event) { (event.target as HTMLImageElement).style.visibility = 'hidden'; }


  get compactInstagramPost() {
    return this.widget.layout === 'span-1' && this.instagram?.status === 'ready'
      ? this.instagram.posts[0] : undefined;
  }

  recordClick() {
    if (this.boardId && this.widget.id > 0) {
      this.insights.recordWidgetClick(this.boardId, this.widget.id).subscribe({ error: () => {} });
    }
  }

  get description(): string { return typeof this.widget?.config?.['description'] === 'string' ? this.widget.config['description'] as string : ''; }
  get imageUrl(): string | null {
    const value = this.widget?.config?.['imageUrl'];
    return typeof value === 'string' && (value.startsWith('https://') || (value.startsWith('/') && !value.startsWith('//'))) ? value : null;
  }

  get followerCount(): string {
    const count = this.socialProfile?.platform === 'Instagram' ? this.instagram?.followersCount : this.widget?.config?.['followersCount'];
    return typeof count === 'number' && Number.isSafeInteger(count) && count >= 0
      ? followerFormatter.format(count) : '—';
  }

  get socialProfile() {
    const url = String(this.widget?.config?.['url'] ?? '');
    if (url !== this.profileUrl) {
      this.profileUrl = url;
      this.parsedProfile = detectSocialProfile(url);
    }
    return this.parsedProfile;
  }

  get url(): string | null {
    const value = this.widget?.config?.['url'];
    if (typeof value !== 'string' || !value.trim()) return null;
    try {
      const parsed = new URL(/^[a-z][a-z\d+.-]*:/i.test(value.trim()) ? value.trim() : `https://${value.trim()}`);
      return ['http:', 'https:'].includes(parsed.protocol) && !parsed.username && !parsed.password ? parsed.href : null;
    } catch { return null; }
  }
}
