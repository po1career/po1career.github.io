# AGENTS.md — working rules for AI coding agents (Codex, Claude, etc.)

This is the **shared source of truth for public conventions** for anyone (human or AI) editing this repo.
Read it before making changes. The maintainer's local helpers also follow a private rulebook (passcodes,
database pipeline, history) kept outside this repo; if you change a public convention, update it **here**.

## What this is
The PLK No.1 W.H. Cheung College Career Team website — a static, no-build, vanilla HTML/CSS/JS site
served by **GitHub Pages from `main`** and available at **https://po1career.net**. News feed +
study/JUPAS tools. Some tools are passcode-gated and decrypt an encrypted database in the browser.

## Golden workflow (prevents two agents clobbering each other)
- **`main` is the single source of truth.** Fetch/pull it before you start; never edit a stale tree.
- **NOBODY pushes to `main` directly — Codex AND Claude/local alike (since 2026-07-10).** Work on a
  branch (`codex/<topic>` or `local/<topic>`) and open a **pull request**; the owner squash-merges.
  (The CI check in `.github/workflows/pr-check.yml` must be green first.)
- **One open PR at a time.** Merge or close it before starting the next piece of work, and only start
  a new task when the previous work is pushed.
- **One agent editing at a time.** Never leave uncommitted work in one tool when switching to another.
- Keep commits small and focused so the other agent always starts from a clean, current `main`.

## Gated-page QA gate (CI cannot check behind the lock)
Any PR that touches `jupas-*.html/.js`, `streaming-tool.html`, `dse-portfolio.*`, `sw.js`, or any
`*.enc.json` **must pass the automated gated-page test BEFORE merging**: `node tools/gated-qa.mjs` with the
passcodes supplied as `PO1_STUDENT_PASS` / `PO1_TEACHER_PASS` / `PO1_STREAMING_PASS` environment variables
(only the maintainer's local setup has them — never commit them). It checks all locked pages in headless
Chrome: locks, wrong/other passcodes rejected, unlock, engine-consistent scores, no console errors, no
third-party requests. For visual changes also look at the page. An agent without the passcodes must say in
the PR body that gated QA is still pending, so the owner doesn't merge early.

## HARD RULES — these are the real footguns

1. **Cache-busting (`?v=N`) — the #1 source of "my change didn't show up".**
   After editing ANY `.css` or `.js`, bump its `?v=N` in **every** HTML file that references it.
   - `jupas-engine.js` is loaded by FOUR pages — `jupas-evaluator.html`, `jupas-finder.html`,
     `jupas-planner.html`, `jupas-choices.html` — bump all four.
   - `sw.js`'s `CORE` precache list pins exact `?v=` URLs. If the file you bumped is listed there,
     update its `?v=` in `CORE` too, so it matches what the HTML loads.
   - Whenever `sw.js`'s precache list changes, bump the `CACHE` constant in `sw.js`.
   - HTML files themselves are not `?v`-tagged (they're the entry points).

2. **Never commit secrets or plaintext data.** Only encrypted `*.enc.json` is deployable. Never add:
   `programmes.csv`, any `*Unified_Data*.json` or plaintext `*-db.json`, or any passcode literal.
   (`.gitignore` covers the known ones; don't defeat it.)

3. **Gated tool pages** (`jupas-choices`, `jupas-finder`, `jupas-planner`, `jupas-evaluator`,
   `streaming-tool`, `dse-portfolio`) must keep: `<meta name="robots" content="noindex">`,
   no entry in `sitemap.xml`, their strict `Content-Security-Policy`, and **zero third-party network
   calls** (minors' privacy — fonts are self-hosted, no CDNs/analytics). Escape any user-supplied text
   before inserting as HTML. `tools/check.mjs` finds gated pages automatically (password input + lock
   screen), so a new gated page is held to these rules too.

4. **Shared vs. separate code.** `jupas-engine.js` is ONE file shared by the evaluator, finder, planner
   and choices pages — a change affects all four. The two `*-analytics.js` copies are **separate** — diff before
   assuming a change applies to both.

5. **Database rebuilds require a private toolchain** that is not in this repo. If a task needs the
   `.enc.json` databases regenerated and you don't have the private repo, hand it off to the maintainer's
   local setup — never fabricate or hand-edit the encrypted files.

## How to verify before opening a PR
- **Run the checks:** `node tools/check.mjs --base origin/main` (Node 18+, no install). CI runs exactly
  this script, so green locally = green in CI. It covers: JS syntax · engine smoke test · no plaintext
  DB/passcodes · every referenced file exists · the same `?v=` on every page · `sw.js` `CORE` matches
  the pages · CSP on every page with no third-party origins · every passcode-gated page (detected
  automatically) is `noindex` and not in `sitemap.xml` · edited `.js`/`.css` got a new `?v=` ·
  `CACHE` bumped when `CORE` changes.
- **Bump versions with the helper, not by hand:** `node tools/bump.mjs <file> [...]` raises the
  file's `?v=` on every page and in `sw.js` (bumping `CACHE` when needed);
  `node tools/bump.mjs --sync-sw` repairs `sw.js` `CORE`. Add `--dry-run` to preview.
- **Serve it:** `python3 -m http.server` in the repo and open the page.
- **Gated pages need a passcode to preview** (kept private). With the passcodes: run `tools/gated-qa.mjs`
  (see above). Without them you cannot verify gated pages — say so in the PR.

## Weekly watch (automatic)
`.github/workflows/weekly-watch.yml` runs `tools/watch.mjs` every Monday (and on demand from the Actions
tab). It compares JUPASCal's published data version / latest release / next admission cycle with
`tools/upstream.json`, and checks the external links in the public pages. It never edits the site; it
keeps one open issue titled "Weekly site watch" and comments only when the findings change. After an
upstream sync, update `tools/upstream.json` in the same PR so the watch goes quiet.

## Who does what
- **Local helper on the maintainer's Mac (Codex = primary, Claude Code = fallback; one at a time):** does
  everything — public pages, gated-page QA, encrypted-DB rebuilds, upstream syncs — following this file and
  the private rulebook. Delivers via branch → PR; the owner merges (or asks the helper to).
- **Any agent without the private repo** (e.g. a cloud agent): public-page work self-verifiable with
  `tools/check.mjs`; **cannot** run gated QA or rebuild DBs — flag that in the PR.

## Conventions
- Vanilla JS, no framework, no build step. Match the surrounding code's style.
- Every user-facing string is bilingual (English + 繁體中文); add both.
- The scoring engine has **no DOM dependencies** — keep it that way so it stays testable in node/JSC.
