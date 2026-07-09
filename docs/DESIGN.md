---
name: Obsidian Flux
colors:
  # Surface scale (dark, monochromatic — depth via color steps + 1px borders)
  background: '#0A0A0D'
  surface-lowest: '#101014'
  surface-low: '#15151A'
  surface: '#1C1C22'
  surface-high: '#222229'
  surface-highest: '#2B2B33'
  surface-bright: '#35353E'
  # Text
  on-surface: '#ECEDF1'
  on-surface-variant: '#8888A0'
  muted: '#4A4A55'
  placeholder: '#3A3A45'
  # Borders
  outline-subtle: '#1A1A22'
  outline: '#2E2E3A'
  outline-strong: '#3E3E4C'
  # Interactive (primary = white)
  primary: '#ECEDF1'
  on-primary: '#0A0A0D'
  primary-hover: '#D0D1D5'
  primary-active: '#B8B9BC'
  # Support — semantic (oklch; same L/C, hue varies)
  success: 'oklch(68% 0.13 145)'
  success-container: 'oklch(14% 0.04 145)'
  warning: 'oklch(68% 0.13 85)'
  warning-container: 'oklch(14% 0.04 85)'
  error: 'oklch(68% 0.13 25)'
  error-container: 'oklch(14% 0.04 25)'
  info: 'oklch(68% 0.13 240)'
  info-container: 'oklch(14% 0.04 240)'
typography:
  display-lg:
    fontFamily: Space Grotesk
    fontSize: 64px
    fontWeight: '700'
    lineHeight: '1.0'
    letterSpacing: -0.04em
  display-lg-mobile:
    fontFamily: Space Grotesk
    fontSize: 40px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.1'
    letterSpacing: -0.03em
  headline-md:
    fontFamily: Space Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1'
    letterSpacing: 0.08em
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 10px
    fontWeight: '500'
    lineHeight: '1'
    letterSpacing: 0.08em
rounded:
  sm: 0.125rem    # 2px  — micro elements
  DEFAULT: 0.5rem # 8px  — buttons, inputs
  md: 0.625rem    # 10px — medium containers
  xl: 1rem        # 16px — cards, panels
  full: 9999px    # badges, pills, chips
spacing:
  base: 8px
  sp-1: 8px
  sp-2: 16px
  sp-3: 24px
  sp-4: 32px
  sp-6: 48px
  sp-8: 64px
  sp-12: 96px
  container-max: 1440px
  container-content: 1120px
  container-prose: 640px
  container-form: 400px
  gutter: 24px
  margin-desktop: 64px
  margin-tablet: 32px
  margin-mobile: 20px
motion:
  instant: 50ms
  fast: 150ms
  normal: 250ms
  slow: 400ms
  slower: 600ms
  ease-out: cubic-bezier(0,0,.2,1)
  ease-in: cubic-bezier(.4,0,1,1)
  ease-in-out: cubic-bezier(.4,0,.2,1)
  spring: cubic-bezier(.34,1.56,.64,1)
---

## Brand & Style

Obsidian Flux is a **dark, monochromatic, minimalist** design system for a high-end technical audience that values clarity, precision, and restraint. The personality is sophisticated, quiet, and structural.

The style is built on **negative space, 1px structural borders, and typographic contrast** — no glassmorphism, no gradients, no neon glow. Depth comes from stepped surface colors and crisp borders, never from blur or shadow. The emotional response is calm focus: a near-black canvas where white type and hairline outlines do all the work. The single "accent" is white (`#ECEDF1`) on near-black (`#0A0A0D`); color is reserved exclusively for semantic states.

## Colors

The palette is anchored in a cool near-black foundation with a seven-step surface scale (`#0A0A0D` → `#35353E`). Each step is distinct enough to read as a layer without any shadow.

- **Primary (White, `#ECEDF1`):** Solid white is the primary action color — used for primary button fills, selected states, and focus rings. There is no chromatic brand accent.
- **Text:** Three levels — `on-surface` (primary, 17.2:1), `on-surface-variant` (secondary, 5.2:1), and `muted` (disabled/decorative only, 2.4:1).
- **Borders:** Three weights — `outline-subtle` / `outline-variant` (`#1A1A22`) for dividers and Level 1 chrome, `outline` (`#2E2E3A`) for default component borders, `outline-strong` (`#3E3E4C`) for emphasis and hover. **Tailwind:** `border-outline-variant`, `border-outline-subtle` (alias), `border-outline`, `border-outline-strong`. Do **not** use `border-on-surface` (white) for structural panels — reserve white borders for focus rings and deliberately selected cards only.
- **Support (Semantic):** Success (green), Warning (amber), Error (red), Info (blue). All four share the same lightness and chroma in `oklch()` — only the hue rotates — so they read as one harmonious family. Each has a paired low-lightness container for backgrounds.

Backgrounds are always flat and solid. No mesh gradients, no moving light, no opacity tricks.

## Typography

A high-contrast three-family pairing. **Space Grotesk** brings a technical, geometric edge to headings with tight negative letter-spacing. **Inter** provides maximum legibility for body text. **JetBrains Mono** is used for small labels, tags, metadata, and data points to emphasize the systematic, developer-grade nature of the interface.

Headings use tight letter-spacing (−0.02em to −0.04em) for a dense, modern look. Body text stays at 0 tracking with generous line-height (1.5–1.6).

## Layout & Spacing

The layout uses a responsive grid on an 8px rhythmic scale.

