# Social widget

## Implemented locally

One profile per widget. Paste a supported profile URL; BlueBerry detects its platform and handle without making an external request. Missing schemes become HTTPS. Recognized profiles discard tracking query strings and fragments.

| Platform | Supported profile URL | Displayed logo |
| --- | --- | --- |
| Instagram | `instagram.com/username` | Instagram |
| TikTok | `tiktok.com/@username` | TikTok |
| X / Twitter | `x.com/username`, `twitter.com/username` | Twitter bird |
| GitHub | `github.com/username` | GitHub |
| YouTube | `youtube.com/@username` | YouTube |
| LinkedIn | `linkedin.com/in/username` | LinkedIn |
| Facebook | `facebook.com/username` | Facebook |
| Behance | `behance.net/username` | Behance |
| Pinterest | `pinterest.com/username` | Pinterest |

`www.` is accepted. Detection supports these URL shapes, not every URL offered by each platform. Posts, reels, projects, pins, and board URLs are not profile cards. Unsupported links retain the generic link fallback. Detection does not verify account existence.

## Layout and editing

- No redundant platform heading on the widget front.
- Platform logo in a 44px rounded square, 28px artwork with 8px inset.
- Handle below the logo; Follow button below the handle.
- Follower count sits inside Follow; unknown counts display `—`, never zero or invented data.
- Follow opens the platform profile; it does not follow automatically.
- The back uses shared panel styling, widget corners/insets, a Social media link field, and Done.
- Done retains the widget draft; clicking outside cancels that editor session. Board Save/Cancel controls persistence.

## Assets and implementation

- Logos: `frontend/public/brand/social/`, locally hosted SVGs with sources in its README.
- Instagram: official Meta white glyph on a gradient badge. Other glyphs: Simple Icons 11.15.0. Twitter bird is intentional.
- Detection: `frontend/src/app/utils/social-profile.util.ts`.
- Rendering: `frontend/src/app/widgets/link-widget/`.
- Saved type remains `link` for compatibility; no data migration is required.

## Planned, not connected

Live follower counts, account privacy detection, profile photos, and recent posts require platform-specific data integrations. No automatic follower lookup currently runs. More platforms and URL formats can be added with detection tests and sourced assets.
