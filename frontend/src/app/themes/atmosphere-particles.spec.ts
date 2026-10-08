import { AtmosphereParticles } from './atmosphere-particles';

describe('Atmosphere particle fields', () => {
  it('keeps small snow at every intensity while increasing the share of large flakes', () => {
    const atmosphere = new AtmosphereParticles();
    const largeShares = (['light', 'medium', 'heavy'] as const).map(level => {
      const particles = atmosphere.particles('snow', level);
      expect(particles.some(p => p.size < 2.1)).toBe(true);
      expect(particles.some(p => p.size > 2.5 && p.size < 4.6)).toBe(true);
      expect(particles.some(p => p.size >= 6)).toBe(true);
      expect(atmosphere.particles('snow', level)).toBe(particles);
      return particles.filter(p => p.size >= 6).length / particles.length;
    });
    expect(largeShares[1]).toBeGreaterThan(largeShares[0]);
    expect(largeShares[2]).toBeGreaterThan(largeShares[1]);
    expect(largeShares[2]).toBeLessThan(.4);
  });
});
