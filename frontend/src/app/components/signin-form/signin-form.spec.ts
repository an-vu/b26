import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { SigninFormComponent } from './signin-form';

describe('Sign-in onboarding', () => {
  it('opens signup and returns to sign-in without leaving the board', () => {
    TestBed.configureTestingModule({
      imports: [SigninFormComponent],
      providers: [provideRouter([]), provideHttpClient()],
    });
    const fixture = TestBed.createComponent(SigninFormComponent);
    fixture.componentInstance.widget = { id: 1, type: 'signin', title: 'Welcome', layout: 'span-2', config: {}, enabled: true, order: 0 };
    fixture.detectChanges();
    const buttons = () => Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    buttons().find(button => button.textContent?.includes("Don't Have"))!.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Create Account');
    buttons().find(button => button.textContent?.includes('Already Have'))!.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Sign In');
  });
});
