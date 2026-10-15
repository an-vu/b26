import type { BoardThemeId } from '../../themes/board-theme';

export type StarLevel = 'light' | 'medium' | 'heavy';

/** Night sky, shown on dark boards. Values were tuned in Pattern Lab. */
type NightLook = {
  faint: number; bright: number; colorShare: number; shimmer: number;
  swells: number; milkyWay: number; meteorsPerMinute: number; drift: number;
};
/** Pearl stars, shown on light boards. */
type PearlLook = {
  count: number; colorShare: number; shimmer: number; swells: number;
  swellGap: number; opal: number; drift: number;
};

export const NIGHT_LOOKS: Record<StarLevel, NightLook> = {
  light: { faint: 650, bright: 9, colorShare: .25, shimmer: .55, swells: 3, milkyWay: .55, meteorsPerMinute: 5.5, drift: .9 },
  medium: { faint: 950, bright: 14, colorShare: .35, shimmer: .65, swells: 5, milkyWay: .85, meteorsPerMinute: 6.5, drift: 1.2 },
  heavy: { faint: 1300, bright: 18, colorShare: .45, shimmer: .6, swells: 8, milkyWay: 1, meteorsPerMinute: 7.5, drift: 1.6 },
};

export const PEARL_LOOKS: Record<StarLevel, PearlLook> = {
  light: { count: 250, colorShare: .4, shimmer: .45, swells: 4, swellGap: 2, opal: .8, drift: .9 },
  medium: { count: 300, colorShare: .55, shimmer: .5, swells: 7, swellGap: 1.6, opal: 1, drift: 1.2 },
  heavy: { count: 400, colorShare: .7, shimmer: .55, swells: 11, swellGap: 1.2, opal: 1, drift: 1.6 },
};

/** Each theme's signature colors. Only some stars (and the Milky Way) take them; the rest stay white. */
export const STAR_THEME_COLORS: Record<BoardThemeId, string[]> = {
  berry: ['#00b2d7', '#3185fc', '#a64ce6', '#e7a9c8'], // Berry: Home, Search, Account dock colors + pearl pink
  aero: ['#008fcd', '#5fd0f2', '#5ccf8f'],
  aqua: ['#327ecc', '#8b6fe0', '#a9b4c2'],
  omakase: ['#f7a9ca', '#efae61', '#a55379'],
  kiwi: ['#b5ed57', '#3fd59a', '#ff9690'],
  valencia: ['#3f729b', '#e6d2a8', '#b9c0c8'],
};

/** White pearls on light boards get this soft lavender halo so they read as light, not dust. */
const PEARL_NEUTRAL = '#b7b1df';

export type StarSkyOptions = { level: StarLevel; dark: boolean; themeId: BoardThemeId };

type Random = () => number;
type Swell = { star: number; start: number; dur: number; next: number };
type NightStar = { x: number; y: number; m: number; size: number; alpha: number; tint: string; phase: number; speed: number };
type BrightStar = { x: number; y: number; size: number; tint: string; phase: number; speed: number };
type Pearl = { x: number; y: number; d: number; m: number; colored: boolean; hue: number; rate: number; phase: number; phase2: number; speed: number };
type Meteor = { x: number; y: number; angle: number; speed: number; len: number; age: number; life: number };
type Scene =
  | { kind: 'night'; layer: HTMLCanvasElement; twinklers: NightStar[]; bright: BrightStar[]; swells: Swell[]; rand: Random }
  | { kind: 'pearl'; stars: Pearl[]; swells: Swell[]; rand: Random };

export function seeded(seed: number): Random {
  return () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) / 4294967296; };
}

export function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1, 7), 16);
  return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/** Mix a color toward white by k (0..1). */
export function lighten(hex: string, k: number): string {
  return '#' + hexToRgb(hex).map(v => Math.round((v + (1 - v) * k) * 255).toString(16).padStart(2, '0')).join('');
}

