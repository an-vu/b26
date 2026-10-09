import { SiteThemeService } from './services/site-theme.service';
import { PageActivityService } from './services/page-activity.service';
import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styles: [':host { display: block; } .site-frame { min-height: 100dvh; } .site-frame::after { content: none; }'],
})
export class AppComponent {
  readonly theme = inject(SiteThemeService);
  constructor() {
    // Start visibility tracking so background tabs pause decorative animations.
    inject(PageActivityService);
  }
}
