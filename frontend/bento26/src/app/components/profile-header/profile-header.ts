import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-profile-header',
  standalone: true,
  templateUrl: './profile-header.html',
  styleUrl: './profile-header.css',
})
export class ProfileHeaderComponent {
  @Input({ required: true }) name!: string;
  @Input({ required: true }) headline!: string;
}