/** Pearl size bands: 55% tiny (5-8px), 40% medium (10-14px), 5% large (14-20px). */
export function pearlDiameter(rand: Random): number {
  const r = rand();
  return r < .55 ? 5 + rand() * 3 : r < .95 ? 10 + rand() * 4 : 14 + rand() * 6;
}

const rgba = (hex: string, a: number) => {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)},${a})`;
};
const gauss = (rand: Random) => (rand() + rand() + rand() + rand() - 2) / 2;
// Brightness follows a steep power law: almost everything is faint, a few stars stand out.
const magnitude = (rand: Random) => rand() ** 4;
const starTint = (rand: Random) => { const t = rand(); return t < .14 ? '#ffe2c0' : t < .34 ? '#d4e3ff' : t < .4 ? '#ffd2b0' : '#ffffff'; };
const pick = <T>(rand: Random, items: T[]) => items[Math.floor(rand() * items.length)];
const bloomOf = (t: number, sw: Swell) => Math.sin(Math.PI * Math.min(1, (t - sw.start) / sw.dur)) ** 2;

/**
 * The Stars pattern on one canvas: a night sky with a Milky Way and shooting stars on dark boards,
 * and shimmering pearl stars on light boards. Framework-free; StarAtmosphereComponent drives it.
 */
export class StarSky {
  private readonly ctx: CanvasRenderingContext2D | null;
  private width = 0;
  private height = 0;
  private dpr = 1;
  private options: StarSkyOptions = { level: 'light', dark: false, themeId: 'berry' };
  private signature = '';
  private scene: Scene | null = null;
  private meteors: Meteor[] = [];
  private clock = 0;
  private last = 0;
  private readonly sprites = new Map<string, HTMLCanvasElement>();

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d');
  }

  configure(options: StarSkyOptions) { this.options = options; }

  resize(width: number, height: number, dpr: number) {
    this.width = width; this.height = height; this.dpr = Math.min(dpr || 1, 2);
    this.canvas.width = Math.max(1, Math.round(width * this.dpr));
    this.canvas.height = Math.max(1, Math.round(height * this.dpr));
    this.signature = '';
  }

  /** Clears timing so a paused sky resumes without a jump. */
  resetTiming() { this.last = 0; }

  draw(now: number, still: boolean) {
    const ctx = this.ctx;
    if (!ctx || !this.width || !this.height) return;
    this.rebuild();
    const scene = this.scene!;
    const dt = this.last && !still ? Math.min(now - this.last, 100) / 1000 : 0;
    this.last = now; this.clock += dt;
    const t = this.clock, { level, dark } = this.options;
    const drift = dark ? NIGHT_LOOKS[level].drift : PEARL_LOOKS[level].drift;
    const ox = ((t * drift) % this.width + this.width) % this.width;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (scene.kind === 'night') {
      ctx.drawImage(scene.layer, -ox * this.dpr, 0);
      ctx.drawImage(scene.layer, (this.width - ox) * this.dpr, 0);
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      this.drawNight(ctx, scene, t, ox);
      this.drawMeteors(ctx, dt, still);
    } else {
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      this.drawPearls(ctx, scene, t);
    }
  }

  private rebuild() {
    const { level, dark, themeId } = this.options;
    const signature = [this.width, this.height, this.dpr, level, dark, themeId].join(':');
    if (signature === this.signature) return;
    this.signature = signature;
    this.meteors = [];
    this.scene = dark ? this.buildNight() : this.buildPearls();
  }

  private themeColors() { return STAR_THEME_COLORS[this.options.themeId] ?? STAR_THEME_COLORS.berry; }
  private wrap(x: number, ox: number) { const v = x - ox; return v < -40 ? v + this.width : v; }

  private buildNight(): Scene {
    const look = NIGHT_LOOKS[this.options.level], theme = this.themeColors();
    const rand = seeded(0x51a7e9), W = this.width, H = this.height;
    const layer = document.createElement('canvas');
    layer.width = this.canvas.width; layer.height = this.canvas.height;
    const g = layer.getContext('2d');
    const band = (t: number) => ({ x: -.1 * W + t * 1.2 * W, y: .86 * H - t * .78 * H + Math.sin(t * Math.PI) * .08 * H });
    const bandWidth = .13 * Math.min(W, H) + .05 * Math.max(W, H);
    if (g) {
      g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      g.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 220; k++) {
        const p = band(rand()), off = gauss(rand) * bandWidth * .7, r = 40 + rand() * 140;
        const x = p.x + off * .62, y = p.y + off * .78;
        // Most Milky Way clouds take the theme's colors; the rest stay a neutral starlight blue.
        const tint = rand() < .65 ? lighten(pick(rand, theme), .25) : '#aebcff';
        const gr = g.createRadialGradient(x, y, 0, x, y, r);
        gr.addColorStop(0, rgba(tint, (.012 + rand() * .022) * look.milkyWay)); gr.addColorStop(1, rgba(tint, 0));
        g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
      }
      g.globalCompositeOperation = 'source-over';
    }
    const stars: NightStar[] = [];
    const add = (x: number, y: number) => {
      const m = magnitude(rand), colored = m > .18 && rand() < look.colorShare;
      stars.push({ x, y, m, size: .35 + m * 1.25, alpha: .16 + m * .74, tint: colored ? lighten(pick(rand, theme), .35) : starTint(rand), phase: rand() * 100, speed: .7 + rand() * .8 });
    };
    for (let i = 0; i < look.faint; i++) add(rand() * W, rand() * H);
    for (let i = 0; i < look.faint * .9 * look.milkyWay; i++) { const p = band(rand()), off = gauss(rand) * bandWidth * .55; add(p.x + off * .62, p.y + off * .78); }
    // Faint stars are drawn once into the layer; only the brighter ones shimmer live.
    const twinklers: NightStar[] = [];
    for (const s of stars) {
      if (s.m > .18) { twinklers.push(s); continue; }
      if (g) { g.fillStyle = rgba(s.tint, s.alpha); g.beginPath(); g.arc(s.x, s.y, s.size, 0, Math.PI * 2); g.fill(); }
    }
    const bright = Array.from({ length: look.bright }, () => ({ x: rand() * W, y: rand() * H, size: 2.2 + rand() * 1.8, tint: rand() < look.colorShare ? lighten(pick(rand, theme), .3) : starTint(rand), phase: rand() * 100, speed: .6 + rand() * .6 }));
    const swells = Array.from({ length: look.swells }, () => ({ star: -1, start: 0, dur: 0, next: rand() * 3 }));
    return { kind: 'night', layer, twinklers, bright, swells, rand };
  }

  private buildPearls(): Scene {
    const look = PEARL_LOOKS[this.options.level], rand = seeded(0x2c1b3c);
    const stars = Array.from({ length: look.count }, (): Pearl => {
      const d = pearlDiameter(rand);
      return { x: rand() * this.width, y: rand() * this.height, d, m: (d - 5) / 15, colored: rand() < look.colorShare, hue: rand() * 12, rate: 1 / (10 + rand() * 10), phase: rand() * 100, speed: .7 + rand() * .7, phase2: rand() * 100 };
    });
    const swells = Array.from({ length: look.swells }, () => ({ star: -1, start: 0, dur: 0, next: rand() * 3 }));
    return { kind: 'pearl', stars, swells, rand };
  }

  private drawNight(ctx: CanvasRenderingContext2D, scene: Extract<Scene, { kind: 'night' }>, t: number, ox: number) {
    const look = NIGHT_LOOKS[this.options.level];
    for (const s of scene.twinklers) {
      // Shimmer: two fast, unrelated sines give a quick, irregular ripple, never a slow pulse.
      const tw = 1 - look.shimmer * (.5 + .5 * Math.sin(t * 5.1 * s.speed + s.phase) * Math.sin(t * 2.3 * s.speed + s.phase * 1.7));
      ctx.fillStyle = rgba(s.tint, s.alpha * tw); ctx.beginPath(); ctx.arc(this.wrap(s.x, ox), s.y, s.size, 0, Math.PI * 2); ctx.fill();
    }
    const bloom = new Map<number, number>();
    for (const sw of scene.swells) {
      if (sw.star < 0 || t > sw.start + sw.dur) {
        if (sw.star >= 0) { sw.star = -1; sw.next = t + 3 * (.5 + scene.rand()); }
        if (t >= sw.next && scene.bright.length) { sw.star = Math.floor(scene.rand() * scene.bright.length); sw.start = t; sw.dur = 2.4 + scene.rand() * 1.4; }
      }
      if (sw.star >= 0) bloom.set(sw.star, bloomOf(t, sw));
    }
    scene.bright.forEach((b, i) => {
      // One soft, slightly out-of-focus disc: white center fading through the tint. No hard dot, no rays.
      const tw = 1 - look.shimmer * .6 * (.5 + .5 * Math.sin(t * 4.3 * b.speed + b.phase) * Math.sin(t * 1.9 * b.speed + b.phase * 1.3));
      const e = bloom.get(i) ?? 0, x = this.wrap(b.x, ox), y = b.y, r = b.size * 2.2 * (1 + .3 * e);
      const gr = ctx.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, rgba('#ffffff', Math.min(1, .85 * tw + .15 + .1 * e)));
      gr.addColorStop(.22, rgba(b.tint, Math.min(1, .75 * tw + .2 * e)));
      gr.addColorStop(.5, rgba(b.tint, .28 * tw + .12 * e));
      gr.addColorStop(1, rgba(b.tint, 0));
      ctx.fillStyle = gr; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    });
  }

  private drawMeteors(ctx: CanvasRenderingContext2D, dt: number, still: boolean) {
    const rate = NIGHT_LOOKS[this.options.level].meteorsPerMinute;
    if (!still && Math.random() < dt * rate / 60) {
      this.meteors.push({ x: this.width * (.25 + Math.random() * .85), y: this.height * Math.random() * .45, angle: (200 + Math.random() * 25) * Math.PI / 180, speed: 900 + Math.random() * 500, len: 120 + Math.random() * 120, age: 0, life: .7 + Math.random() * .5 });
    }
    this.meteors = this.meteors.filter(m => m.age < m.life);
    for (const m of this.meteors) {
      m.age += dt;
      const a = Math.sin(Math.PI * m.age / m.life);
      const hx = m.x + Math.cos(m.angle) * m.speed * m.age, hy = m.y - Math.sin(m.angle) * m.speed * m.age;
      const tx = hx - Math.cos(m.angle) * m.len, ty = hy + Math.sin(m.angle) * m.len;
      const gr = ctx.createLinearGradient(tx, ty, hx, hy);
      gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(1, `rgba(255,255,255,${.85 * a})`);
      ctx.strokeStyle = gr; ctx.lineWidth = 1.4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(hx, hy); ctx.stroke();
      ctx.fillStyle = `rgba(255,255,255,${a})`; ctx.beginPath(); ctx.arc(hx, hy, 1.3, 0, Math.PI * 2); ctx.fill();
    }
  }

  private drawPearls(ctx: CanvasRenderingContext2D, scene: Extract<Scene, { kind: 'pearl' }>, t: number) {
    const look = PEARL_LOOKS[this.options.level], theme = this.themeColors(), { stars, swells, rand } = scene;
    const bloom = new Map<number, number>();
    for (const sw of swells) {
      if (sw.star < 0 || t > sw.start + sw.dur) {
        if (sw.star >= 0) { sw.star = -1; sw.next = t + look.swellGap * (.5 + rand()); }
        if (t >= sw.next && stars.length) {
          // Favour medium and large pearls so a swell reads as a star brightening.
          let choice = Math.floor(rand() * stars.length);
          for (let k = 0; k < 4 && stars[choice].d < 10; k++) choice = Math.floor(rand() * stars.length);
          sw.star = choice; sw.start = t; sw.dur = 2.4 + rand() * 1.4;
        }
      }
      if (sw.star >= 0) bloom.set(sw.star, bloomOf(t, sw));
    }
    stars.forEach((s, i) => {
      // Depth parallax: bigger, nearer-looking stars drift a little faster.
      const ox = ((t * look.drift * (.6 + .8 * s.m)) % this.width + this.width) % this.width, x = this.wrap(s.x, ox);
      const tw = 1 - look.shimmer * (.5 + .5 * Math.sin(t * 5.1 * s.speed + s.phase) * Math.sin(t * 2.3 * s.speed + s.phase2));
      const e = bloom.get(i) ?? 0, colors = s.colored ? theme : [PEARL_NEUTRAL];
      // Opal: colored pearls drift slowly between the theme's colors.
      const hue = s.colored ? (s.hue + look.opal * t * s.rate) % colors.length : 0;
      if (e > .01) this.drawPearl(ctx, colors, true, x, s.y, Math.min(36, Math.max(16, s.d * 1.8) * (1 + .5 * e)), hue, .6 * e);
      this.drawPearl(ctx, colors, false, x, s.y, s.d * (1 + .4 * e), hue, Math.min(1, (.6 + .4 * s.m) * tw + .6 * e));
    });
    ctx.globalAlpha = 1;
  }

  /** Blend two neighbouring palette sprites so a pearl's halo color can drift smoothly. */
  private drawPearl(ctx: CanvasRenderingContext2D, colors: string[], soft: boolean, x: number, y: number, d: number, hue: number, alpha: number) {
    const n = colors.length, i = Math.floor(hue) % n, f = hue - Math.floor(hue);
    ctx.globalAlpha = alpha * (1 - f); ctx.drawImage(this.sprite(colors[i], soft), x - d / 2, y - d / 2, d, d);
    if (f > .01) { ctx.globalAlpha = alpha * f; ctx.drawImage(this.sprite(colors[(i + 1) % n], soft), x - d / 2, y - d / 2, d, d); }
  }

  /**
   * A pearl: light can't be brighter than a white board, so it fakes it with a white core, a pastel halo,
   * and (on small pearls) a barely-there darker rim that lifts the core. Cached per color.
   */
  private sprite(tint: string, soft: boolean): HTMLCanvasElement {
    const key = tint + soft;
    const cached = this.sprites.get(key);
    if (cached) return cached;
    const size = 128, mid = size / 2, c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    if (g) {
      if (!soft) {
        const rim = g.createRadialGradient(mid, mid, mid * .45, mid, mid, mid);
        rim.addColorStop(0, 'rgba(70,64,110,0)'); rim.addColorStop(.55, 'rgba(70,64,110,.03)'); rim.addColorStop(1, 'rgba(70,64,110,0)');
        g.fillStyle = rim; g.fillRect(0, 0, size, size);
      }
      // Many eased stops so the halo never shows a band or an edge.
      const halo = g.createRadialGradient(mid, mid, 0, mid, mid, mid * (soft ? 1 : .78));
      for (let k = 0; k <= 10; k++) { const u = k / 10; halo.addColorStop(u, rgba(tint, (soft ? .45 : .8) * (1 - u) ** (soft ? 2.2 : 1.6))); }
      g.fillStyle = halo; g.fillRect(0, 0, size, size);
      const core = g.createRadialGradient(mid, mid, 0, mid, mid, mid * (soft ? .3 : .2));
      core.addColorStop(0, 'rgba(255,255,255,1)'); core.addColorStop(.55, `rgba(255,255,255,${soft ? .55 : .9})`); core.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = core; g.fillRect(0, 0, size, size);
    }
    this.sprites.set(key, c);
    return c;
  }
}
