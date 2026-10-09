type SocialBrand = 'instagram' | 'tiktok' | 'social-x' | 'github' | 'youtube' | 'linkedin' | 'facebook' | 'behance' | 'pinterest';

export interface SocialProfile { platform: string; handle: string; url: string; icon: SocialBrand; accent: string; }

/** Conservative URL-only detection; never fetches account data or follows redirects. */
export function detectSocialProfile(raw: string): SocialProfile | null {
  let url: URL;
  try { url = new URL(/^[a-z][a-z\d+.-]*:/i.test(raw.trim()) ? raw.trim() : `https://${raw.trim()}`); } catch { return null; }
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.port) return null;
  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  const parts = url.pathname.split('/').filter(Boolean);
  const profile = (platform: string, handle: string, icon: SocialBrand, accent: string): SocialProfile => {
    url.protocol = 'https:'; url.search = ''; url.hash = '';
    return { platform, handle, icon, accent, url: url.href };
  };
  const single = parts.length === 1 ? parts[0] : '';
  if (host === 'instagram.com' && /^[\w.]{1,30}$/.test(single) && !['p', 'reel', 'reels', 'stories', 'explore', 'accounts', 'direct', 'about'].includes(single.toLowerCase()))
    return profile('Instagram', `@${single}`, 'instagram', '#c13584');
  if (host === 'tiktok.com' && /^@[\w.]+$/.test(single))
    return profile('TikTok', single, 'tiktok', '#25a8ac');
  if (['x.com', 'twitter.com'].includes(host) && /^\w{1,15}$/.test(single) && !['home', 'explore', 'search', 'i', 'settings', 'messages', 'notifications', 'login', 'signup', 'intent', 'share'].includes(single.toLowerCase()))
    return profile('X', `@${single}`, 'social-x', '#777777');
  if (host === 'github.com' && /^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(single) && !['settings', 'explore', 'features', 'topics', 'marketplace', 'login', 'join', 'about', 'pricing', 'orgs', 'organizations', 'notifications', 'search'].includes(single.toLowerCase()))
    return profile('GitHub', `@${single}`, 'github', '#8267b8');
  if (host === 'youtube.com' && /^@[\w.-]+$/.test(single))
    return profile('YouTube', single, 'youtube', '#db3434');
  if (host === 'linkedin.com' && parts.length === 2 && parts[0] === 'in' && /^[\w-]+$/.test(parts[1]))
    return profile('LinkedIn', parts[1], 'linkedin', '#0a66c2');
  if (host === 'facebook.com' && /^[\w.]+$/.test(single) && !['watch', 'reel', 'reels', 'stories', 'groups', 'events', 'marketplace', 'login', 'share', 'sharer.php', 'profile.php', 'pages', 'help', 'settings'].includes(single.toLowerCase()))
    return profile('Facebook', single, 'facebook', '#1877f2');
  if (host === 'behance.net' && /^[\w.-]+$/.test(single) && !['gallery', 'search', 'galleries', 'jobs', 'hire', 'live', 'assets'].includes(single.toLowerCase()))
    return profile('Behance', `@${single}`, 'behance', '#1769ff');
  if (host === 'pinterest.com' && /^[\w]+$/.test(single) && !['pin', 'search', 'ideas', 'today', 'login', 'settings', 'business', 'explore'].includes(single.toLowerCase()))
    return profile('Pinterest', `@${single}`, 'pinterest', '#e60023');
  return null;
}
