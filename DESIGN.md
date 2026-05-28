---
name: Focus Dock
description: Minimalist productivity dashboard for a desk-mounted phone in landscape
colors:
  cockpit-void: "oklch(0.07 0 0)"
  panel-surface: "oklch(0.13 0 0)"
  gauge-housing: "oklch(0.2 0 0)"
  frame-line: "oklch(0.22 0 0)"
  dim-readout: "oklch(0.55 0 0)"
  instrument-white: "oklch(0.95 0 0)"
  signal-green: "oklch(0.72 0.19 155)"
  alert-red: "oklch(0.577 0.245 27.325)"
typography:
  display:
    fontFamily: "JetBrains Mono, monospace"
    fontSize: "clamp(3.2rem, 12vw, 7.5rem)"
    fontWeight: 200
    lineHeight: 1
    letterSpacing: -0.02em
  headline:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "clamp(1.3rem, 4.2vw, 2.2rem)"
    fontWeight: 600
    lineHeight: 1.2
  title:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "clamp(0.8rem, 2vw, 1rem)"
    fontWeight: 500
    lineHeight: 1.3
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "clamp(0.7rem, 1.6vw, 0.85rem)"
    fontWeight: 400
    lineHeight: 1.4
  label:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "clamp(0.55rem, 1.2vw, 0.7rem)"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: 0.08em
rounded:
  sm: "12px"
  md: "14px"
  lg: "16px"
  xl: "20px"
  full: "9999px"
spacing:
  gap: "clamp(0.75rem, 2vw, 2rem)"
  pad-x: "clamp(0.75rem, 2.4vw, 2.5rem)"
  pad-y: "clamp(0.4rem, 1.2vh, 0.875rem)"
  inset: "clamp(0.5rem, 1.5vw, 1rem)"
components:
  button-primary:
    backgroundColor: "{colors.instrument-white}"
    textColor: "{colors.cockpit-void}"
    rounded: "{rounded.md}"
    padding: "clamp(0.5rem, 1.4vw, 0.75rem) clamp(1rem, 2.8vw, 1.75rem)"
    typography: "{typography.title}"
  button-secondary:
    backgroundColor: "{colors.gauge-housing}"
    textColor: "{colors.dim-readout}"
    rounded: "{rounded.md}"
    padding: "clamp(0.5rem, 1.4vw, 0.75rem) clamp(1rem, 2.8vw, 1.75rem)"
    typography: "{typography.title}"
  button-ghost:
    backgroundColor: transparent
    textColor: "{colors.dim-readout}"
    rounded: "{rounded.md}"
    padding: "clamp(0.5rem, 1.4vw, 0.75rem) clamp(1rem, 2.8vw, 1.75rem)"
    typography: "{typography.title}"
  card-default:
    backgroundColor: "{colors.panel-surface}"
    textColor: "{colors.instrument-white}"
    rounded: "{rounded.lg}"
    padding: "{spacing.pad-y} {spacing.pad-x}"
  control-button-primary:
    backgroundColor: "{colors.instrument-white}"
    textColor: "{colors.cockpit-void}"
    rounded: "{rounded.xl}"
    padding: "clamp(0.35rem, 0.9vh, 0.6rem) clamp(0.75rem, 1.8vw, 1.4rem)"
  control-button-secondary:
    backgroundColor: "{colors.gauge-housing}"
    textColor: "{colors.dim-readout}"
    rounded: "{rounded.xl}"
    padding: "clamp(0.35rem, 0.9vh, 0.6rem) clamp(0.75rem, 1.8vw, 1.4rem)"
  control-button-alert:
    backgroundColor: "{colors.signal-green}"
    textColor: "{colors.cockpit-void}"
    rounded: "{rounded.xl}"
    padding: "clamp(0.35rem, 0.9vh, 0.6rem) clamp(0.75rem, 1.8vw, 1.4rem)"
  input:
    backgroundColor: "{colors.gauge-housing}"
    textColor: "{colors.instrument-white}"
    rounded: "{rounded.md}"
    padding: "{spacing.inset}"
  slider-thumb:
    backgroundColor: "{colors.instrument-white}"
    rounded: "{rounded.full}"
  slider-track:
    backgroundColor: "{colors.gauge-housing}"
    rounded: "{rounded.full}"
