# CLAUDE.md — Project Memory: PLK No.1 Career Team Website

> If you are a fresh Claude session opening this project, READ THIS FIRST.
> It is the "memory" of everything decided so far. The website files are the
> source of truth; this file explains the *why* and *how*.

## What this project is
A WordPress-style **news/announcement website** for the
**升學輔導及生涯規劃組 (Career Team)** of
**保良局第一張永慶中學 / PLK No.1 W.H. Cheung College** (a Hong Kong secondary school).

Students browse the latest updates, organised into categories, in a feed
(newest first). Staff post updates either via an admin form or by sending
Claude the text/poster. Audience: secondary students. Bilingual (English + 中文).

## Tech approach (IMPORTANT decisions)
- **Static site** — plain HTML/CSS/JS, no backend, no build step. Hosted (planned) on **GitHub Pages** (free, HTTPS).
- **Privacy first (minors' site):** NO third-party calls. All fonts are **self-hosted** (see below). Do NOT re-introduce Google Fonts `<link>` tags or any external CDN.
- **No personal data collected.** No student logins, no forms storing PII. Keep it publish-only. If asked to add data collection (sign-up forms, etc.), flag the privacy implications first.

## File structure
```
plk-career-team/
  index.html            Main page (feed, categories, post viewer, bilingual toggle)
  admin.html            "Add Post" panel for non-technical staff
  app.js                Front-end: rendering, i18n (EN/中), filters, post modal
  admin.js              Admin panel logic (localStorage + Export posts.js)
  posts.js              POST DATA (window.SEED_POSTS), TEAM, RESOURCES
  styles.css            All styling (palette + layout)
  fonts/
    fonts.css           Self-hosted Nunito + (unused) Fraunces @font-face
    *.woff2             Nunito + Fraunces Latin font files
    notosanstc.css      Self-hosted Noto Sans TC (Chinese) @font-face
    tc/*.woff2          105 Noto Sans TC chunks (on-demand subsets)
  images/
    logo.jpg            School/team logo (watercolour cat)
    header-bg.svg       Header background art ("Dream high and fly high")
    leaf.svg, sprig.svg Decorative botanical SVGs
    hsuhk-admission-talk.png, society-game-day.jpg  Post posters
  to-post/              DROP FOLDER: staff save posters here + paste text in chat
  google-site-preview.html   A mockup of the Google Sites look (NOT the real site; comparison only)
  CLP-website-template.md    Original intake Q&A
```

## Branding / design
- **Names:** EN "PLK No.1 W.H. Cheung College" + "Career Team"; 中 "保良局第一張永慶中學" + "升學輔導及生涯規劃組".
- **Motto (bilingual):** "Dream high and fly high" / 「展翅高飛・逐夢前行」.
- **Palette** (from the logo), in styles.css `:root`: cream `#FAF4E6`, brown `#5B3A24`, gold `#C9A24B`, sage `#8BA888`, beige `#F3E8CE`.
- **Fonts UNIFIED to one sans look:** Latin = **Nunito**; Chinese = **Noto Sans TC** (self-hosted). Both `--font-display` and `--font-body` in styles.css point to the same stack. (Fraunces serif was removed from use but its files remain — harmless, unreferenced.)
- **Header** has a vivid dawn-sky SVG background (birds soaring, paper plane on a dotted "dream trail", sun glow) with a left-side readability veil. Logo is 86px with a gold ring + shadow.
- **Footer** (bottom bar, brown) has two icon links styled with the shared `.footlink` class:
  globe → `https://www.plkno1.edu.hk` (text "plkno1.edu.hk"); Instagram → `@po1.careerteam`.
  Plus a small "Staff: Add / manage posts" link to admin.html. Mission text on the left (language-aware, `#footer-about`).

## Interactions / UX (in app.js + styles.css)
- **Whole post card is clickable** (role=button, tabindex, Enter/Space) → opens the post modal. "Read more" is now just a visual cue (a `<span>`, not a link).
- **Cards grow on hover** — `.card:hover` does `translateY(-6px) scale(1.035)` with a 0.18s transition (smooth grow + shrink-back).
- **Post photo lightbox:** inside the open post, clicking the cover photo (`#art-cover`, cursor:zoom-in) pops out a full-screen `.lightbox` (`#lightbox` / `#lightbox-img`). Close by clicking it, the ✕ (`#lb-close`), or Esc. Esc closes the lightbox FIRST, then a second Esc closes the post.

## Categories (4) — keys used in posts.js `category` field
| key | EN | 中 | icon |
|-----|----|----|------|
| `local`    | Local Universities    | 本地大學 | 🎓 |
| `mainland` | Mainland Universities | 內地大學 | 🏛️ |
| `foreign`  | Foreign Universities  | 海外大學 | 🌍 |
| `career`   | Career Experience Activities | 職業體驗活動 | 💼 |

Labels/icons live in app.js (`T.en`, `T.zh`, `ICON`) and the chips array in `render()`.
Tag colours in styles.css (`.tag.local/.mainland/.foreign/.career`).
Admin `<select>` options in admin.html + `cat` map in admin.js must match.

## How to ADD A POST (the streamlined workflow the user uses)
1. User saves a poster/photo into `to-post/` and pastes details in chat.
2. Claude: read the poster (use `sips`/`qlmanage` to render PDFs; `Read` the image),
   optimise the image (`sips --resampleWidth 1000 images/<name>`), copy into `images/`.
3. Add a new object to the TOP of `window.SEED_POSTS` in posts.js with fields:
   `id, category, date (YYYY-MM-DD), pinned, image, title_en, title_zh, body_en, body_zh`.
4. Bump the `posts.js?v=N` query in index.html (cache-busting).
5. Verify in the local preview, show the user, get approval.

## Conventions / gotchas
- **Cache-busting:** index.html references `styles.css?v=N`, `posts.js?v=N`, `app.js?v=N`.
  BUMP the version number whenever you edit that file, or the browser serves a stale copy.
  Current versions (last session): styles.css?v=12, app.js?v=8, posts.js?v=5. admin.html uses styles.css?v=8.
- **Pasted chat images can't be saved to disk** — always ask the user to save image FILES
  (e.g. into `to-post/` or Downloads) and reference by filename.
- **Bilingual:** every post needs `_en` and `_zh` fields; UI strings live in app.js `T`.
- **Preview:** served via `.claude/launch.json` (python http.server on :8123, --directory plk-career-team). Use the Preview tools. Screenshots tend to snap to top; verify details via `preview_eval`.
- Body text uses `\n` for line breaks (rendered with white-space:pre-wrap).

## Status (as of last session, 2026-06)
DONE: full site built; bilingual; 4 categories (local/mainland/foreign/career);
self-hosted fonts unified to Nunito + Noto Sans TC (no Google calls); header dawn-sky
art + bilingual motto; logo enlarged (86px); full school name applied everywhere;
"Our Team" section removed; admin panel; drop-folder workflow tested end-to-end.
Interactions: whole-card click, hover-grow, post-photo lightbox.
Footer: school website + Instagram links.
2 real posts live: HSUHK admission talk [pinned, category local], HKU Society Game Day [local].
A timestamped backup zip was created in the parent folder (Desktop/claude/).

NEXT / TODO:
- [ ] Publish to **GitHub Pages** (user chose this over Google Sites). Needs: user creates
      GitHub account + repo; git authenticated on this Mac (`gh auth login`); then push.
      Add a `.nojekyll` file before deploying. Once connected, Claude can push updates
      (ask permission before each publish).
- [ ] Optional cleanup: remove unused Fraunces font files; clear test files from `to-post/`.
- [ ] Optional: swap the footer globe icon for the school's real crest image if provided.

## User preferences
- Wants a streamlined flow: send poster + text → Claude posts it.
- Cares about net safety / data security (minors). Keep it private, no third-party calls.
- Prefers being walked through GitHub via the web UI (non-command-line) when possible.
