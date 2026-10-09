import { detectSocialProfile } from './social-profile.util';

describe('Social profile detection', () => {
  it('normalizes Instagram and removes tracking parameters', () => {
    expect(detectSocialProfile(' instagram.com/instagram?igsh=tracking ')).toMatchObject({ platform: 'Instagram', handle: '@instagram', url: 'https://instagram.com/instagram' });
  });
  it.each([
    ['https://www.tiktok.com/@nori', 'TikTok'], ['x.com/nori', 'X'], ['twitter.com/nori', 'X'],
    ['github.com/an-vu', 'GitHub'], ['youtube.com/@nori', 'YouTube'], ['linkedin.com/in/nori', 'LinkedIn'], ['facebook.com/nori', 'Facebook'], ['behance.net/nori', 'Behance'], ['pinterest.com/nori', 'Pinterest'],
  ])('recognizes %s', (url, platform) => expect(detectSocialProfile(url)?.platform).toBe(platform));
  it.each(['instagram.com/p/abc', 'instagram.com/reel/abc', 'instagram.com/explore', 'tiktok.com/@nori/video/123', 'x.com/nori/status/123', 'youtube.com/watch?v=123', 'github.com/an-vu/b26', 'instagram.com.evil.test/nori', 'https://instagram.com@evil.test/nori', 'javascript:alert(1)', 'https://instagram.com:444/nori', 'example.com', 'behance.net/gallery/123/project', 'pinterest.com/pin/123', 'pinterest.com/nori/board'])('does not misclassify %s', url => expect(detectSocialProfile(url)).toBeNull());
});
