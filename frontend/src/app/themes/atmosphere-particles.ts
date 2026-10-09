import type { BoardAppearance } from '../models/board';
type Intensity = 'light' | 'medium' | 'heavy';

/** Stable seeded fields shared by the board's decorative patterns. */
export class AtmosphereParticles {
  // Stable, uneven positions and timing avoid re-randomizing on every change detection.
  readonly allAtmosphereParticles = (() => {
    // Independent seeded draws keep the field stable without diagonal lattice artifacts.
    let seed = 0x72a9b14f;
    const random = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) / 4294967296; };
    return Array.from({ length: 280 }, () => ({
      x: random() * 100, y: random() * 100, delay: -random() * 60,
      duration: 5 + random() * 10, size: 1.5 + random() * 5,
      drift: -70 + random() * 140, depth: .3 + random() * .7,
      turn: -240 + random() * 480,
      tint: ['#f4f5ff', '#deecff', '#ede1ff', '#ffe9d6'][Math.floor(random() * 4)],
      route: (() => {
        const x = Math.floor(random() * 30) * 48, y = Math.floor(random() * 18) * 48;
        return `M${x} ${y} h132 q12 0 12 12 v72 q0 12 -12 12 h-24 q-12 0 -12 12 v120 q0 12 12 12 h180`;
      })(),
    }));
  })();
  readonly particleLevels = { light: this.allAtmosphereParticles.slice(0, 96), medium: this.allAtmosphereParticles.slice(0, 160), heavy: this.allAtmosphereParticles.slice(0, 240) };
  readonly snowParticleLevels = {
    light: this.snowParticles(112, .11, .3),
    medium: this.snowParticles(160, .20),
    heavy: this.snowParticles(240, .35),
  };
  private snowParticles(count: number, largeShare: number, smallBoost = 0) {
    return this.allAtmosphereParticles.slice(0, count).map((p, index) => {
      // Stable, interleaved size buckets: small flakes remain at every intensity.
      const rank = ((index * 73 + 19) % 100) / 100;
      const size = rank < largeShare ? 6 + p.depth * 3
        : rank < largeShare + .30 ? 2.5 + p.depth * 2 : .7 + p.depth * 1.3 + smallBoost;
      return { ...p, size };
    });
  }
  readonly waveParticles = this.allAtmosphereParticles.map((p, index) => ({ ...p,
    tint: index % 4 === 0 ? ['#f2c6a9', '#c5e5bd', '#bce7ed', '#c0d7f3', '#dac9ee', '#efd0e0'][Math.floor(index / 4) % 6] : '#edf6ff',
    // Follow the ribbon's broad crest rather than filling the entire viewport.
    y: 52 - 7 * Math.sin(p.x / 100 * Math.PI * 2) + (p.y / 100 - .5) * 13,
  }));
  readonly rainLevels = { light: this.allAtmosphereParticles.slice(0, 144), medium: this.allAtmosphereParticles.slice(0, 200), heavy: this.allAtmosphereParticles };
  readonly dropletLevels = { light: this.allAtmosphereParticles.slice(0, 12), medium: this.allAtmosphereParticles.slice(0, 20), heavy: this.allAtmosphereParticles.slice(0, 30) };
  readonly waveParticleLevels = { light: this.waveParticles.slice(0, 40), medium: this.waveParticles.slice(0, 72), heavy: this.waveParticles.slice(0, 112).map((p, index) => ({ ...p,
    // Mostly fine sparkles, a smaller middle group, and occasional bright accents.
    size: ((index * 73 + 19) % 100) < 12 ? p.size
      : ((index * 73 + 19) % 100) < 40 ? 2 + p.depth * 1.5 : .8 + p.depth * 1.1,
  })) };
  screenDroplets(intensity: Intensity) { return this.dropletLevels[intensity]; }
  particles(pattern: BoardAppearance['pattern'], intensity: Intensity) {
    if (pattern === 'bokeh') return this.allAtmosphereParticles.slice(0, { light: 18, medium: 30, heavy: 44 }[intensity]).map((p, i) => ({ ...p, size: 25 + p.depth ** 2 * 150, duration: 22 + p.duration * 2, tint: ['#ffc891', '#f4a3be', '#d9b5ef', '#8dcbd8', '#b9dca5', '#f8dfb0'][i % 6] }));
    if (pattern === 'lava') return [];
    return (pattern === 'wave' ? this.waveParticleLevels : pattern === 'rainfall' ? this.rainLevels : pattern === 'snow' ? this.snowParticleLevels : this.particleLevels)[intensity];
  }
}
