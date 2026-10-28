# AGENTS.md — working rules for AI coding agents (Codex, Claude, etc.)

This is the **shared source of truth** for anyone (human or AI) editing this repo. Read it before
making changes. Claude's private notes live in `CLAUDE.md` (gitignored) and reference this file;
keep the two consistent — if you change a convention, update it **here**.

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
`*.enc.json` **must get a local (Claude/owner) preview-QA behind the passcode BEFORE merging** —
unlock the page, click through the changed flow, check the console. Codex: state in the PR body that
gated QA is still pending so the owner doesn't merge early.

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

3. **Gated tool pages** (`jupas-tool`, `jupas-choices`, `jupas-finder`, `jupas-evaluator`,
   `streaming-tool`, `dse-portfolio`) must keep: `<meta name="robots" content="noindex">`, their
   strict `Content-Security-Policy`, and **zero third-party network calls** (minors' privacy — fonts
   are self-hosted, no CDNs/analytics). Escape any user-supplied text before inserting as HTML.

4. **Shared vs. separate code.** `jupas-engine.js` is ONE file shared by the evaluator, finder, planner
   and choices pages — a change affects all four. The two `*-analytics.js` copies are **separate** — diff before
   assuming a change applies to both.

5. **Database rebuilds require a private toolchain** that is not in this repo. If a task needs the
   `.enc.json` databases regenerated, hand it off to the local/Claude workflow — don't fabricate or
   hand-edit the encrypted files.

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
- **Gated pages need a passcode to preview** (kept private). If you can't unlock them, you cannot do
  visual QA — say so and leave UI verification to the local/Claude workflow, which has the passcode.

## Who does what (play to each tool's strengths)
- **Codex (cloud/GitHub):** logic refactors, data transforms, content edits, writing tests —
  anything self-verifiable with `node`. Delivers via branch → PR. **Cannot** preview gated pages
  (no passcode) or rebuild the encrypted DBs (no private toolchain).
- **Claude Code (local):** browser-preview/visual QA of gated pages (has the passcode locally),
  encrypted-DB rebuilds, and maintaining the private `CLAUDE.md` project memory.

## Conventions
- Vanilla JS, no framework, no build step. Match the surrounding code's style.
- Every user-facing string is bilingual (English + 繁體中文); add both.
- The scoring engine has **no DOM dependencies** — keep it that way so it stays testable in node/JSC.
