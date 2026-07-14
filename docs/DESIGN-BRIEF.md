# "Spacedrivey" Design Brief — portable design language for the training-tracker app

Distilled from the hyperpolymath-v2 sd-restyle campaign (DESIGN-SYSTEM.md, sealed design constitution, and sealed decisions D1-D11, plus the live token source `apps/web/app/globals.css`). This document is self-contained: implement from it alone. Use the token NAMES and VALUES below verbatim in a new `globals.css`; do not invent new hex literals in components.

---

## 1. Design philosophy

The register is **Spacedrive x Raycast: "Jamie Pine UI" — crisp, fast, quiet, dimensional.** Engineered density (Spacedrive's file-explorer chrome: tight rows, hairline borders, indigo-black surfaces) fused with Raycast's gradient polish (translucent blurred panels, "lit from above" buttons, one glowing accent). Dark mode wears an indigo-tinted near-black skin built on a single hue-235 grey ladder; elevation comes from stepping up that ladder plus 1px hairlines and a faint white inset top bevel, never from heavy drop shadows. One accent hue owns the entire app: a JARVIS/HUD cyan. Everything else is monochrome ink on dark surface; functional greens/ambers/reds exist only as 6px status dots and 15%-alpha chips. Behind the chrome sits a bold-but-disciplined ambient layer: giant blurred cyan glow pills with film-grain noise, drifting slowly, with at most one glossy focal orb per page. Motion is fast (120-200ms), compositor-only, interruptible, and reduced-motion-guarded. Monospace type is used *selectively* as a signature: tiny uppercase tracked mono labels over big bold numerals. The overall feel: a precision instrument panel that glows softly in the dark.

---

## 2. Color tokens

Define these as CSS custom properties. The source app is dual-theme; for a training tracker, **dark mode is the primary identity** (the "spacedrivey" skin). If you ship a light theme, use the light values given; otherwise ship dark-only and keep the token names.

### 2a. Accent — JARVIS cyan (sealed ruling D1b: one hue owns the app, and it is cyan)

| Token | Dark value | Light value | Use |
|---|---|---|---|
| `--sd-accent` | `oklch(72% 0.13 210)` (≈ `#22d3ee` family) | `oklch(48% 0.13 210)` (dampened) | THE accent: fills, focus rings, progress, glow |
| `--sd-accent-faint` | `oklch(78% 0.16 210)` (bright) | `oklch(54% 0.14 210)` | hover/bright accent text |
| `--sd-accent-deep` | `oklch(58% 0.1 210)` | `oklch(40% 0.11 210)` | pressed/deep accent |
| `--hud-cyan-glow` | `rgb(34 211 238 / 0.18)` | same | glow shadows |
| `--hud-cyan-glow-soft` | `rgb(34 211 238 / 0.08)` | same | subtle glow |
| `--hud-cyan-rgb` | `34, 211, 238` | same | rgba() consumption |

Glow shadow presets: subtle `0 0 20px rgb(34 211 238 / 0.1)`, medium `0 0 28px / 0.16`, strong `0 0 36px / 0.24`.

### 2b. Dark surface ladder (hue-235 "sd" ladder — the core skin)

| Token | Value (dark) | Use |
|---|---|---|
| `--sd-app` | `hsl(235 15% 13%)` | app canvas / page background |
| `--sd-box` | `hsl(235 15% 18%)` | cards, panels, pills |
| `--sd-dark-box` | `hsl(235 15% 15%)` | recessed surfaces |
| `--sd-darker-box` | `hsl(235 16% 11%)` | deepest recess |
| `--sd-input` | `hsl(235 15% 20%)` | input fills, progress tracks |
| `--sd-line` | `hsl(235 15% 23%)` | THE hairline border (1px, everywhere) |
| `--sd-divider` | `hsl(235 15% 5%)` | hard dividers |
| `--sd-hover` | `hsl(235 15% 19%)` | row/tile hover |
| `--sd-selected` | `hsl(235 15% 24%)` | active-tab / selected fills |
| `--sd-selected-item` | `hsl(235 15% 18%)` | NEUTRAL selection backplate (see two-tier law) |
| `--sd-active` | `hsl(235 15% 30%)` | pressed state |
| `--sd-frame` | `hsl(235 15% 25%)` | thumbnail/media frames |
| `--sd-menu` | `hsl(235 15% 10%)` | menus/popovers |
| `--sd-menu-line` | `hsl(235 15% 14%)` | menu hairline |
| `--sd-menu-hover` | `hsl(235 15% 30%)` | menu item hover |
| `--sd-icon-shadow` | `hsl(235 15% 0%)` at opacity `0.28` | dimensional icon drop shadow |

Sidebar is the DARKEST surface in the app: `hsl(235 15% 7%)` family, rendered at ~65% opacity over canvas (translucent), with `--sd-sidebar-divider: hsl(235 15% 17%)` and nav-selection fill at `--sd-selected`/40%.

Hero/marketing field can go near-black: `#0b0d12`–`#07080a` register (blue-tinted near-black).

### 2c. Ink (text tiers) — never use raw grey hex in components

| Token | Dark | Light | Use |
|---|---|---|---|
| `--sd-ink` | `hsl(235 35% 92%)` | `hsl(235 20% 16%)` | headings, values, primary text |
| `--sd-ink-dull` | `hsl(235 10% 70%)` | `hsl(235 12% 40%)` | body copy, labels, subtitles |
| `--sd-ink-faint` | `hsl(235 10% 55%)` | `hsl(235 10% 52%)` | captions, stat labels, idle dots |

Rule: body copy is dull, headings are bright. Empty values render as `--`.

### 2d. Semantic / functional hues (dots and chips ONLY, never chrome)

| Token | Dark | Use |
|---|---|---|
| `--ink-sage` (green) | `oklch(68% 0.1 145)` | active / success / done |
| `--ink-amber` | `oklch(72% 0.12 75)` | warning / pending |
| `--ink-coral` (red) | `oklch(68% 0.15 25)` | danger / destructive / missed |
| `--ink-violet` | `oklch(68% 0.12 295)` | optional category tint |
| `--ink-blue` | `oklch(67% 0.12 255)` | optional category tint |
| accent cyan | `--sd-accent` | synced / in-progress / info |

Light-mode values: sage `oklch(62% 0.09 145)`, amber `oklch(70% 0.13 75)`, coral `oklch(63% 0.16 25)`, violet `oklch(62% 0.13 295)`, blue `oklch(60% 0.13 255)`.

Allowed forms: (1) 6px round status dot; (2) 15%-alpha tinted chip: `background: color-mix(in srgb, <hue> 15%, var(--sd-box)); border-color: color-mix(in srgb, <hue> 30%, var(--sd-line))`. NEVER as panel fills, borders, or button chrome.

### 2e. Optional light theme (if shipped)

Warm parchment, not cool grey: `--canvas: oklch(97% 0.005 75)`, `--surface: oklch(94% 0.008 75)`, `--surface-raised: oklch(99% 0.003 75)`, `--edge: oklch(86% 0.008 75)`, ink `oklch(22% 0.01 60)` / muted `oklch(50% 0.01 60)`. Map sd surfaces onto it: `--sd-app: var(--canvas)`, `--sd-box: var(--surface-raised)`, `--sd-line: var(--edge)`, hover/selected/active via `color-mix(in oklch, var(--ink) 5%/9%/13%, var(--surface))`. (D11: sd GRAMMAR everywhere; dark wears Spacedrive's skin, light wears parchment.) For a new dark-first app it is acceptable to skip light mode entirely; if you ship both, BOTH must genuinely work (D1c), verified with screenshots.

---

## 3. Typography

- **Sans (chrome / everything default):** Inter (`--font-sans: Inter, system-ui, -apple-system, sans-serif`). All UI chrome, body, headings.
- **Mono (selective signature):** JetBrains Mono (`--font-mono: "JetBrains Mono", "Fira Code", Menlo, monospace`). Used ONLY for: stat labels, micro-captions, timestamps, command affordances (kbd hints), numeric data where alignment matters.
- **Serif display (optional editorial moment):** EB Garamond, maximum ONE editorial display moment per page (a greeting, a manifesto heading). In hyperpolymath it carries the personal "Renaissance" brand; for the training tracker it is optional — if used, keep the one-per-page cap.

Scale and treatments:
- Stat label: `.sd-stat-label` = mono, 10px, uppercase, `letter-spacing: 0.08em`, color `--sd-ink-faint`.
- `text-tiny` = 10.4px for captions and pill labels.
- Dense chrome body = 12.8px (`sm`); inspector rows = `text-xs`.
- Stat numerals: `text-2xl`/`text-3xl` bold, color `--sd-ink`.
- Card titles: `font-medium` ink; subtitles one line, dull.
- CTA labels: `text-xs font-semibold uppercase tracking-[0.12em]`.
- Section headers (inspector): `text-xs font-bold`.
- Headings bright white bold; body copy `--sd-ink-dull`.

---

## 4. Spacing, radius, shadow, blur tokens

**Radii (D7, strict scale):**
- 6px: default chrome (buttons that aren't pills, rows, menus, quiet chips)
- 8px: tile backplates
- 12px: entity cards / panels (`.sd-panel`)
- 9999px (full): pills, status pills, primary buttons, progress bars
- 4px crumbs, 2px thumbnail frames
- Nothing above 12px except deliberate floating surfaces.

**Elevation recipe (the panel grammar — memorize this):**
```css
.sd-panel {
  background: var(--sd-box);
  border: 1px solid var(--sd-line);
  border-radius: 12px;
  box-shadow: rgba(255,255,255,0.15) 0 1px 0 inset; /* white top hairline bevel */
}
```
Elevation = grey-ladder step + 1px `--sd-line` border + 0.5-1px white inset top hairline (`rgba(255,255,255,.15-.3)`). Shadows stay quiet: ≤10% black shade, ever. Hairlines, not shadows.

**Blur / translucency:**
- Toolbar: `.sd-topbar-blur` = `backdrop-filter: saturate(120%) blur(18px)`; bg `color-mix(in srgb, var(--sd-app) 90%, transparent)`; 1px bottom `--sd-divider`.
- Floating pills / segmented controls: `.sd-pill-blur` = `blur(8px)`, bg `color-mix(in srgb, var(--sd-box) 60%, transparent)`, border `color-mix(in srgb, var(--sd-line) 50%, transparent)`.
- Sidebar surface: ~65% opacity over canvas.
- Overlays/dialogs: backdrop-blur 24-48px allowed.
- Raycast overlay fill (menus/command palettes, theme-agnostic dark): `linear-gradient(137deg, rgba(17,18,20,.75), rgba(12,13,15,.9))`.

**Spacing / density:** entity cards 16-20px padding; dashboard grid 3 columns desktop, ~16px gap; dense list rows are compact (Spacedrive explorer density); stat strips are open (no card chrome).

**Focus ring (canonical, everywhere):** `focus-visible:ring-2 ring-[var(--sd-accent)]` with `outline-none`. Box-shadow variant: `0 0 0 2px var(--sd-app), 0 0 0 4px var(--sd-accent), 0 0 12px var(--hud-cyan-glow)`.

---

## 5. Motion law (D4, D1d — non-negotiable)

Easings as tokens: `--ease-out-quart: cubic-bezier(0.25,1,0.5,1)`, `--ease-soft-landing: cubic-bezier(0.23,1,0.32,1)`, `--ease-collapse: cubic-bezier(0.32,0.72,0,1)`, `--ease-out-back: cubic-bezier(0.34,1.56,0.64,1)`.

- **Entrances:** `opacity 0→1, y 4→0`, 160ms easeOut, stagger `min(index,24) * 10ms`. (Hero/landing-scale only: 500ms ease-out, y 12→0, 100ms stagger.)
- **Collapses/expands:** AnimatePresence `height: auto` on `cubic-bezier(0.32,0.72,0,1)`. This is the only sanctioned height animation.
- **Micro (color/bg/border):** 120-150ms ease-out.
- **Hover soft-landing:** transform/shadow 200ms `cubic-bezier(0.23,1,0.32,1)`, opacity trailing at 400ms.
- **Button press:** transform 100ms (snappiest); bg/shadow 200ms.
- **Dialogs:** content `opacity 0→1, translateY(-2%) scale(.96)→1`; overlay plain fade.
- **Spring overshoot (~4%, out-back):** ONLY on success/confirm moments (e.g. workout logged, PR set). Never on hover.
- **Prohibited:** hover-scale on tiles/cards; transitions on first paint (guard mount flashes); tweening width/height/left/top outside AnimatePresence collapses; layout shift on entrance; orphaned hover states.
- **Mandatory:** every animation interruptible; `useReducedMotion()` / `prefers-reduced-motion` guard on everything, including ambient; 60fps compositor-only properties (transform / opacity / filter).

**Bold-ambient ruling (D5):** the ambient layer is BOLD, not whisper, on hero/dashboard surfaces: slow drift on the glow field (≥20s transform-only loops) plus ONE glossy focal orb behind the page's focal element (stat strip / hero). Whisper-level static variant behind the rest of the app shell. All ambient motion off under reduced-motion; pauses on hidden tabs; text over glow stays AA.

---

## 6. Ambient layer recipe (the spacedrive.com technique — use this, not plain radial-gradients)

1. Flat low-alpha accent divs with giant blur, `pointer-events-none absolute` (or fixed) behind content: a wide `rounded-full` pill `background: var(--sd-accent); opacity: .20; filter: blur(150px)` plus a tighter hot core `opacity: .15; blur(80px)`. (Light theme dampened: .12 / .10.)
2. De-band with SVG noise overlay: `feTurbulence type=fractalNoise baseFrequency=1.8 numOctaves=5` as a data-URI tile, `opacity: .35; mix-blend-mode: overlay`.
3. At most ONE glossy orb per page (CSS/SVG gloss; canvas only if CSS can't reach quality). Everything else stays matte.
4. Headings punch out of glow via `filter: drop-shadow(rgba(0,0,0,.95) 0 16px 50px)`.
5. Optional whisper grid texture behind the app shell: 1px cyan lines at 2.5-3.5% alpha.
6. At most one ambient rotate/border-beam effect in the entire app, if any; multi-second loops.

---

## 7. Component idioms

**Entity card** (the workhorse — use for workouts, programs, exercises, weekly summaries):
- Shell: `.sd-panel` (12px radius, `--sd-box`, hairline, top bevel), 16-20px padding.
- Header row: dimensional icon in a subtle backplate + `font-medium` ink title + one-line dull subtitle + right-aligned status pill.
- Status pill: `rounded-full`, `bg: --sd-box`, 1px `--sd-line`, 3px 8px padding, 6px colored dot + 10.4px dull label (green=active, cyan=in-progress/synced, faint-grey=idle, amber=warn).
- Progress row: dull `text-sm` label left, ink value right (e.g. "3 / 5 sessions"); track = 6px tall `rounded-full bg-[--sd-input]`; fill = accent; projected/secondary segment = 45° accent hatch (`repeating-linear-gradient(45deg, accent 35% alpha 0 4px, transparent 4px 8px)`).
- Chip row: quiet pills `rounded-md (6px) bg white/5-ish (--sd-box over --sd-app)`, 1px `--sd-line`, `text-tiny ink-dull`, small icon; overflow as a "+N more" chip.

**Stat strip** (dashboard top): per stat = dimensional icon (28-32px) + `.sd-stat-label` (mono 10px uppercase tracked faint) + bold 2xl/3xl ink numeral + one dull caption. 4-6 stats evenly spaced. NO card chrome around the strip; it sits directly on canvas, over the ambient glow.

**Buttons:**
- Primary `.sd-btn-primary`: accent cyan fill, `rounded-full`, dark cool text (`hsl(235 45% 9%)`), "lit from above": `box-shadow: accent-30% 0 4px 20px (ambient glow), rgba(255,255,255,.2) 0 2px 0 inset (top bevel), rgba(0,0,0,.1) 0 -2px 0 inset (floor)`.
- Ghost `.sd-btn-ghost`: `bg rgb(255 255 255 / .1)`, `border 1px rgb(255 255 255 / .2)`, `rounded-full`, `backdrop-blur(8px)`, white top bevel inset.
- Quiet/gray CTA: `--sd-box` fill pill. CTA labels: xs semibold uppercase tracking 0.12em.
- Press: transform 100ms down; no scale-up on hover.

**Nav / sidebar:** darkest surface in the app (`hsl(235 15% 7%)` family) at ~65% opacity over canvas, own dimmer ink ladder, nav selection = `--sd-selected` at 40% alpha fill, mask-fade-out at the scroll edges. Row radius 6px. Icons dimensional. Top bar uses `.sd-topbar-blur`.

**Tabs / segmented controls:** large pill segments; active = `bg --sd-selected`, inactive dull; optional close X revealed on hover; whole control may sit in a `.sd-pill-blur` shell.

**Tables / list rows:** hairline `--sd-line` separators (or none, spacing only), compact rows, `text-xs`/`sm`, dull labels left and ink values right; hover = `--sd-hover` fill 6px radius; selection per the two-tier law below. Numeric columns in mono.

**Inputs:** fill `--sd-input`, 1px `--sd-line` border, 6px radius, ink text, faint placeholder; focus = the cyan ring (no border-color-only focus). No inner shadows.

**Modals / popovers:** menu surface `--sd-menu` (or the Raycast 137deg dark gradient for command-palette-style overlays), 12px radius, hairline + top bevel, backdrop-blur 24-48px on the overlay scrim, dialog pop motion per §5. Menus: 6px radius items, `--sd-menu-hover` fills.

**Inspector / detail panel grammar:** section header = small icon + xs bold title; meta rows = xs dull label left (with small icon), ink value right-aligned, `--` when empty. Pills inside: `bg --sd-selected`, 11px medium dull.

**Badges / tags:** functional-hue rules only (6px dots, 15% tinted chips). Accent-tinted chip for the "info/current" state: `color: --sd-accent; bg: accent 8-15% alpha; inset 1px ring accent 24%`.

**Dimensional icons:** gradient-layered SVG bodies (cool indigo family), token-driven drop shadow (`--sd-icon-shadow` at 0.28), must read at 24px; sit in subtle rounded backplates. Accent cyan NEVER as an icon body fill. For the tracker: dumbbell, calendar, flame/streak, heart-rate, timer, trophy in this style.

**Selection — the two-tier law (D6, non-negotiable):** selected tiles/rows get the NEUTRAL backplate (`--sd-selected-item`) plus a small accent chip/tint on the LABEL only. NEVER an accent ring around a tile, never an accent-filled row. Focus (keyboard) is the cyan `focus-visible` ring.

---

## 8. Layout patterns

- **App shell:** translucent darkest sidebar (left) + `.sd-topbar-blur` toolbar + canvas `--sd-app` content area; whisper ambient glow fixed behind the shell.
- **Dashboard page:** bold ambient field + optional focal orb behind a stat strip (top), then a 3-column (desktop) entity-card grid, ~16px gap; collapse to 1 column mobile.
- **List + inspector:** dense explorer-style list/table left, `InspectorShell`-style detail panel right with MetaSection/MetaRow grammar.
- **Density:** engineered-dense in chrome (12.8px body, compact rows), generous inside entity cards (16-20px padding). Stat strips and heroes breathe; lists do not.
- **Hero/landing (if any):** near-black field, ONE deep glow anchored behind the focal element, bright bold white headline, dull body, pill CTAs.

---

## 9. Do / Don't (sealed rulings condensed)

**Do**
- One chrome dialect: everything on the `--sd-*` token register; consume tokens, never raw hex in components.
- One accent hue (JARVIS cyan) app-wide, both themes.
- Hairlines + grey-ladder + white top bevel for elevation; shadows ≤10% shade.
- Two-tier selection: neutral backplate + accent label chip.
- Cyan `focus-visible:ring-2` + `outline-none` everywhere.
- Radius scale exactly: 6 chrome / 8 tiles / 12 cards / full pills.
- 160ms y-4 stagger entrances; 120-150ms micro; soft-landing hovers; interruptible; `useReducedMotion()` guarded.
- Bold ambient on the hero/dashboard (drifting glow field + one orb), whisper elsewhere; noise-overlay de-banding; AA contrast over glow.
- Mono 10px uppercase tracked labels over bold numerals (the selective-mono signature).
- Spacedrive-native translucency: blurred toolbars, ~65% sidebar, blurred pills.
- Functional hues only as 6px dots + 15% chips.
- Verify animation quality as a shipping gate: no first-paint transitions, no layout shift, 60fps.

**Don't**
- No accent rings around selected tiles; no accent-filled rows; no accent as chrome or icon body fill.
- No hover-scale on tiles/cards.
- No new hex literals in components; no raw grey text colors.
- No heavy drop shadows; no radius above 12px (except deliberate floating surfaces).
- No frosted-white neumorphic glass (retired register); don't mix glass dialects on one surface.
- No spring/overshoot outside success moments.
- No width/height/position tweening (transform/opacity/filter only); no un-guarded ambient motion.
- No more than one editorial serif moment per page; no more than one glossy orb per page; at most one border-beam/rotate ambient effect in the whole app.

---

## 10. Hyperpolymath-specific — do NOT carry over

- **Personal branding/content:** the "Renaissance editorial soul", EB Garamond manifesto/greeting moments, parchment "academic-paper" light identity, wiki/Life OS/Jarvis/journal concepts, and any hyperpolymath copy. The training tracker gets its own content and can be dark-first.
- **EB Garamond** itself is optional; the load-bearing type signature is Inter + selective JetBrains Mono. If a serif display moment fits the tracker's brand, keep the one-per-page cap; otherwise drop the serif entirely.
- **Warm-parchment light theme** was a D11 compromise to preserve hyperpolymath's existing light identity. A new app may adopt the cool hue-235 light ladder (`hsl(235 15% 87%)` app / `82%` box / `77%` line etc., listed in §2b's light block of the source) instead, or ship dark-only.
- **Specific components** (`components/wiki/explorer`, `InspectorShell`, dimensional Folder/Page icons) are code references, not requirements; re-implement the *grammar* described in §7.
- **User-set emoji preservation rule** (wiki-specific) — irrelevant unless the tracker has user emoji.
- The old `#2599FF` blue accent appears in early constitution text; it was SUPERSEDED by cyan (D1b). Cyan is the accent.

---

## 11. Public one-page dashboard (2026 extension)

The landing page (`/`) is a one-viewport widget dashboard, sealed in
`.bgsd/runs/sesh-1784048869000/specs/design-constitution.md`. This section
records what changed from the brief above; the constitution is authoritative.

- **Typeface:** the app face is now **Space Grotesk** (`next/font/google`,
  exposed as `--font-grotesk` and leading the `--font-sans` stack). It carries
  display numerals, headings, and body. JetBrains Mono stays the selective
  small-caps signature (stat labels, masthead microcopy, km/pace chips). No
  serif.
- **Layout:** a slim masthead strip (THE COMEBACK wordmark, manifesto,
  "EST. 2026 · LOWELL, MA" + a live day counter) over a 12x6 CSS-grid bento.
  No page scroll at 1440x900 or 1280x800 (a shipping gate); below 1024px the
  grid reflows and may scroll. Widgets size with `min()`/`clamp()`; no fixed
  heights that force overflow.
- **Widgets:** countdown, today (with a Strava VERIFIED badge, onPlan-gated per
  D2), latest-run spotlight (photo scrim or a generated route pattern), a
  hand-built stylized course SVG (no map libraries), a week-volume radial
  gauge, a compressed contributions heatmap, stat tiles, and a next-milestone
  chip. Every widget expands into an accessible overlay dialog (role=dialog,
  aria-modal, focus trap, Esc + backdrop close, internal scroll) with a
  `#w=<key>` deep-link that opens on load and closes on history-back.
- **New tokens:** `--sd-glow` (radial cyan wash allowed behind numerals and
  graphics only, never under running copy), `--sd-scrim` (bottom-up AA scrim
  for photo cards), and `--strava` (brand orange, used only for the Verified
  badge dot and outbound-link hover).
- **Data:** one server pass assembles every widget through the existing query
  and derivation layer (the journey view model, the `/stats` and `/progress`
  loaders, and `getLatestVerifiedActivity`), passing public-safe projections
  only. The whole dashboard renders against the fixture fallback with
  intentional empty states when the environment is unconfigured.
