import { Component } from '@angular/core';
import { ProfileHeaderComponent } from './components/profile-header/profile-header.component';
import { CardGridComponent } from './components/card-grid/card-grid.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [ProfileHeaderComponent, CardGridComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class AppComponent {}
