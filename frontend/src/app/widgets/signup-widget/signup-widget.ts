import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { catchError, finalize, map, of, switchMap } from 'rxjs';
import type { Widget } from '../../models/widget';
import { BoardService } from '../../services/board.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-signup-widget',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './signup-widget.html',
  styleUrl: './signup-widget.css',
})
export class SignupWidgetComponent {
  @Input({ required: true }) widget!: Widget;

  @Output() signinRequested = new EventEmitter<void>();

  email = '';
  password = '';
  confirmPassword = '';
  isSubmitting = false;
  errorMessage = '';

  constructor(
    private authService: AuthService,
    private boardService: BoardService,
    private router: Router
  ) {}

  onSignupSubmit(): void {
    if (this.isSubmitting) {
      return;
    }

    this.errorMessage = '';

    const email = this.email.trim().toLowerCase();
    const password = this.password;

    if (!email || !password) {
      this.errorMessage = 'Email and password are required.';
      return;
    }
    if (password.length < 8 || password.length > 72) {
      this.errorMessage = 'Password must be between 8 and 72 characters.';
      return;
    }
    if (password !== this.confirmPassword) {
      this.errorMessage = 'Passwords do not match.';
      return;
    }

    this.isSubmitting = true;

    this.authService
      .signup({
        email,
        password,
      })
      .pipe(
        switchMap((session) => {
          const username = session.user.username?.trim();
          const fallback = username ? `/${username}` : '/';
          return this.boardService.getMyPreferences().pipe(
            map((preferences) => `/b/${encodeURIComponent(preferences.mainBoardUrl)}`),
            catchError(() => of(fallback))
          );
        }),
        finalize(() => {
          this.isSubmitting = false;
        })
      )
      .subscribe({
        next: (target) => {
          void this.router.navigateByUrl(target);
        },
        error: (error: unknown) => {
          this.errorMessage = this.resolveErrorMessage(error);
        },
      });
  }

  gotoSignin(): void {
    if (this.signinRequested.observed) {
      this.signinRequested.emit();
    } else {
      void this.router.navigateByUrl('/signin');
    }
  }

  private resolveErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const payload = error.error as
        | { message?: string; errors?: Array<{ field?: string; message?: string }> }
        | null;

      if (Array.isArray(payload?.errors) && payload.errors.length > 0) {
        const firstError = payload.errors[0];
        const firstField = firstError?.field?.trim();
        const firstMessage = firstError?.message?.trim();
        if (firstMessage) {
          return firstField ? `${firstField}: ${firstMessage}` : firstMessage;
        }
      }

      const message = payload?.message?.trim();
      if (message) {
        return message;
      }

      if (error.status === 409) {
        return 'Email already exists.';
      }
    }
    return 'Unable to sign up right now.';
  }
}
