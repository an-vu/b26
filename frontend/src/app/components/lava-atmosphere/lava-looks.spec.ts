import { BERRY_LAVA, boardLavaColors, drift, LAVA_LOOKS, lavaColors, lavaScale, lavaWarp } from './lava-looks';

describe('lava looks', () => {
  it('gives each level its own colors', () => {
    expect(lavaColors('light', '#3185fc')).toEqual(BERRY_LAVA);
    expect(lavaColors('medium', '#3185fc')).toEqual([]);
    expect(lavaColors('heavy', '#3185fc')).toEqual(boardLavaColors('#3185fc'));
  });

  it('keeps Berry to the three dock colors with the pearl in the glow, so the bands never bleach white', () => {
    expect(BERRY_LAVA).toHaveLength(3);
    expect(LAVA_LOOKS.light.glow.startsWith('#e4c4d6')).toBe(true);
  });

  it('builds three shades from a colorful board and falls back to Berry on neutral boards', () => {
    expect(boardLavaColors('#f0386b')).toHaveLength(3);
    expect(boardLavaColors('#f0386b').every(hex => /^#[0-9a-f]{6}$/.test(hex))).toBe(true);
    for (const neutral of ['#f9f8f6', '#30302e', '#62625e']) expect(boardLavaColors(neutral)).toEqual(BERRY_LAVA);
  });

  it('never shrinks blobs below the default or pushes warp outside the visible band', () => {
    // Measured: the lava fades out once warp leaves roughly 0.9-1.15.
    for (const look of Object.values(LAVA_LOOKS)) {
      for (let t = 0; t < 600; t += 0.5) {
        expect(lavaScale(look, t)).toBeGreaterThanOrEqual(1);
        expect(lavaWarp(look, t)).toBeGreaterThanOrEqual(0.9);
        expect(lavaWarp(look, t)).toBeLessThanOrEqual(1.1);
      }
    }
  });

  it('drifts smoothly within [-1, 1]', () => {
    let previous = drift(0, 31, 53);
    for (let t = 0.1; t < 300; t += 0.1) {
      const value = drift(t, 31, 53);
      expect(Math.abs(value)).toBeLessThanOrEqual(1);
      expect(Math.abs(value - previous)).toBeLessThan(0.02);
      previous = value;
    }
  });
});