---

# Design System: Focus Dock

## 1. Overview

**Creative North Star: "The Cockpit"**

A phone in landscape, mounted at eye level beside the monitor. The ambient light of the room, not the glow of the screen. You glance right, read the time, the next event, the temperature, and return to work. No tap, no swipe, no cognitive load. The dock is a secondary instrument panel, designed to be read at a distance and ignored the rest of the time.

Focus Dock is dark by necessity, not by fashion. In a dim room or bright office, the deep background (Cockpit Void) recedes while the text (Instrument White) resolves immediately. The green accent (Signal Green) is the single active voice. It marks what is happening now: the track that is playing, the timer that is running, the element that is focused. Everything else is luminance, nothing else is colored.

The cockpit metaphor is structural, not decorative. Instruments are fixed in position (one panel per viewport, no scroll). Labels are minimal (every pixel of type earns its place). Controls are large and few (1-2 taps per action). The interface does not surprise, does not animate unprompted, does not demand attention. It waits.

**Key Characteristics:**
- Dark background with tonal layering (void, panel, housing, frame) for depth without shadows
- One saturated accent used for active state only, never for decoration
- Large monospaced numbers as the primary data type (time, countdown, finance)
- Fluid clamp-based sizing that scales across landscape phone heights (340px to 420px+)
- Flat at rest; shadows appear only on interactive elements in hover state
- Safe-area-aware edges for notched phones in landscape orientation
- Every panel is exactly one viewport wide, zero scroll within panels

## 2. Colors

A restrained palette built around one deep luminance ladder and a single saturated signal. The ladder provides hierarchy. The signal provides state.

### Primary

- **Signal Green** (`oklch(0.72 0.19 155)`): The only saturated color. Marks the currently active element. Used for the playing track indicator, the running timer border, the focused input ring, the Spotify identity, the alert button. Never applied to static or decorative elements. If an element has Signal Green, the user should be able to answer "what is happening right now" by locating it.

### Neutral

- **Cockpit Void** (`oklch(0.07 0 0)`): The base background. Deep but not black. Every surface sits on this. At `0.07` lightness, it is dark enough to disappear in a dim room but not so dark that it crushes detail against a true black phone bezel.
- **Panel Surface** (`oklch(0.13 0 0)`): Cards, containers, popovers, settings drawer. The primary container surface. One step above the void, close enough that the transition is felt but not seen.
- **Gauge Housing** (`oklch(0.2 0 0)`): Secondary surfaces, button backgrounds, muted containers, inactive tabs. The boundary between passive content and interactive controls.
- **Frame Line** (`oklch(0.22 0 0)`): Borders, dividers, input strokes, separator lines. Subtle against both void and panel. Visible when looked for, invisible otherwise.
- **Dim Readout** (`oklch(0.55 0 0)`): Muted text, secondary information, inactive labels, placeholder text. At mid-luminance, legible but never competing with primary content.
- **Instrument White** (`oklch(0.95 0 0)`): Primary text, high-emphasis information, active labels. Almost white but fractionally softened at `0.95` rather than `1.0`, preventing bloom against the void.

### Semantic

- **Alert Red** (`oklch(0.577 0.245 27.325)`): Destructive actions only. Delete, stop, error, critical state. Never used as a decorative accent, never used for emphasis. If Alert Red appears, something requires attention or confirmation.

### Named Rules

**The Single Signal Rule.** Signal Green is the only saturated color in the system. Every element that communicates active state uses it. No secondary accent, no warm tone, no alternative hue. Its rarity is the point: if everything is green, nothing is active.

