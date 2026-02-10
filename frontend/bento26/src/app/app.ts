import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { Profile } from './models/profile';
import { ProfileService } from './services/profile.service';
import { ProfileHeaderComponent } from './components/profile-header/profile-header';
import { CardGridComponent } from './components/card-grid/card-grid';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, ProfileHeaderComponent, CardGridComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class AppComponent implements OnInit {
  profile?: Profile;

  constructor(private profileService: ProfileService) {}

  ngOnInit(): void {
    this.profileService.getProfile('union-pacific').subscribe((p) => {
      this.profile = p;
    });
  }
}
