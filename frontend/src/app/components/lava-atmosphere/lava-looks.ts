import type { BoardAppearance } from '../../models/board';

export type LavaLevel = NonNullable<BoardAppearance['patternIntensity']>;

/**
 * Berry's signature: the Account, Search and Home dock colors (#a64ce6, #3185fc, #00b2d7).
 * The shader adds overlapping bands like light, so full-strength colors bleach to white. Blue is
 * at 50% and cyan at 85% so all three read (measured: ~12% washed out, cyan 36 / blue 40 / purple 24).
 * Berry's pearl pink would only whiten the bands, so it lives in the glow underneath instead.
 */
export const BERRY_LAVA = ['#a64ce6', '#19437e', '#0097b7'];
export const BERRY_PEARL_GLOW = '#e4c4d688';
const DEFAULT_GLOW = '#e8898b55';

type LavaLook = {
  /** 'classic' mixes raw RGB light (the original lava); 'berry' and 'board' use real palettes. */
  colors: 'classic' | 'berry' | 'board';
  brightness: number;
  /** The soft radial wash under the lava. */
  glow: string;
  speed: number;
  /** How much blob size grows above its resting 1.0 over time. */
  sizeDrift: number;
  /** How far warp wobbles around its resting 1.0. Keep it at or below .1: outside 0.9-1.15 the lava vanishes. */
  warpDrift: number;
};

export const LAVA_LOOKS: Record<LavaLevel, LavaLook> = {
  light: { colors: 'berry', brightness: 1, glow: BERRY_PEARL_GLOW, speed: .16, sizeDrift: .15, warpDrift: .04 },
  medium: { colors: 'classic', brightness: 1.15, glow: DEFAULT_GLOW, speed: .2, sizeDrift: .25, warpDrift: .07 },
  heavy: { colors: 'board', brightness: 1.3, glow: DEFAULT_GLOW, speed: .24, sizeDrift: .35, warpDrift: .1 },
};

/** Blob size: rests at 1.0 and only grows, since bigger blobs show more lava, never less. */
export function lavaScale(look: LavaLook, seconds: number): number {
  return 1 + look.sizeDrift * (drift(seconds, 31, 53) + 1) / 2;
}

/** Warp: a gentle wobble around 1.0, inside the band where the lava stays visible. */
export function lavaWarp(look: LavaLook, seconds: number): number {
  return 1 + look.warpDrift * drift(seconds, 41, 67);
}

/** Lava colors for a level, as hex. Empty means classic RGB mixing. */
export function lavaColors(level: LavaLevel, boardColor: string): string[] {
  const look = LAVA_LOOKS[level].colors;
  if (look === 'classic') return [];
  if (look === 'berry') return BERRY_LAVA;
  return boardLavaColors(boardColor);
}

/** Three glowing shades around the board's hue. Neutral boards (white, black, gray) fall back to Berry. */
export function boardLavaColors(hex: string): string[] {
  const rgb = hexToRgb(hex);
  // Judge neutrality by channel spread; HSL saturation overstates near-white colors like #f9f8f6.
  if (Math.max(...rgb) - Math.min(...rgb) < .08) return BERRY_LAVA;
  const [h, s] = hexToHsl(hex);
  return [hsl(h, Math.max(s, .7), .62), hsl(h - 32, Math.max(s, .65), .55), hsl(h + 28, Math.max(s, .6), .72)];
}

/**
 * Smooth drift in [-1, 1]: two slow sines with unrelated periods (seconds), so the motion never
 * visibly loops and never jerks.
 */
export function drift(seconds: number, periodA: number, periodB: number): number {
  const tau = Math.PI * 2;
  return .6 * Math.sin(tau * seconds / periodA) + .4 * Math.sin(tau * seconds / periodB + 1.3);
}

export function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', '').slice(0, 6), 16);
  return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

function hexToHsl(hex: string): [number, number, number] {
  const [r, g, b] = hexToRgb(hex);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min, s = l > .5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}

function hsl(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360;
  const k = (n: number) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return '#' + [f(0), f(8), f(4)].map(v => Math.round(v * 255).toString(16).padStart(2, '0')).join('');
}
