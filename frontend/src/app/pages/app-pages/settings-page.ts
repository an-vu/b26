import { BoardLibraryComponent } from './board-library';
import { Component } from '@angular/core';
import { AppPageShellComponent } from './app-page-shell';
import { AccountSettingsFormComponent } from '../../components/account-settings-form/account-settings-form';
@Component({ standalone: true, imports: [AppPageShellComponent, AccountSettingsFormComponent, BoardLibraryComponent], template: `<app-page-shell><h1>Settings</h1><app-account-settings-form [showMainBoard]="false" /><app-board-library /></app-page-shell>` })
export class SettingsPageComponent {}
