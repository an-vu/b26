import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, Input, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import type { Widget } from '../../models/widget';
import { SignupWidgetComponent } from '../signup-widget/signup-widget';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-signin-widget',
  standalone: true,
  imports: [CommonModule, FormsModule, SignupWidgetComponent],
  templateUrl: './signin-widget.html',
  styleUrl: './signin-widget.css',
})
export class SigninWidgetComponent {
  @Input({ required: true }) widget!: Widget;

  showSignup = false;
  readonly signupWidget: Widget = {
    id: 0,
    type: 'signup',
    title: 'Create Your Account',
    layout: 'span-2',
    config: {},
    enabled: true,
    order: 0,
  };

  private readonly cdr = inject(ChangeDetectorRef);

  email = '';
  password = '';
  rememberMe = true;
  isSubmitting = false;
  errorMessage = '';
  infoMessage = '';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  onSigninSubmit(): void {
    if (this.isSubmitting) {
      return;
    }

    this.errorMessage = '';
    this.infoMessage = '';

    const email = this.email.trim().toLowerCase();
    const password = this.password;

    if (!email) {
      this.errorMessage = 'Email is required.';
      return;
    }

    this.isSubmitting = true;

    this.authService.signin({ email, password }).subscribe({
      next: (session) => {
        const username = session.user.username?.trim();
        const target = username ? `/${username}` : '/';
        void this.router.navigateByUrl(target);
      },
      error: (error: unknown) => {
        this.errorMessage = this.resolveErrorMessage(error);
        this.isSubmitting = false;
        this.cdr.markForCheck();
      },
      complete: () => {
        this.isSubmitting = false;
        this.cdr.markForCheck();
      },
    });
  }

  onSignupClick(): void {
    this.errorMessage = '';
    this.showSignup = true;
  }

  private resolveErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const message = (error.error as { message?: string } | null)?.message;
      if (typeof message === 'string' && message.trim()) {
        return message;
      }
      if (error.status === 401) {
        return 'Invalid email or password.';
      }
    }
    return 'Unable to sign in right now.';
  }
}
