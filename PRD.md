# ♩ RIFF MARK — Product Requirements Document

**Version:** 1.0 — Initial Draft  
**Status:** In Review  
**Date:** March 2026  
**Platform:** Chrome Extension (Manifest V3, WXT Framework)  
**Package Manager:** Bun

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Goals & Success Metrics](#3-goals--success-metrics)
4. [Target Users](#4-target-users)
5. [Feature Specifications](#5-feature-specifications)
6. [UI / UX Design Language](#6-ui--ux-design-language)
7. [Technical Architecture](#7-technical-architecture)
8. [User Flows](#8-user-flows)
9. [Release Plan](#9-release-plan)
10. [Risks & Mitigations](#10-risks--mitigations)
11. [Open Questions](#11-open-questions)

---

## 1. Executive Summary

Riff Mark is a Chrome browser extension that enhances the YouTube experience for guitar learners. It allows users to drop named timestamp anchors — called **Marks** — directly onto any YouTube tutorial video, then loop between those anchors with a single click. This eliminates the frustrating cycle of manual scrubbing and rewinding that constantly interrupts practice flow.

The product is designed for beginner-to-intermediate guitarists who rely on YouTube as their primary learning resource. The interface is inspired by professional DAW (Digital Audio Workstation) aesthetics — dark, precise, and musician-native — making it feel like a natural extension of the practice toolkit rather than a generic browser plugin.

| Field | Detail |
|---|---|
| **Product Name** | Riff Mark |
| **Type** | Chrome Browser Extension |
| **Target Platform** | YouTube (`youtube.com`) |
| **Core Value Prop** | Drop timestamp anchors. Loop sections. Practice without friction. |
| **v1 Scope** | Section bookmarking + loop mode only |
| **Data Storage** | `browser.storage.local` via WXT (no account required) |
| **Framework** | WXT (Web Extension Toolkit) + TypeScript |
| **Package Manager** | Bun |

---

## 2. Problem Statement

### 2.1 The Learning Context

YouTube is the dominant platform for self-taught guitar learning. Tutorials range from chord breakdowns to full song walkthroughs, and most learners return to the same video dozens of times across multiple practice sessions. However, YouTube's native playback controls were designed for passive viewing, not active skill acquisition.

### 2.2 Core Pain Points

- Learners must manually scrub the timeline to relocate sections — a process requiring precise mouse control while their hands may be on the instrument.
- There is no native way to label or remember where specific song sections (verse, chorus, solo) begin within a video.
- Looping a specific segment requires manually clicking back and forth, breaking concentration and flow.
- Progress is lost between sessions — the learner must re-find all their reference points every time they return.
- The cognitive overhead of navigating the video directly competes with the cognitive load of learning the instrument.

### 2.3 The Insight

The root problem is not that YouTube lacks features — it's that its interaction model is designed for consumers, not practitioners. A guitarist drilling a 12-bar solo does not need recommendations or a comment section. They need a looper pedal equivalent built into their video player.

---

## 3. Goals & Success Metrics

### 3.1 Product Goals

- Reduce time spent scrubbing to near-zero during active practice sessions.
- Make section navigation a single-click action.
- Persist a user's work across sessions without requiring an account or login.
- Deliver a UI that feels native to musician workflows — not a generic browser plugin.

### 3.2 Non-Goals for v1

The following are explicitly out of scope for the initial release:

- Speed / pitch controls (YouTube's native controls are sufficient for v1)
- Sharing or exporting section sets to other users
- Support for video platforms other than YouTube
- Mobile browser support
- Chord or tab annotations attached to Marks
- AI-generated section detection

### 3.3 Success Metrics

| Metric | Target | How Measured |
|---|---|---|
| Marks dropped per session | 3+ per video on average | Anonymous extension analytics |
| Loop feature adoption | 80% of users activate a loop within their first session | Click event tracking |
| Return rate | 60% of users reopen a previously marked video | `storage.local` access patterns |
| Early churn | < 20% uninstall within first 7 days | Chrome Web Store dashboard |

---

## 4. Target Users

### 4.1 Primary Persona — The Dedicated Learner

| Field | Detail |
|---|---|
| **Name** | Marcus, 28 |
| **Experience** | 6 months of self-taught guitar |
| **Learning style** | Learns full songs from YouTube tutorials |
| **Practice frequency** | 3–5 sessions per week, 30–60 min each |
| **Device** | MacBook or Windows laptop |
| **Pain point** | *"I keep losing my place and have to rewind the same 30 seconds over and over."* |

### 4.2 Secondary Persona — The Returning Revisitor

| Field | Detail |
|---|---|
| **Name** | Priya, 34 |
| **Experience** | 2 years, intermediate level |
| **Learning style** | Returns to the same videos months later to refine technique |
| **Pain point** | *"I remember there was a great breakdown of that chord transition but I can never find it again."* |
| **Value from Riff Mark** | Persistent marks mean she never loses her annotations between sessions. |

---

## 5. Feature Specifications

### 5.1 DROP MARK — Timestamp Anchor Creation

**Description**  
The primary action of the extension. A single prominent button captures the current video playback position and creates a named anchor (a **Mark**) at that timestamp.

**Behaviour**
- The **DROP MARK** button is always visible in the Riff Mark panel below the YouTube player.
- On click: captures `video.currentTime` → creates a new Mark with a default name (`"Mark 1"`, `"Mark 2"`, etc.) → displays it immediately in the anchor chip row.
- A subtle pulse animation confirms the mark was successfully created.
- Marks are persisted via WXT's `storage` utility (`browser.storage.local`) keyed by the video's YouTube ID.
- Maximum of **20 marks** per video in v1.

**Edge Cases**
- If the video has not yet started playing, DROP MARK captures timestamp `0:00` without error.
- If 20 marks already exist, the button becomes visually disabled and shows a tooltip: *"Mark limit reached — ERASE a mark to add more."*

---

### 5.2 MARK ANCHORS — Progress Bar Visualization

**Description**  
Each saved Mark is rendered as a visual triangle anchor (`▲`) below the YouTube progress bar, at the proportional position corresponding to its timestamp. This gives an at-a-glance structural map of the song.

**Behaviour**
- Triangle markers appear below the YouTube scrubber, styled in amber.
- The actively looping mark's triangle glows at full brightness; all others are rendered at reduced opacity.
- A thin amber highlight band spans the scrubber between the active Mark and the next Mark, indicating the current loop region.
- Hovering a triangle shows a tooltip with the mark name and formatted timestamp (e.g., `"Chorus · 1:32"`).
- Markers reposition proportionally if the YouTube player is resized (responsive to player width).

---

### 5.3 SECTION PANEL — Mark Management Interface

**Description**  
A panel rendered directly below the YouTube video player (injected into the YouTube page DOM by the WXT content script) displaying all Marks for the current video as a horizontal scrollable row of chips.

**Panel Layout**

```
┌─────────────────────────────────────────────────────────────────┐
│  ♩ RIFF MARK  ·  Hotel California              [ ✦ DROP MARK ]  │
├─────────────────────────────────────────────────────────────────┤
│  [ Intro 0:00 ]  [ Verse 0:48 ]  [ Chorus 🔁 1:32 ]  [ Solo 3:05 ] │
│                                                                 │
│  🔁 LOOPING: Chorus  (1:32 → 3:05)                 [ RELEASE ]  │
└─────────────────────────────────────────────────────────────────┘
```

**Mark Chips**
- Each chip displays the Mark name and its formatted timestamp.
- **Single click** → seek video to that Mark's timestamp and begin looping that section.
- **Double click on the name** → inline text input replaces the name label (INSCRIBE mode).
- Press `Enter` or click outside to confirm the rename.
- **Hover** → a small `✕` (ERASE) button appears in the top-right corner of the chip.

**Empty State**
- When no marks exist for the current video, the panel shows: *"Drop your first mark to begin."*

---

### 5.4 LOOP ENGINE — Auto-Loop Between Marks

**Description**  
When a Mark is activated, the video plays from that Mark's timestamp until the next Mark's timestamp, then automatically returns to the loop start. This continues until the user clicks **RELEASE**.

**Behaviour**
- Loop region = from the selected Mark's `time` to the **next Mark's** `time`.
- If the selected Mark is the **last mark** in the list, the loop region extends **30 seconds** beyond it.
- The content script monitors `video.currentTime` using WXT's `ctx.setInterval` (100ms polling) and seeks back to loop start when the end of the region is reached.
- Loop state survives video pause/resume — re-entering play re-activates the loop.
- **RELEASE** stops the loop; the video continues playing normally from the current position.

**Loop Status Indicator**
- Displayed in a status bar at the bottom of the Riff Mark panel while a loop is active.
- Format: `🔁 LOOPING: [Mark Name]  ([start] → [end])`
- This row slides in with a 200ms ease transition when a loop is activated and slides out on RELEASE.

---

### 5.5 INSCRIBE — Mark Renaming

**Description**  
Users rename marks with musician-meaningful labels such as `"Intro Riff"`, `"Chorus"`, `"Bridge Transition"`, or `"Outro Solo"`.

**Behaviour**
- Double-click on any Mark chip's name label → the label transitions to an editable `<input>` in place.
- The input is pre-selected with the current name for instant replacement.
- `Enter` or clicking outside confirms the new name and writes it to storage.
- `Escape` cancels and restores the previous name.
- Maximum name length: **24 characters**.

---

### 5.6 ERASE — Mark Deletion

**Description**  
Users can remove individual Marks they no longer need.

**Behaviour**
- Hover over a Mark chip → a small `✕` button appears in the top-right corner.
- Click `✕` → the Mark is immediately removed from the chip row, the scrubber visualization, and `storage.local`.
- No confirmation dialog in v1 (Marks are trivial to recreate).
- If the erased Mark was actively looping, the loop is immediately stopped and the RELEASE state is cleared.

---

### 5.7 PERSISTENCE — Session Memory

**Description**  
All Marks are saved automatically and reloaded whenever the user returns to the same YouTube video — across browser restarts and sessions.

**Behaviour**
- Data is stored using WXT's `storage` module (`browser.storage.local`), keyed by the YouTube video ID parsed from the URL.
- On every page load matching `*://*.youtube.com/watch*`, the content script reads existing Marks for the current video ID and renders them immediately.
- No account, no login, no server. Fully private and works offline.
- Data persists until the user uninstalls the extension or manually clears browser extension data.

---

## 6. UI / UX Design Language

### 6.1 Visual Identity

Riff Mark's aesthetic is rooted in professional music production tooling — specifically DAWs like Ableton Live and Logic Pro. The interface should feel like it belongs in a musician's toolkit, not a generic browser addon.

| Attribute | Direction |
|---|---|
| **Design Archetype** | DAW / Music Production Tool |
| **Tone** | Precise, dark, focused — minimal visual noise |
| **Typography** | Monospace for timestamps; clean sans-serif for labels |
| **Motion** | Subtle only — pulse on mark drop, glow on active loop, 200ms panel transitions |

### 6.2 Color Palette

| Role | Hex | Usage |
|---|---|---|
| Background | `#1A1A1A` | Panel base, deepest background |
| Surface | `#2D2D2D` | Mark chips, inner panels |
| Border | `#374151` | All dividers and outlines |
| Amber — Primary | `#F59E0B` | Headings, active marks, CTAs |
| Amber — Hover | `#D97706` | Hover states, border on active elements |
| Text — Primary | `#F9FAFB` | Body copy, mark names |
| Text — Muted | `#9CA3AF` | Timestamps, secondary labels |
| Loop Highlight | `#F59E0B` at 20% opacity | Scrubber loop region overlay |

### 6.3 Vocabulary — 作曲的動作

All user-facing labels use music production language. Generic UI terms are replaced with words a musician would recognize from their DAW or live performance context.

| Action | Label Used | What Was Avoided |
|---|---|---|
| Create a timestamp mark | **DROP MARK** | Add / Save / Bookmark |
| The timestamp marker | **MARK** | Bookmark / Tag / Anchor |
| Rename a mark | **INSCRIBE** | Rename / Edit / Label |
| Currently looping | **LOOPING** | Playing / Repeating |
| Stop the loop | **RELEASE** | Stop / Cancel / Exit |
| Delete a mark | **ERASE** | Delete / Remove / Clear |
| Panel header | **RIFF MARK** | Guitar Helper / YT Marker |
| Empty state prompt | *Drop your first mark to begin.* | No items yet |

### 6.4 Layout Specifications

- Panel height: `88px` collapsed / `112px` with loop status bar visible.
- Panel is injected below the YouTube player `#movie_player` container, above the video title.
- Panel background: `#1A1A1A` with a `1px` top border in amber at 40% opacity.
- Mark chips: pill-shaped, `32px` height, monospace timestamp, `8px` horizontal padding, `4px` gap between chips.
- **DROP MARK** button: right-aligned in the panel header row, amber background, dark text, `✦` icon prefix.
- The loop status row only appears when a loop is active — it slides in with a `200ms ease` transition.
- The panel uses a Shadow DOM (via WXT's `createShadowRootUi`) to prevent YouTube's CSS from bleeding into Riff Mark's styles.

---

## 7. Technical Architecture

### 7.1 Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| Extension Framework | **WXT** (Web Extension Toolkit) | Best-in-class DX for MV3; Nuxt-like file-based entrypoints; built-in HMR; auto-imports; bun support |
| Language | **TypeScript** | Type safety, auto-complete for `browser.*` APIs; WXT includes types out of the box |
| UI | **Vanilla TS + CSS** | No framework needed for a simple panel; keeps bundle lean and load time fast |
| Storage | **WXT `storage` module** (`browser.storage.local`) | Idiomatic WXT API; keyed by video ID; no backend required |
| Package Manager | **Bun** | Fastest installs; compatible with WXT via `bunx wxt@latest init` |
| Build output | **Manifest V3** | Required for all new Chrome extensions |

### 7.2 Project Setup

```bash
# Scaffold project with bun
bunx wxt@latest init riff-mark
cd riff-mark
bun install

# Dev mode (opens Chrome with extension auto-loaded + HMR)
bun run dev

# Production build
bun run build

# Package for Chrome Web Store submission
bun run zip
```

### 7.3 Project Structure

```
riff-mark/
├── entrypoints/
│   ├── background.ts              # Service worker (minimal — storage events)
│   └── youtube.content/
│       ├── index.ts               # Content script entrypoint (defineContentScript)
│       ├── panel.ts               # Panel mount + lifecycle logic
│       ├── loop-engine.ts         # Loop polling via ctx.setInterval
│       ├── scrubber-overlay.ts    # Anchor triangle rendering on progress bar
│       └── style.css              # DAW-inspired panel styles
├── utils/
│   ├── storage.ts                 # Read/write marks via WXT storage module
│   ├── youtube.ts                 # Video ID parsing, player DOM queries
│   └── time.ts                    # Timestamp formatting helpers
├── public/
│   └── icons/
│       ├── 16.png
│       ├── 48.png
│       └── 128.png
├── wxt.config.ts                  # WXT config — permissions, manifest options
├── tsconfig.json
├── package.json
└── bun.lockb
```

### 7.4 Key WXT Configuration

```typescript
// wxt.config.ts
import { defineConfig } from 'wxt';

export default defineConfig({
  manifest: {
    name: 'Riff Mark',
    description: 'Drop timestamp marks and loop sections on YouTube guitar tutorials.',
    permissions: ['storage'],
    host_permissions: ['*://*.youtube.com/*'],
  },
  browser: 'chrome',
});
```

### 7.5 Content Script Entrypoint

```typescript
// entrypoints/youtube.content/index.ts
export default defineContentScript({
  matches: ['*://*.youtube.com/watch*'],
  cssInjectionMode: 'ui',
  async main(ctx) {
    // Mount panel using WXT's Shadow DOM UI utility
    const ui = await createShadowRootUi(ctx, {
      name: 'riff-mark-panel',
      position: 'inline',
      anchor: '#movie_player',
      onMount(container) {
        mountPanel(container, ctx);
      },
    });
    ui.mount();

    // Re-mount on YouTube SPA navigation
    ctx.addEventListener(window, 'yt-navigate-finish', () => {
      ui.remove();
      ui.mount();
    });
  },
});
```

### 7.6 Data Schema

```typescript
// utils/storage.ts
import { storage } from 'wxt/storage';

interface Mark {
  id: string;        // e.g. "mark_1711234567890"
  name: string;      // user-defined label, max 24 chars
  time: number;      // seconds (float), e.g. 92.4
  createdAt: number; // Unix ms timestamp
}

interface VideoMarks {
  marks: Mark[];
}

// Storage key pattern: "local:marks:{videoId}"
// e.g. "local:marks:dQw4w9WgXcQ"
const getKey = (videoId: string) => `local:marks:${videoId}` as const;

export async function getMarks(videoId: string): Promise<Mark[]> {
  const data = await storage.getItem<VideoMarks>(getKey(videoId));
  return data?.marks ?? [];
}

export async function saveMarks(videoId: string, marks: Mark[]): Promise<void> {
  await storage.setItem(getKey(videoId), { marks });
}
```

### 7.7 Loop Engine

```typescript
// entrypoints/youtube.content/loop-engine.ts
export function startLoop(
  ctx: ContentScriptContext,
  video: HTMLVideoElement,
  startTime: number,
  endTime: number,
  onTick: () => void
) {
  video.currentTime = startTime;
  video.play();

  // Use WXT ctx.setInterval so the loop stops automatically
  // if the content script context is invalidated
  ctx.setInterval(() => {
    if (video.currentTime >= endTime) {
      video.currentTime = startTime;
    }
    onTick();
  }, 100);
}
```

---

## 8. User Flows

### 8.1 First-Time Use — Marking a Song

| # | User Action | System Response |
|---|---|---|
| 1 | Opens a guitar tutorial on YouTube | Riff Mark panel appears below the player with empty state: *"Drop your first mark to begin."* |
| 2 | Plays the video, reaches the Intro section | Video plays through YouTube's native controls. |
| 3 | Clicks **DROP MARK** | Mark created at current time. Chip `"Mark 1"` appears. Triangle marker appears on scrubber. Pulse animation fires. |
| 4 | Continues playing, reaches Chorus, clicks **DROP MARK** | Second chip `"Mark 2"` created. Loop region between Mark 1 and Mark 2 is now implicitly defined. |
| 5 | Double-clicks `"Mark 1"` chip name | Name label becomes an editable input, pre-selected. |
| 6 | Types `"Intro"` and presses Enter | Chip now shows `"Intro"`. Name saved to storage. |
| 7 | Repeats for all song sections | All chips labelled. Scrubber shows the full structural map of the song. |

### 8.2 Practice Session — Drilling a Section

1. User opens a previously marked video → all Marks load automatically from storage.
2. User clicks the `"Chorus"` chip → video seeks to `1:32` and begins looping between `1:32` and `3:05`.
3. Loop status bar slides in: `🔁 LOOPING: Chorus  (1:32 → 3:05)` with a **RELEASE** button.
4. User plays guitar along with the chorus — the video loops automatically, no mouse interaction required.
5. When ready to move on, clicks **RELEASE** → loop ends, video continues normally from current position.
6. User clicks `"Solo"` chip → immediately begins looping the solo section.

### 8.3 Erasing a Mark

1. User hovers over a chip they no longer want.
2. A small `✕` button appears on the chip.
3. User clicks `✕` → Mark disappears from the chip row, the scrubber triangle is removed, and storage is updated.
4. If that Mark was actively looping, the loop stops immediately.

---

## 9. Release Plan

### v1.0 — Core Loop *(Ship First)*

The MVP. Every item here must be complete before shipping.

- [ ] **DROP MARK** button with pulse animation
- [ ] Mark chip panel below YouTube player (Shadow DOM via WXT)
- [ ] Scrubber anchor triangle visualization
- [ ] Loop engine (auto-loop between consecutive Marks via WXT `ctx.setInterval`)
- [ ] **INSCRIBE** — inline double-click renaming
- [ ] **ERASE** — hover `✕` deletion
- [ ] `browser.storage.local` persistence via WXT storage module
- [ ] YouTube SPA navigation support (re-mount on `yt-navigate-finish`)
- [ ] Empty state messaging
- [ ] Loop status bar with RELEASE button

### v1.1 — Polish & Ergonomics

- [ ] Keyboard shortcut: `M` key to DROP MARK without clicking (for hands-on-guitar use)
- [ ] Loop speed toggle: `0.75x` speed within the active loop region
- [ ] Mark chip reordering via drag-and-drop
- [ ] Onboarding tooltip for first-time users

### v2.0 — Power Features *(Post-Validation)*

- [ ] Export/import Mark sets as JSON (share sections with other learners)
- [ ] Sync marks across devices via `browser.storage.sync`
- [ ] Community Mark sets — import pre-made section maps for popular songs
- [ ] Notes field: attach a text note to any Mark (e.g., *"watch left hand position here"*)
- [ ] Last Mark loop duration: user-configurable (default 30s)

---

## 10. Risks & Mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| YouTube DOM changes break panel injection | **Medium** — YouTube updates its player markup regularly | Target stable, semantic selectors; add a WXT integration test against the live YouTube player; monitor for breakage via a CI job |
| YouTube SPA routing causes panel to disappear between navigations | **High** — common issue with YouTube extensions | Listen for `yt-navigate-finish` event inside WXT content script context; re-mount the Shadow DOM UI on each navigation event |
| Loop polling at 100ms causes janky playback on low-end hardware | **Low** | Benchmark on low-spec devices; fall back to `ctx.requestAnimationFrame` if `setInterval` causes frame drops |
| `browser.storage.local` 5MB quota exceeded | **Very Low for v1** | Each Mark is ~150 bytes; 5MB supports ~33,000 marks across all videos — not a concern for v1 |
| WXT content script context invalidated on extension update mid-session | **Low** | WXT's `ctx` helpers (`ctx.setInterval`, `ctx.addEventListener`) automatically stop when context is invalidated, preventing orphaned loops |
| User confusion about where the loop end-point is | **Medium** | Clear amber highlight on the scrubber between the active Mark and the next; tooltip on the loop status bar showing exact timestamps |

---

## 11. Open Questions

1. **Collapsible panel:** Should the Riff Mark panel be collapsible to a minimal `16px` strip for users who want maximum screen real estate? Or is the 88px panel always-visible acceptable?

2. **Last mark loop duration:** The current proposal is 30 seconds of loop time after the last Mark. Is this the right default? Should it extend to the end of the video instead?

3. **DROP MARK on beat:** Should DROP MARK briefly pause the video when clicked so the user can mark the exact beat — or should it remain non-disruptive and capture time without pausing?

4. **Progress bar ownership:** YouTube occasionally restructures its player DOM. Should the scrubber anchor triangles be drawn on a Riff Mark-owned overlay element (more resilient) rather than attempting to modify YouTube's own scrubber container?

5. **First-run onboarding:** Should the extension show a one-time tooltip overlay explaining the three actions (DROP, click to LOOP, RELEASE) — or is the UI self-evident enough to skip this?

6. **Mark chip overflow:** When a video has many marks, the chip row will overflow. Should it scroll horizontally, wrap to a second row, or compress chip widths?

---

*♩ End of Document — Riff Mark PRD v1.0*