**The No-Tint Rule.** Every non-signal surface is an achromatic gray on the luminance ladder. No tinted grays, no warm or cool bias, no colored surfaces. The void is neutral. The panels are neutral. The text is neutral. The only hue in the system is Signal Green.

**The Luminance Ladder Rule.** Hierarchy between surfaces is expressed through lightness alone. Void (0.07), panel (0.13), housing (0.20), frame (0.22). Higher luminance means higher in the stacking context. This rule makes elevation invisible: a panel at 0.13 naturally floats above the void at 0.07 without a visible drop shadow.

## 3. Typography

**Display Font:** JetBrains Mono (monospace, via next/font `--font-jetbrains-mono`)
**Body Font:** Inter (sans-serif, via next/font `--font-inter`)

**Character:** A quiet, utilitarian pairing with no personality beyond clarity. Inter brings technical neutrality at body sizes, with generous x-height for readability at arm's length on a small screen. JetBrains Mono handles all numeric data where monospaced alignment is functional: clock digits, timer counts, finance figures, stopwatch laps. Neither font calls attention to itself. The pairing should never be described as beautiful, handsome, or elegant. It should be described as invisible.

### Hierarchy

- **Display** (JetBrains Mono, 200 weight, `clamp(3.2rem, 12vw, 7.5rem)`, 1 line-height, -0.02em letter-spacing): The clock. Also used for the night dock time. Negative letter-spacing tightens the monospaced glyphs at extreme sizes. This is the single largest type in the system and should remain unique to the clock panel.

- **Headline** (Inter, 600 weight, `clamp(1.3rem, 4.2vw, 2.2rem)`, 1.2 line-height): Panel titles, temperature reading, large financial figures, the current finance ticker value. Bold weight ensures these resolve in under half a second at a glance.

- **Title** (Inter, 500 weight, `clamp(0.8rem, 2vw, 1rem)`, 1.3 line-height): Button labels, track names, event titles, card headings, tab labels. The workhorse hierarchy step. Medium weight provides hierarchy without heaviness.

- **Body** (Inter, 400 weight, `clamp(0.7rem, 1.6vw, 0.85rem)`, 1.4 line-height): Secondary descriptions, artist names, event details, weather description, Pomodoro phase labels. Max line length 65-75 characters. The 1.4 line-height is critical for readability at the smallest sizes.

- **Label** (Inter, 500 weight, `clamp(0.55rem, 1.2vw, 0.7rem)`, 1 line-height, 0.08em letter-spacing, uppercase): Date display, time-of-day markers, badge text, AM/PM indicator, event time labels. Uppercase with wide tracking creates a scannable metadata tier that visually separates from body text. Never use lowercase for label-level type.

- **Mono numeric** (JetBrains Mono, 500 weight, inherits size from context, `tabular-nums`): Timer display, stopwatch, finance figures within body text, any column of numbers that must align vertically. Applied via `font-mono tabular-nums` utility class when numbers appear inside an otherwise Inter context.

### Named Rules

**The Tabular Data Rule.** All numeric displays use monospaced figures with tabular spacing. The clock uses JetBrains Mono by default. Timer counts, stopwatch values, finance figures, and any column of numbers use `font-mono tabular-nums` to prevent visual shifting as digits change.

**The Display Monopoly Rule.** The Display hierarchy is reserved exclusively for the clock. No other panel uses type at this size or weight. If a panel needs a large number (timer, finance), use Headline weight in JetBrains Mono, not Display weight.

**The Upper-Label Rule.** All metadata at Label hierarchy uses uppercase with wide tracking. The date, AM/PM, event time markers, badge text. Lowercase labels at this size are indistinguishable from body text; uppercase creates a separate visual register.

## 4. Elevation

The system has no visible elevation. Depth is conveyed entirely through luminance layering across five achromatic stops: void (0.07), panel (0.13), housing (0.20), frame (0.22), text (0.55 and 0.95). A card at panel luminance does not float above the void with a shadow. It simply sits one step brighter.

