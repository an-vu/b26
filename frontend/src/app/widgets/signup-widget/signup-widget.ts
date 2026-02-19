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

  displayName = '';
  username = '';
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

    const displayName = this.displayName.trim();
    const username = this.username.trim().toLowerCase();
    const email = this.email.trim().toLowerCase();
    const password = this.password;

    if (!displayName || !username || !email || !password) {
      this.errorMessage = 'All fields are required.';
      return;
    }
    if (password !== this.confirmPassword) {
      this.errorMessage = 'Passwords do not match.';
      return;
    }

    this.isSubmitting = true;

    this.authService
      .signup({
        displayName,
        username,
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
      const message = (error.error as { message?: string } | null)?.message;
      if (typeof message === 'string' && message.trim()) {
        return message;
      }
      if (error.status === 409) {
        return 'Email or username already exists.';
      }
    }
    return 'Unable to sign up right now.';
  }
}
