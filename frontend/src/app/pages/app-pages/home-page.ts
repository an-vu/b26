import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { AppPageShellComponent } from './app-page-shell';

@Component({
  standalone: true, imports: [CommonModule, RouterLink, AppPageShellComponent],
  template: `
    <app-page-shell>
      <section *ngIf="!(auth.user$ | async)">
        <h1>Your space, your way.</h1>
        <p>Discover personal bento boards on BlueBerry.</p>
        <a routerLink="/signin">Sign in or create an account</a>
      </section>
      <h2>Home</h2>
      <p>No published updates yet.</p>
      <p>Public boards are visitable. Activity will appear here when publishing is available.</p>
    </app-page-shell>`
})
export class HomePageComponent {
  readonly auth = inject(AuthService);
}