This approach is deliberate. On a small landscape screen viewed at arm's length, shadows add noise without useful depth cues. The luminance stack provides all the hierarchy the interface needs: the user can scan any screen and immediately distinguish background from container from control from text.

### Interactive feedback model

Shadows appear only as responses to state:

- **Hover** on primary buttons: `0 1px 4px rgba(0,0,0,0.6)`. A subtle lift, the only shadow in the entire system. Applied on desktop hover and persists through the interaction.
- **Active** (tap or click): `transform: scale(0.96)` for 150ms. No shadow change. The scale-down provides tactile feedback without adding or removing depth.
- **Focus-visible**: Signal Green ring at 3px thickness, 2px offset. Applicable to all interactive elements. The ring is the focus indicator, not a shadow or glow.
- **Disabled**: `opacity: 50`, `pointer-events: none`. The element stays flat at its original luminance. No gray overlay, no desaturation.
- **Pomodoro completion**: pulsing border at `border-2 border-destructive/45 bg-destructive/5`. The pulse animation uses `animate-productivity-complete` (1.8s ease-in-out infinite, scale 1 to 1.05). The completion state is communicated through border and opacity, not an added shadow or overlay.

No element carries a shadow at rest. If a card, panel, or container needs emphasis, raise its background luminance one step toward Instrument White. Do not add a drop shadow.

### Named Rules

**The Flat-By-Default Rule.** Every surface is flat at rest. Shadows appear only as a response to interaction (hover on primary button). Audit test: if a card or container has a visible shadow when the user is not touching or hovering any element, the rule is broken.

## 5. Components

### Carousel (page-level navigation)

The primary navigation mode. Nine panels arranged in a horizontal snap-scroll sequence. No navigation chrome, no tab bar, no sidebar.

- **Container:** `overflow-x-auto snap-x snap-mandatory scrollbar-hide`. Full viewport width and height.
- **Each panel:** `w-full h-full shrink-0 snap-center flex items-center justify-center`. Exactly one viewport wide.
- **Pagination:** Six dots at the bottom center of the viewport. Active dot is Instrument White (6px diameter). Inactive dots are Frame Line (6px). No labels, no chevrons, no visible scrollbar. The dots communicate position without demanding a tap.
- **Auto-scroll:** On entering night mode (scheduled or toggled), the carousel auto-scrolls to the NightDock panel (index 2). Polled every 30 seconds. No animation, no transition.

### Buttons

Four tiers mapped to the luminance ladder. All share: `inline-flex items-center justify-center`, `transition-all duration-150`, `select-none`.

- **Shape:** Gently curved edges. Standard buttons use 14px radius (`rounded-md`). Control buttons (ProductivityHub) use 20px (`rounded-xl`).
- **Primary (Instrument White on Cockpit Void):** The affirmative action. Play button, timer start, confirm. Hover reduces opacity to 90% and adds `0 1px 4px rgba(0,0,0,0.6)`. Active scales to `0.96`. Focus-visible gets a 3px Signal Green ring.
- **Secondary (Gauge Housing background, Frame Line border, Dim Readout text):** Neutral actions. Hover raises text to Instrument White. Active scales to `0.96`.
- **Ghost (transparent, Dim Readout text):** Lightweight actions. Tab labels, pagination hit areas, text-style controls. Hover transitions text to Instrument White. No border, no background at any state.
- **Alert (Signal Green background, Cockpit Void text, 20px radius):** Active state only. Running timer button, active playback button. Hover fades opacity to 85%. Active scales to `0.96`. This is the only button that uses Signal Green. If the button is not actively engaged in its function, it should not use this variant.

### Cards