- **Desktop (≥1440px):** 12-column grid, 24px gutters, 64px outer margins.
- **Tablet (768–1439px):** 8-column grid, 20px gutters, 32px margins.
- **Mobile (<768px):** 4-column grid, 16px gutters, 20px margins.

Container widths: `container-max` 1440px, `container-content` 1120px (main content), `container-prose` 640px, `container-form` 400px.

Spacing prioritizes negative space and breathing room. Components have ample internal padding, but the system stays dense and information-rich — never decorative.

## Elevation & Depth

Depth is created **exclusively** through stepped surface colors and 1px borders. No `backdrop-filter`, no box-shadows, no glows, no gradients.

1. **Level 0 (Background):** `#0A0A0D`, flat.
2. **Level 1 (Base surface):** `#15151A` fill, `1px solid #1A1A22` border, `rounded-xl`. Lowest lift.
3. **Level 2 (Default card):** `#1C1C22` fill, `1px solid #2E2E3A` border, `rounded-xl`. Standard container.
4. **Level 3 (Raised / Modals):** `#222229` fill, `1px solid #3E3E4C` border, `rounded-xl`. Strongest surface.

Each level steps both background and border one notch brighter. Hover states bump the border one step further.

## Shapes

Rounded geometry softens the technical type without going soft.

- **Cards & Panels:** `rounded-xl` (16px).
- **Buttons & Inputs:** `rounded` (8px), or `rounded` 6px at small size.
- **Badges, Chips, Pills:** `rounded-full`, or `rounded-sm`/6px for a squared variant.
- **Micro elements:** `rounded-sm` (2px).

## Components

- **Buttons:** Primary is a solid white fill (`#ECEDF1`) with near-black text; hover darkens to `#D0D1D5`, active to `#B8B9BC` with `scale(0.98)`. Secondary is transparent with a 1px `outline` border that lights to white on hover. Ghost is lower-contrast with a subtle border. All transition at 150ms.
- **Inputs:** Recessed `#15151A` fields with a full 1px `outline` border that lights to white on focus (plus a soft 15%-white outline ring). Error uses a desaturated red border (`#5C3535`). Disabled drops to `surface-lowest`.
- **Form controls:** Toggle (44×24 track, animated thumb), Checkbox (18px, white fill + black check SVG when on), Radio (18px, white dot when selected). All use white as the "on" color and 44×44px hit areas.
- **Dropdown / Select:** Trigger lights its border and rotates a chevron on open; menu attaches seamlessly with a white border and selected-row highlight.
- **Cards:** Solid surface fill + 1px border per elevation level. States: default, hover (border +1 step), selected (white border), disabled (40% opacity).
- **Badges / Chips:** Filled-white (active), neutral (surface + outline), outlined, or inactive (strikethrough). Pill or squared.
- **Toast:** Fixed bottom-right, `#1C1C22` card with 1px border, semantic dot indicator, slide-up + fade entrance (250ms ease-out), 3.2s auto-dismiss.
- **Loading:** Spinner (track `#222229`, white arc, 700ms linear spin, sizes 16/24/36) and Skeleton (shimmer gradient `#1C1C22`→`#2A2A32`, 1.6s loop).
- **Table:** `surface-low` container, `surface-lowest` header, mono header labels, 1px row dividers (`outline-variant`), hover row highlight, semantic status badges.
- **Lists:** Separated by 1px `outline-variant` dividers.

### Dashboard

The decks home is dense; borders stay **hairline and low-contrast** so modules and decks remain the focus.

| Region | Elevation | Fill | Border |
|--------|-----------|------|--------|
| Today summary, stats strip, collapsed summary bar | Level 1 | `surface-container-low` | `outline-variant` only |
| Module nav (sidebar / chips) | — | `surface-container` when selected | `outline-variant` default; `outline-strong` when selected — never `on-surface` |
| Deck table | Level 1 | `surface-container-low` | `outline-variant`; row dividers `outline-variant` |
| Count badges (deck/module totals) | — | transparent | `outline-variant` |
| Empty / dashed placeholders | — | `surface-container-lowest` | dashed `outline-variant` |

Summary panels may be hidden by the user; the collapsed bar uses the same Level 1 border treatment.

## Motion

Animation is purposeful, never decorative.

- **Durations:** instant 50ms (tactile feedback), fast 150ms (hover/focus), normal 250ms (default), slow 400ms (entrances), slower 600ms (modals/overlays).
- **Easing:** `ease-out` for entrances, `ease-in` for exits, `ease-in-out` for internal transitions, `spring` for interactive feedback (toggles). Never `linear` for UI — only for loaders.
- **Principle:** Micro-interactions stay under 200ms so the system feels instant. Pressed states use `transform: scale(0.98)`.

## Accessibility

- **Contrast:** `on-surface` on `background` = 17.2:1 (AAA). `on-surface-variant` = 5.2:1 (AA). `muted` (2.4:1) is decorative only — never for essential text.
- **Focus indicators:** Every interactive element shows a visible ring — `outline: 2px solid #ECEDF1; outline-offset: 3px`. Inputs use a lit border plus a soft 15%-white ring.
- **Touch targets:** Minimum 44×44px hit area regardless of visual size; expand via padding without altering layout.

## Iconography

- **Style:** Outline only — no filled icons.
- **Stroke:** 1.5px width, `round` linecap and linejoin.
- **Grid:** 24×24px base with 2px internal padding.
- **Sizes:** 16, 20, 24 (base), 32, 40px.
- **Color:** Inherits text color via `currentColor`.
- **Recommended library:** Lucide Icons — matches the stroke/cap/join spec exactly.
