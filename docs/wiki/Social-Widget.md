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
- Actions open the platform profile; they do not subscribe, connect or follow automatically. YouTube uses Subscribe, LinkedIn personal profiles use Connect, and other platforms use Follow. Facebook retains Follow because its URLs do not reliably distinguish profiles from Pages.
- The back uses shared panel styling, widget corners/insets, a Social media link field, and Done.
- Done retains the widget draft; clicking outside cancels that editor session. Board Save/Cancel controls persistence.

## Assets and implementation

- Logos: `frontend/public/brand/social/`, locally hosted SVGs with sources in its README.
- Instagram: official Meta white glyph on a gradient badge. Other glyphs: Simple Icons 11.15.0. Twitter bird is intentional.
- Detection: `frontend/src/app/utils/social-profile.util.ts`.
- Rendering: `frontend/src/app/widgets/link-widget/`.
- Saved type remains `link` for compatibility. Instagram data caching uses migration V39.

## Other platforms

Other platforms currently use URL detection only. Their live follower counts and recent posts remain planned.

## Instagram data integration

Saved Instagram widgets can retrieve follower counts and up to nine recent posts through Apify's `apify/instagram-profile-scraper`. No profile-picture field is stored or returned. The provider may include additional fields in its response; BlueBerry discards them.

Set `APIFY_TOKEN` on the **backend only**. For local Docker, put the replacement token in the ignored root `.env`, then run `docker compose --project-name b26-local --file docker-compose.local.yml up -d --build backend`. Never put it in frontend environment files or commit it. Production uses the backend host's environment settings.

`INSTAGRAM_DAILY_FETCH_LIMIT` defaults to 20 provider runs per UTC day across instances; 0 disables paid fetches. Each run requests a maximum total charge of USD 0.02. These are application limits, not a guarantee of a free provider plan. Configure spending controls in Apify as well.

V39 adds a persistent six-hour profile cache, a cross-instance refresh lease, and a daily fetch budget. Failed requests back off for 15 minutes; private profiles return no posts or count. A failure is never labelled private. Requests run in a bounded background queue while the widget polls briefly. The endpoint enforces board read access and only fetches URLs already saved on enabled Social widgets; picker/editor previews make no provider calls. Profile/board changes cancel stale requests and reset the rendered result; unrelated title/order edits retain it. Polling pauses while the browser tab is hidden and resumes when visible, until a terminal result or the response budget is reached.

Posts are sorted newest-first from the provider's returned latest-post set, deduplicated and capped at nine. Instagram CDN images can expire or fail; failed thumbnails stay blank until the next refresh. JPEG thumbnails are served through a board-authorized backend endpoint because Instagram blocks direct cross-origin image embedding. They are cached in memory per backend instance for five minutes (16 MiB / 64 entries maximum), with at most four upstream image fetches at once and concurrent requests for the same URL sharing a fetch. Every request checks board/widget access before consulting the cache. They are not persisted in BlueBerry storage. With no token, the widget keeps its ordinary profile link and an unavailable count. Live results require a separately configured replacement token and provider verification.

The small square Instagram widget keeps the stacked logo, handle and Follow button, with the newest post as its background and a dark readability overlay. Larger layouts retain the nine-post grid.

Brand tints over the active theme’s widget material: YouTube red; Twitter blue; Facebook, LinkedIn and Behance their respective blues; Pinterest red; TikTok near-black; GitHub and Instagram light grey/white. A small Instagram widget with a recent post retains its photo background.

Social cards retain the theme’s shared surface, shadows and action-button styling. Platform colors are translucent tints, preserving Berry glass/frost and Omakase blossoms without adding another blur layer.