- **Corner style:** Large rounded at 16px (`rounded-lg`, `--radius`).
- **Background:** Panel Surface at `oklch(0.13 0 0)`.
- **Border:** Frame Line at `oklch(0.22 0 0)`, 1px solid.
- **Shadow strategy:** None at rest. No card carries a shadow.
- **Internal padding:** Fluid `--dock-pad-y` (top/bottom) and `--dock-pad-x` (left/right).
- **Variants:**
  - **Default:** Standard card with Frame Line border. Used for calendar events, weather details, most container needs.
  - **Urgent:** `border-accent/60 bg-accent/10` — a Signal Green tinted border and background for events or alerts requiring immediate attention.
  - **Ghost:** `border-border/20 bg-transparent` — no background, faint border. Used for empty states or when the card should recede visually (night events).

### EventCard (agenda)

A specialized card for calendar events. Luminance-coded by proximity.

- **Layout:** `flex items-center gap-2` with a colored dot on the left indicating event type (default, all-day, timed).
- **Time display:** Label hierarchy (uppercase, tracked), mono where applicable.
- **Title:** Title hierarchy, truncated with `truncate` for long event names.
- **Context chip:** Optional badge showing time until event. Uses Gauge Housing background with Dim Readout text when distant, Signal Green background with Cockpit Void text when imminent (under 15 minutes).
- **Countdown:** A dedicated row showing "em 45 min" or "começa agora" in label-type type. Shown only for events within the next 2 hours.

### Inputs / Fields

- **Style:** Flat stroke input. Gauge Housing background with Frame Line 1px border.
- **Shape:** 14px radius (`rounded-md`).
- **Text:** Body hierarchy, Instrument White.
- **Placeholder:** Dim Readout.
- **Focus:** Frame Line border transitions to Signal Green. A 3px Signal Green ring at 25% opacity via `focus-visible:ring-[3px] ring-accent/25`.
- **Disabled:** Frame Line border at 50% opacity. Text at Dim Readout.
- **Error:** Alert Red border. No icon, no toast. The border change is sufficient.

### Slider (Spotify volume, Home Assistant brightness)

- **Track:** Gauge Housing background, 6px height, 14px radius.
- **Fill:** Signal Green. The active portion of the track from 0% to the current value.
- **Thumb:** Instrument White circle, 16px diameter, `rounded-full`, no border, no shadow. The thumb appears only when the user is interacting with the slider. It disappears when idle, leaving only the track and fill visible.
- **Interaction:** Touch-drag or tap-to-seek. No step increments. Continuous values only.

### TabBar (ProductivityHub)

Segmented control for switching between Pomodoro, Timer, and Stopwatch modes.

- **Container:** `rounded-xl bg-secondary/30 border border-border/30`. Flexible height, equal-width children.
- **Active tab:** `bg-secondary text-foreground border border-border/60`. Gauge Housing background with Frame Line border.
- **Inactive tab:** `text-muted-foreground hover:text-foreground/80`. Transparent background, Dim Readout text.
- **Divider:** `w-px self-stretch bg-border/30 shrink-0 my-1`. 1px Frame Line at 30% opacity between tabs.

### SpotifyBar (persistent bottom bar)

Always visible at the viewport bottom, rendered outside the carousel scroll context.

- **Layout:** `flex items-center w-full dock-px`. Fluid gap at `clamp(0.45rem, 1.4vw, 0.75rem)`.
- **Album art:** `size-[clamp(2rem,4.5vw,2.5rem)] rounded-md bg-secondary` — small square with medium rounding.
- **Track info:** Two-line truncation. Track name in Title hierarchy, artist in Body hierarchy at Dim Readout.
- **Controls:** Play/pause (Signal Green circle, Instrument White icon), next/previous (Dim Readout icons). All controls are 44x44 minimum touch target behind CSS custom property sizing.
- **Optimistic UI:** State flips immediately on tap. A 1500ms debounced poll confirms server state.
- **Empty state:** When Spotify is not configured or no track is active, show "Configure Spotify credentials" in Body hierarchy at Dim Readout.

### SettingsTrigger (gear icon)

Shown only on the Today panel (index 0). A single gear icon at `--dock-control-size` with `--dock-control-icon-size` Lucide icon.

