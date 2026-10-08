import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, Input, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import type { Widget } from '../../models/widget';
import { SignupFormComponent } from '../signup-form/signup-form';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-signin-form',
  standalone: true,
  imports: [CommonModule, FormsModule, SignupFormComponent],
  templateUrl: './signin-form.html',
  styleUrl: './signin-form.css',
})
export class SigninFormComponent {
  @Input() widget?: Widget;

  showSignup = false;
  private readonly cdr = inject(ChangeDetectorRef);

  email = '';
  password = '';
  isSubmitting = false;
  errorMessage = '';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  onSigninSubmit(): void {
    if (this.isSubmitting) {
      return;
    }

    this.errorMessage = '';

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
