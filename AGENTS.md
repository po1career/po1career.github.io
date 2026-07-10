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
   - `jupas-engine.js` is loaded by BOTH `jupas-evaluator.html` and `jupas-finder.html` — bump both.
   - If you change `sw.js`'s precache list, bump the `CACHE` constant in `sw.js`.
   - HTML files themselves are not `?v`-tagged (they're the entry points).

2. **Never commit secrets or plaintext data.** Only encrypted `*.enc.json` is deployable. Never add:
   `programmes.csv`, any `*Unified_Data*.json` or plaintext `*-db.json`, or any passcode literal.
   (`.gitignore` covers the known ones; don't defeat it.)

3. **Gated tool pages** (`jupas-tool`, `jupas-choices`, `jupas-finder`, `jupas-evaluator`,
   `streaming-tool`, `dse-portfolio`) must keep: `<meta name="robots" content="noindex">`, their
   strict `Content-Security-Policy`, and **zero third-party network calls** (minors' privacy — fonts
   are self-hosted, no CDNs/analytics). Escape any user-supplied text before inserting as HTML.

4. **Shared vs. separate code.** `jupas-engine.js` is **byte-identical** and shared by the evaluator
   and finder — treat it as one file. The two `*-analytics.js` copies are **separate** — diff before
   assuming a change applies to both.

5. **Database rebuilds require a private toolchain** that is not in this repo. If a task needs the
   `.enc.json` databases regenerated, hand it off to the local/Claude workflow — don't fabricate or
   hand-edit the encrypted files.

## How to verify before opening a PR
- **Syntax:** every `.js` must pass `node --check`.
- **Engine smoke test:** load `jupas-engine.js` in node and confirm `window.JUPASEngine` exposes its
  functions and a trivial call works (CI does this; you can too).
- **Serve it:** `python3 -m http.server` in the repo and open the page.
- **Gated pages need a passcode to preview** (kept private). If you can't unlock them, you cannot do
  visual QA — say so and leave UI verification to the local/Claude workflow, which has the passcode.
- The CI PR check runs the above automatically; make it green.

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