- **Style:** Ghost tier. No background, no border. Dim Readout default, Instrument White on hover.
- **Panel:** Opens a Drawer (Vaul) with configuration sections. Thumb grabber at the top (Frame Line, short horizontal bar). Safe-area-aware bottom padding.

### NightDock

A dedicated low-brightness clock mode for nighttime or inactive use. Separate panel in the carousel, not a CSS overlay.

- **Background:** The same Cockpit Void as the rest of the system. No dimming overlay, no separate dark theme toggle.
- **Clock:** Display hierarchy in Dim Readout rather than Instrument White. Fractional opacity on seconds (`text-muted-foreground/50`).
- **Burn-in prevention:** Pixel shift every 5 minutes. The entire clock group translates 2-3px in a random direction using `transform: translate(x, y)`. The shift is invisible to the user but prevents static image retention on OLED screens.
- **Interaction:** Tap anywhere on the NightDock panel to toggle dimmed state (reduces overall opacity further via CSS class switch). The toggle is instant, no transition.

## 6. Do's and Don'ts

### Do:
- **Do** use Signal Green on exactly one element per viewport at rest. Two maximum if there is a clear primary/secondary relationship (e.g., playing track indicator and its focused control). If you count three green elements, remove one.
- **Do** rely on the luminance ladder for hierarchy before reaching for borders, badges, or backgrounds. Void (0.07), panel (0.13), housing (0.20), frame (0.22), text (0.55), text-highlight (0.95). If a relationship is unclear, the luminance delta is too small.
- **Do** use Display hierarchy exclusively for the clock. Timer counts use Headline weight in JetBrains Mono. Finance figures use Body weight in JetBrains Mono. The clock has a monopoly on 200-weight type at 7.5rem.
- **Do** keep every panel to exactly one viewport width. No inner scrolling, no overflow, no horizontal scroll within panels. The carousel is the only scroll axis.
- **Do** use `clamp()` for every dimensional value. Fixed pixel values break across the 340px to 420px+ height range.
- **Do** respect safe areas. `env(safe-area-inset-*)` should wrap every edge-adjacent element.
- **Do** apply `active:scale-[0.96]` on every interactive element. This is the primary tactile feedback mechanism in the absence of shadows or haptics.
- **Do** truncate single-line text with `truncate` class. The viewport width is 667px; text overflow is inevitable.

### Don't:
- **Don't** use Signal Green for static elements. A green icon that does not indicate active state is a bug. A green heading is a bug. A green border that always renders is a bug. If it is green, something must be happening.
- **Don't** introduce a second accent color. Not blue for links. Not red for errors (Alert Red is for destructive actions only, not as an accent). Not purple for premium. Signal Green is the single voice.
- **Don't** use decorative background colors on surfaces. Every colored surface is a functional container on the luminance ladder. No tinted cards, no gradient panels, no glass backgrounds, no translucent overlays.
- **Don't** use side-stripe borders. `border-left` or `border-right` at more than 1px as an accent is prohibited. Use a full border, a background tint, or nothing.
- **Don't** use gradient text. Emphasis comes from weight and scale. If a word needs to stand out, make it larger or heavier. Do not apply `background-clip: text` with a gradient.
- **Don't** use the hero-metric template. No big number + small label + supporting stats + gradient accent. Numbers stand on their own. A single temperature, a single financial figure, a single timer value. Not an array of them.
- **Don't** use identical card grids. The form factor does not accommodate repeating card grids. Each panel has a unique layout structure designed for its content type. If you find yourself with three identical cards in a row, redesign the layout.
- **Don't** animate layout properties. No transitions on width, height, top, left, margin, padding. Animate opacity and `transform` only. Layout animations cause jank on mobile GPUs and violate the calm-technology principle.
- **Don't** show the slider thumb when idle. The thumb appears only during active drag. At rest, the slider displays as a track with a Signal Green fill and no thumb.
- **Don't** show scrollbars. The carousel uses `scrollbar-hide`. Individual panels have no scroll. If content overflows a panel, the panel needs redesign, not a scrollbar.
