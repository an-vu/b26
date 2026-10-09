import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AppPageShellComponent } from '../app-pages/app-page-shell';

@Component({
  standalone: true, imports: [FormsModule, AppPageShellComponent],
  templateUrl: './blur-lab.html',
  // Reuse the actual chrome blur rules so the reference cannot drift from the site.
  styleUrls: ['../../components/site-navigation/site-navigation.css', './blur-lab.css'],
})
export class BlurLabComponent {
  strength = 12;
  bleed = 22;
  fade = 48;
  readonly lines = Array.from({ length: 40 }, (_, index) => index + 1);

  syncScroll(event: Event, other: HTMLElement) {
    const source = event.target as HTMLElement;
    if (other.scrollTop !== source.scrollTop) other.scrollTop = source.scrollTop;
  }
}
