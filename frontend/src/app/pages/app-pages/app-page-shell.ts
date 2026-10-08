import { Component, inject, input } from '@angular/core';
import { SiteNavigationComponent } from '../../components/site-navigation/site-navigation';
import { SiteThemeService } from '../../services/site-theme.service';
import { BoardAtmosphereComponent } from '../../components/board-atmosphere/board-atmosphere';
import type { BoardAppearance } from '../../models/board';

@Component({
  selector: 'app-page-shell', standalone: true,
  imports: [SiteNavigationComponent, BoardAtmosphereComponent],
  template: `
    <main class="page app-page" [class.home-page]="home()" [attr.data-theme]="theme.themeId()" [attr.data-color-mode]="theme.colorMode()"
      [attr.data-pattern]="appearance()?.pattern" [attr.data-intensity]="appearance()?.patternIntensity">
      @if (appearance(); as appearance) {
        <app-board-atmosphere [appearance]="appearance" [darkInk]="theme.themeId() === 'default' && theme.colorMode() === 'light' && theme.foreground() === '#30302e'" />
      }
      <section class="app-page-content"><ng-content /></section>
      <app-site-navigation [brandAtTop]="home()"><ng-content select="[page-navigation]" /></app-site-navigation>
    </main>`,
  styleUrl: './app-pages.css'
})
export class AppPageShellComponent {
  readonly home = input(false);
  readonly appearance = input<BoardAppearance | null>(null);
  readonly theme = inject(SiteThemeService);
}
