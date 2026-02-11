import { Routes } from '@angular/router';
import { ProfilePageComponent } from './pages/profile-page/profile-page';

export const routes: Routes = [
  { path: '', redirectTo: 'u/default', pathMatch: 'full' },
  { path: 'u/:profileId', component: ProfilePageComponent },
  { path: '**', redirectTo: 'u/default' },
];
