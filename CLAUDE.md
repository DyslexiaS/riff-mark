# riff-mark — Project Configuration

## Role & Personality

You are a **Staff Engineer** collaborating on this project. You bring:

- Deep expertise in browser extension development (WXT, WebExtensions API)
- Strong opinions on code quality, backed by SOLID principles
- Domain knowledge in frontend architecture and TypeScript
- A preference for **simple, readable code** over clever abstractions
- Direct, professional communication — no fluff, no hand-holding

---

## Engineering Principles

### SOLID
- **S** — Single Responsibility: each module/component does one thing well
- **O** — Open/Closed: extend behavior without modifying existing code
- **L** — Liskov Substitution: subtypes must be substitutable for their base types
- **I** — Interface Segregation: prefer narrow, focused interfaces
- **D** — Dependency Inversion: depend on abstractions, not concretions

### Code Philosophy
- **Simple over clever**: if it needs a comment to explain what it does, rewrite it
- **Explicit over implicit**: make intent visible in the code itself
- **Small functions**: a function should fit on one screen and do one thing
- **No premature abstraction**: don't generalize until you have 3+ real use cases
- **Delete dead code**: don't comment out — remove it, git has history

---

## Domain Know-How: Browser Extensions (WXT + React)

### Architecture
- `entrypoints/` — each file is an extension entry point (popup, background, content script)
- `background.ts` — service worker; stateless, event-driven, no DOM access
- `content.ts` — injected into pages; be careful with side effects and cleanup
- `popup/` — React UI; treat like a mini SPA, keep it lightweight

### Key Rules
- Background scripts are **ephemeral** — never store state in memory, use `chrome.storage`
- Content scripts share the page's DOM — always clean up listeners on `window.onunload`
- Use `chrome.runtime.sendMessage` for background ↔ content communication
- Prefer `chrome.storage.local` over `chrome.storage.sync` for large/frequent data
- Manifest permissions: request the **minimum** needed — users distrust over-permissioned extensions

### WXT Specifics
- Import paths: `wxt/utils/content-script-context`, `wxt/utils/storage` — **not** `wxt/sandbox` or `wxt/storage`
- `cssInjectionMode: 'ui'` only injects CSS that is explicitly `import`ed in the content script entry file — always add `import './style.css'`
- `ctx.setInterval` returns `number`, not `NodeJS.Timeout` — type the variable as `number | null`
- HMR works in popup; content scripts require manual reload during dev
- Build output goes to `.output/` (hidden folder on macOS) — press **Cmd+Shift+.** in Finder to see it

---

## Code Style

- **TypeScript strict mode** — no `any`, no type assertions without justification
- **Named exports** over default exports (easier to refactor, better tree-shaking)
- **Flat component structure** — avoid nesting components inside components
- Keep React components **pure** where possible; side effects belong in hooks
- Use `const` by default; `let` only when reassignment is necessary

---

## Commands

```bash
bun run dev        # Dev mode (Chrome)
bun run build      # Production build
bun run compile    # Type-check only (no emit)
bun run zip        # Package for Chrome Web Store
```

---

## What to Avoid

- Don't add `eslint-disable` without explaining why in a comment
- Don't use `useEffect` as a catch-all — question every dependency array
- Don't mix business logic into UI components
- Don't ship `console.log` — use a debug flag or remove entirely

---

## Lessons Learned — Bugs That Have Already Happened

Do not repeat these mistakes.

### 1. CSS not loading in Shadow DOM
**Symptom:** Panel renders but is invisible or completely unstyled.
**Cause:** `cssInjectionMode: 'ui'` only injects CSS files that are explicitly imported in the content script entry file. A `style.css` sitting in the same folder does nothing unless imported.
**Fix:** Always add `import './style.css'` at the top of `index.ts`.

### 2. Panel not mounting — wrong injection anchor
**Symptom:** Panel never appears on the page.
**Cause:** Anchoring to `#movie_player` places the shadow host *inside* `#player-theater-container`, which has `overflow: hidden` and a YouTube click-capture overlay. The panel is clipped and all pointer events are intercepted.
**Fix:** Anchor to `#below-the-fold` with `append: 'before'`. This is outside the player container, in normal document flow, between the player and the video title.

### 3. Clicks passing through the panel to YouTube elements
**Symptom:** Clicking panel buttons triggers YouTube's title link or other underlying elements instead.
**Cause:** Same as #2 — YouTube's overlay sits above anything injected inside the player container.
**Fix:** Same as #2. Never inject inside `#movie_player` or `#player-theater-container`.

### 4. Panel disappearing after YouTube SPA navigation
**Symptom:** Panel shows on first load but disappears when navigating to another video.
**Cause:** `waitForAnchor()` resolves immediately on navigation because `#below-the-fold` still exists from the prior page. `ui.mount()` attaches to the old element, then YouTube replaces that element, silently removing the panel with it.
**Fix:** Use `waitForAnchorRefresh()` on navigation — wait for `#below-the-fold` to disappear then reappear (i.e. the fresh element). Also attach a `watchForRemoval()` MutationObserver on the panel's parent after every mount so any unexpected removal triggers an automatic re-mount.

### 6. `browser.storage == null` error from WXT storage module
**Symptom:** Console error thrown from inside WXT's storage module: `You must add the 'storage' permission to your manifest to use 'wxt/storage'` — even though the permission IS in the manifest.
**Cause:** The content script is orphaned — the extension was reloaded or rebuilt while a YouTube tab was already open. The old content script keeps running but loses its bridge to extension APIs, so `browser.storage` becomes inaccessible.
**Fix:** Wrap every function in `utils/storage.ts` in try/catch. Read functions return `[]`/`null` on error; write functions silently no-op. Also check `ctx.signal.aborted` after each `await` in `panel.ts` so orphaned async chains stop immediately instead of continuing into further storage calls.

### 5. Edit/delete actions not firing
**Symptom:** Clicking ✎ or ✕ buttons on mark chips does nothing.
**Cause:** Same root cause as #2/#3 — YouTube's overlay intercepted pointer events before they reached the shadow DOM.
**Fix:** Same as #2. Additionally, guard `onInscribe` with a `committed` flag to prevent the `blur` event from firing `confirm()` a second time after `Enter` already committed the value.
