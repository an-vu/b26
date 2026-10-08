import { Component, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AboutPanelComponent } from '../../components/about-panel/about-panel';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-page-shell', standalone: true,
  imports: [CommonModule, RouterLink, AboutPanelComponent],
  template: `
    <main class="page app-page" data-theme="default" data-color-mode="light">
      <header>
        <a routerLink="/">BlueBerry</a>
        <nav aria-label="Main navigation">
          <a routerLink="/">Home</a>
          <a routerLink="/settings">Settings</a>
          <a routerLink="/insights">Insights</a>
          <a *ngIf="auth.user$ | async as user; else signin" [routerLink]="['/', user.username]">My profile</a>
          <ng-template #signin><a routerLink="/signin">Sign In</a></ng-template>
        </nav>
      </header>
      <section class="app-page-content"><ng-content /></section>
      <footer class="app-page-footer"><button class="app-button" (click)="about.open($event)">About BlueBerry</button></footer>
      <app-about-panel #about />
    </main>`,
  styleUrl: './app-pages.css'
})
export class AppPageShellComponent {
  readonly auth = inject(AuthService);
  constructor() {
    if (this.auth.getAccessToken()) {
      this.auth.me().pipe(takeUntilDestroyed(inject(DestroyRef))).subscribe({ error: () => {} });
    }
  }
}
