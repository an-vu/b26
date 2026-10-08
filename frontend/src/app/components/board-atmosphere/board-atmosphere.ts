import { Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { BoardAppearance } from '../../models/board';
import { AtmosphereParticles } from '../../themes/atmosphere-particles';
import { GridAtmosphereComponent } from '../grid-atmosphere/grid-atmosphere';

@Component({
  selector: 'app-board-atmosphere', standalone: true, imports: [CommonModule, GridAtmosphereComponent],
  templateUrl: './board-atmosphere.html', styles: [':host { display: contents; }'],
})
export class BoardAtmosphereComponent {
  readonly appearance = input.required<BoardAppearance>();
  readonly darkInk = input(false);
  private readonly atmosphere = new AtmosphereParticles();
  readonly atmosphereParticles = computed(() => this.atmosphere.particles(this.appearance().pattern, this.appearance().patternIntensity ?? 'light'));
  readonly screenDroplets = computed(() => this.atmosphere.screenDroplets(this.appearance().patternIntensity ?? 'light'));
}
