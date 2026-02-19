import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import type { Widget } from '../../models/widget';
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

  email = '';
  password = '';
  confirmPassword = '';
  isSubmitting = false;
  errorMessage = '';

  constructor(
    private authService: AuthService,
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
      .subscribe({
        next: (session) => {
          const nextUsername = session.user.username?.trim();
          const target = nextUsername ? `/${nextUsername}` : '/';
          void this.router.navigateByUrl(target);
        },
        error: (error: unknown) => {
          this.errorMessage = this.resolveErrorMessage(error);
          this.isSubmitting = false;
        },
        complete: () => {
          this.isSubmitting = false;
        },
      });
  }

  gotoSignin(): void {
    void this.router.navigateByUrl('/signin');
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
