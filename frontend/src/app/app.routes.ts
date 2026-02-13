import { Routes } from '@angular/router';
import { ProfilePageComponent } from './pages/profile-page/profile-page';

export const routes: Routes = [
  { path: '', component: ProfilePageComponent, data: { profileId: 'home' } },
  { path: 'u/:profileId', component: ProfilePageComponent },
  { path: '**', redirectTo: '' },
];
