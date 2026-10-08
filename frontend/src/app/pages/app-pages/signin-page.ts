import { Component } from '@angular/core';
import { AppPageShellComponent } from './app-page-shell';
import { SigninFormComponent } from '../../components/signin-form/signin-form';
@Component({ standalone: true, imports: [AppPageShellComponent, SigninFormComponent], template: `<app-page-shell><app-signin-form /></app-page-shell>` })
export class SigninPageComponent {}
