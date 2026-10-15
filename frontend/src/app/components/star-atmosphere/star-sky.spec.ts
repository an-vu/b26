import { BOARD_THEMES } from '../../themes/board-theme';
import { lighten, NIGHT_LOOKS, pearlDiameter, PEARL_LOOKS, seeded, STAR_THEME_COLORS } from './star-sky';

describe('star sky', () => {
  it('keeps the tuned Pattern Lab values for each level', () => {
    expect(PEARL_LOOKS.light).toMatchObject({ count: 250, colorShare: .4, shimmer: .45, swells: 4, swellGap: 2 });
    expect(PEARL_LOOKS.medium).toMatchObject({ count: 300, colorShare: .55, shimmer: .5 });
    expect(PEARL_LOOKS.heavy).toMatchObject({ count: 400, colorShare: .7, shimmer: .55 });
    expect(NIGHT_LOOKS.light.meteorsPerMinute).toBe(5.5);
    expect(NIGHT_LOOKS.medium.meteorsPerMinute).toBe(6.5);
    expect(NIGHT_LOOKS.heavy).toMatchObject({ meteorsPerMinute: 7.5, shimmer: .6 });
  });

  it('gets busier from Light to Heavy in both modes', () => {
    expect(PEARL_LOOKS.light.count).toBeLessThan(PEARL_LOOKS.medium.count);
    expect(PEARL_LOOKS.medium.count).toBeLessThan(PEARL_LOOKS.heavy.count);
    expect(NIGHT_LOOKS.light.faint).toBeLessThan(NIGHT_LOOKS.medium.faint);
    expect(NIGHT_LOOKS.medium.faint).toBeLessThan(NIGHT_LOOKS.heavy.faint);
  });

  it('has star colors for every theme', () => {
    for (const theme of BOARD_THEMES) {
      const colors = STAR_THEME_COLORS[theme.id];
      expect(colors.length).toBeGreaterThanOrEqual(3);
      expect(colors.every(hex => /^#[0-9a-f]{6}$/.test(hex))).toBe(true);
    }
  });

  it('keeps pearls star-sized: mostly tiny, many medium, few large, never over 20px', () => {
    const rand = seeded(42), sizes = Array.from({ length: 4000 }, () => pearlDiameter(rand));
    const share = (test: (d: number) => boolean) => sizes.filter(test).length / sizes.length;
    expect(Math.max(...sizes)).toBeLessThanOrEqual(20);
    expect(Math.min(...sizes)).toBeGreaterThanOrEqual(5);
    expect(share(d => d < 8)).toBeCloseTo(.55, 1);
    expect(share(d => d >= 10 && d < 14)).toBeGreaterThan(.3);
    expect(share(d => d > 14)).toBeLessThan(.07);
  });

  it('lightens toward white', () => {
    expect(lighten('#000000', 1)).toBe('#ffffff');
    expect(lighten('#3185fc', 0)).toBe('#3185fc');
  });
});
