import { LavaAtmosphereComponent } from '../lava-atmosphere/lava-atmosphere';
import { StarAtmosphereComponent } from '../star-atmosphere/star-atmosphere';
import { Component, computed, inject, input } from '@angular/core';
import { SiteThemeService } from '../../services/site-theme.service';
import type { BoardAppearance } from '../../models/board';
import { AtmosphereParticles } from '../../themes/atmosphere-particles';
import { GridAtmosphereComponent } from '../grid-atmosphere/grid-atmosphere';

@Component({
  selector: 'app-board-atmosphere', standalone: true, imports: [GridAtmosphereComponent, LavaAtmosphereComponent, StarAtmosphereComponent],
  templateUrl: './board-atmosphere.html', styles: [':host { display: contents; }'],
})
export class BoardAtmosphereComponent {
  readonly appearance = input.required<BoardAppearance>();
  readonly darkInk = input(false);
  /** Stars follow the theme and color mode the page itself is showing. */
  protected readonly siteTheme = inject(SiteThemeService);
  private readonly atmosphere = new AtmosphereParticles();
  readonly atmosphereParticles = computed(() => this.atmosphere.particles(this.appearance().pattern, this.appearance().patternIntensity ?? 'light'));
  readonly screenDroplets = computed(() => this.atmosphere.screenDroplets(this.appearance().patternIntensity ?? 'light'));
}
