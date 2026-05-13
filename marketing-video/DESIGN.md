# Simple Words — Marketing Video

## Style Prompt

Paper × ink × intelligence. Warm off-white paper as ground, deep blue-black ink as foreground, one electric-ink accent reserved for AI moments. Quiet sophistication, not flashy. The product is about turning rough into polished, so the visual language practices what it preaches: monochrome plus one accent, no gradients-as-decoration, no glow, no marketing puff. Motion is slow, calm, purposeful — never bouncy. Sentence case everywhere. No emoji, no exclamation marks.

## Colors

- **Paper / canvas** — `#FAF8F5` (primary surface)
- **Paper-2 / cards** — `#F1EEE8`
- **Paper-3 / hairline** — `#E5E0D6`
- **Ink-900 / headings + dark surfaces** — `#0E1525`
- **Ink-700 / heavy body** — `#2A3142`
- **Ink-500 / muted body** — `#526071`
- **Ink-300 / captions** — `#9099AA`
- **Accent / AI moment, focus** — `#2747D6` (electric ink — reserved for the Simple Words click + refining state + sparkles)
- **Line cool / form borders** — `#C9D2E3`

## Typography

- **Display / brand voice** — `Instrument Serif`, italic preferred (wordmark, hero text, outro)
- **UI / body** — `Geist`, weights 400 / 500 / 600 only (everything else)
- **Mono** — `Geist Mono` (model names, code-like accents)

System fallbacks: `ui-serif, Georgia, serif` and `system-ui, -apple-system, sans-serif`.

For 1080×1080 video, scale up: headlines 64–96px, body 36–44px, UI labels 28–32px, captions 22–24px. Everything must read on a phone in a feed without zooming.

## Motion

- **Easing** — `cubic-bezier(0.2, 0.8, 0.2, 1)` for entries (`--ease-out`); `cubic-bezier(0.4, 0, 0.2, 1)` for state changes (`--ease-in-out`). Vary across scenes per house style.
- **Durations** — 120ms hovers, 200ms state changes, 320ms entries (panel slide). For video pacing extend slightly: 400–700ms scene reveals.
- **No bounces, no springs, no overshoot.** No `back.out`, no `elastic`. Use `power2.out`, `power3.out`, `expo.out`, `sine.inOut`.

## Delight (allowed)

- Tiny accent-colored sparkle particles around the compact `sw` button at the moment of activation
- A soft accent ring pulse when the refined panel appears
- A gentle "send" liftoff: the email card translates up + fades, paper-textured
- A satisfying check-mark beat after replace

## What NOT to Do

- No emoji. Anywhere.
- No exclamation marks in any copy.
- No gradients as decoration. Solid paper or solid ink only.
- No drop shadows on cards — shadows are reserved for floating elements (the compact `sw` button and the panel).
- No bouncy easing. No `back.out`, no springs, no overshoot.
- No multi-hue color. Monochrome plus the single accent.
- No em dashes inside generated drafts (the model output bans them; brand copy may use them).
- No filled icons, except the branded italic `sw` floating-button glyph. Other icons use 1.5px stroke, outlined only.
- No "magic" / "AI-powered" / "supercharged" language.
- No font weight above 600.
