# Simple Words — Design System

> Turn rough replies into friendly drafts using surrounding page context.

Simple Words is a **Chrome extension** that rewrites a rough draft in any editable field (textarea, contenteditable, input) into something professional, respectful, and friendly — using the surrounding page as context. It surfaces in two places:

1. **A floating pill button** anchored to the active editable field on any page (`content.js` injects it into the host page's DOM).
2. **An options page** for picking an LLM provider (OpenAI-compatible / Codex / Ollama) and customizing the system prompt.

This design system extends the bare functional shell into something that feels **elegant, futuristic, intelligent, and minimalist** — the brief from the project owner. It keeps the existing deep-ink palette as a backbone, grounds it in warm paper instead of cold white, and pairs a serif display voice with a technical grotesque body — so the product reads as both *literary* (it's about words) and *engineered* (it's an AI tool).

## Sources

- **GitHub repo** — [`kunchenguid/simplewords`](https://github.com/kunchenguid/simplewords) (`main` @ commit `80776395`). Manifest V3 Chrome extension, TypeScript + esbuild. Key files inspected:
  - `extension/manifest.json` — name, description, permissions
  - `extension/options.html` — current options-page DOM and inline CSS
  - `src/content.ts` — floating button + panel injected into page
  - `src/options.ts` / `src/settings.ts` — settings model and defaults
- No Figma file or external brand assets were provided. The extension itself has **no logo, no icon set, no font files** and currently relies on `system-ui`; marketing-video-specific assets now live under `marketing-video/assets/`.

## Index

| File / Folder | Purpose |
|---|---|
| `README.md` | This file. Brand context, content & visual foundations, iconography. |
| `SKILL.md` | Agent-skill manifest — load this to design *as* Simple Words. |
| `colors_and_type.css` | All color, type, spacing, radius, shadow, motion tokens. |
| `fonts/` | Webfont files (Instrument Serif, Geist, Geist Mono — see Visual Foundations). |
| `assets/` | Logo lockups, glyph mark, icon SVGs. |
| `preview/` | Small HTML cards that populate the Design System tab. |
| `ui_kits/extension/` | Pixel-faithful recreation of the floating button + panel + options page. |

---

## Content Fundamentals

Simple Words is a **quiet, useful tool**. It does one thing — make your reply sound right — and it doesn't preen about it. The voice mirrors that.

### Tone

- **Plain, direct, considered.** No exclamation marks, no marketing puff. The product *itself* is about turning rough into polished, so the copy practices what it preaches.
- **Confidently quiet.** No "✨ AI-powered" flourishes. No emoji. The intelligence is in the result, not the chrome.
- **Humble about LLMs.** From the existing options copy: *"Chrome extensions cannot silently read Codex CLI auth from disk."* — explains the limitation, then offers the workaround. No hand-waving.
- **Lowercase except where required.** Sentence case for headings (`Writing Instructions`, not `Writing instructions` or `WRITING INSTRUCTIONS`). Buttons are sentence case (`Replace draft`, `Dismiss`, `Save`).

### Person & address

- **Second-person ("you"), never first-person plural ("we").** *"Choose an LLM provider."* / *"Leave blank to restore the default system prompt."* — the user is the agent.
- The product refers to itself as **"Simple Words"** (proper noun, two words, both capitalized). Never "the extension," never "SW."
- The model addresses the *writer*, not the recipient — the system prompt instructs it to *"rewrite a rough text draft into professional, respectful, friendly content draft that expresses the same intent."*

### Casing

- **Headings:** sentence case. `Writing Instructions`, `OpenAI-Compatible`, `Codex Backend`.
- **Buttons:** sentence case verb-first when an action (`Save`, `Replace draft`, `Dismiss`). Title case for the brand button itself: `Simple Words`.
- **Labels:** sentence case (`My name`, `System prompt`, `Reasoning effort`).
- **Provider/option values:** lowercase (`none`, `low`, `medium`, `high`, `xhigh`).

### Microcopy examples (lifted verbatim from the source)

- Tagline / extension description: *"Turn rough replies into friendly drafts using surrounding page context."*
- Options-page intro: *"Choose an LLM provider. The extension calls the selected provider directly after you click the Simple Words button."*
- Empty-state error: *"Write a rough reply first."*
- Loading: *"Refining…"*
- System-prompt hint: *"Leave blank to restore the default system prompt."*
- Save confirmation: *"Saved."* (single word, with period.)

### Things to avoid

- **No emoji.** Anywhere. Not in copy, not in errors, not in marketing.
- **No em-dashes inside generated drafts.** The default system prompt explicitly forbids them: *"Do not use em dashes. Use regular dash '-' when needed."* (Em-dashes *are* fine in our brand/marketing copy — only the model output bans them.)
- **No exclamation marks.** Tools that whisper feel more confident than tools that shout.
- **No "magic" / "AI-powered" / "supercharged"** language. The product is matter-of-fact.

---

## Visual Foundations

The current extension is functional but unstyled — `system-ui`, off-the-shelf slate. The design system pushes it toward *quiet sophistication*:

### The core idea: paper × ink × intelligence

Three forces in tension:

1. **Paper** — warm off-white (`#FAF8F5`), the base. Suggests *writing* — a clean sheet, a letter being drafted.
2. **Ink** — deep blue-black (`#0E1525`), the foreground. Suggests *finished words*, the result.
3. **Intelligence** — a single restrained electric-ink accent (`#2747D6`) used *only* for AI moments (loading, the active button, focus rings). Suggests the model's hand on the page.

The product literally turns ink-rough into ink-clean, so the visual language is monochrome plus one accent. Never multi-hue, never gradients-as-decoration.

### Typography

| Role | Family | Use |
|---|---|---|
| Display / serif voice | **Instrument Serif** (italic preferred for headlines) | Brand wordmark, large quotes, hero numbers, pull-quotes in marketing. The "literary" register. |
| UI / body | **Geist** (400, 500, 600) | Everything else — labels, buttons, body, nav. Technical, neutral, modern. |
| Mono | **Geist Mono** | Model names, API keys, code, settings values. |

System fallbacks: `ui-serif, Georgia, serif` for the display; `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif` for the body — preserves the original's `system-ui` heritage if webfonts fail.

Weights are restrained: 400 for body, 500 for emphasized labels, 600 for buttons and section heads. **Never 700+** — heavy weights don't fit the elegance register.

### Color

See `colors_and_type.css` for tokens. The system has only ~12 colors total. The extension's existing values (`#172033`, `#526071`, `#176b3a`, `#c9d2e3`, `#f1f5f9`) are preserved as semantic tokens so the existing options page maps cleanly into the system; the new tokens (`paper`, `paper-2`, `accent`) extend it.

### Spacing

A 4px base scale: `4 / 8 / 12 / 16 / 20 / 24 / 32 / 48 / 64`. The extension currently uses 8/12/14/18/32 — these all fall on the 4px grid already.

### Radii

Three sizes, matching the source's existing usage:
- **`--radius-sm` = 8px** — inputs, secondary buttons
- **`--radius-md` = 14px** — cards, panels, sections
- **`--radius-pill` = 999px** — the floating brand button (only)

### Shadows & elevation

Inherited from the source and refined into a 3-step elevation scale. Shadows are **always cool blue-black** (`rgba(14, 21, 37, X)`), never neutral gray:

- **`--shadow-1`** — `0 1px 2px rgba(14, 21, 37, 0.06)` — flat surfaces, hairline lift
- **`--shadow-2`** — `0 8px 24px rgba(14, 21, 37, 0.22)` — the floating button (matches source)
- **`--shadow-3`** — `0 18px 48px rgba(14, 21, 37, 0.28)` — the floating panel (matches source)

No inset shadows. No glows. No ambient/key-light double-stacks.

### Borders

Always 1px, always one of two colors: `--line` (`#E5E0D6` — warm) for layout, or `--line-cool` (`#C9D2E3` — slate, inherited from source) for inputs. **Never thicker than 1px.** Never dashed.

### Backgrounds

- **Default surface:** flat `--paper` warm off-white. No gradients, no textures.
- **Card surface:** flat `--paper-2` (slightly deeper paper) — separation by tone, not by shadow.
- **Inverted surface:** flat `--ink-900` for the floating button and dark mode.
- **No full-bleed photography.** The product is text-first; imagery would distract.
- **No repeating patterns or noise.** Paper is the texture.

### Animation & motion

Motion is **slow, calm, and purposeful**. No bounces, no springs. Easing is always:
- **`--ease-out`** — `cubic-bezier(0.2, 0.8, 0.2, 1)` for entries
- **`--ease-in-out`** — `cubic-bezier(0.4, 0, 0.2, 1)` for state changes

Durations: **120ms** for hovers, **200ms** for state changes, **320ms** for entries (panel slides in). Anything longer feels sluggish; anything shorter feels twitchy.

The button on press: scales to `0.98` and darkens by ~5%. The panel on appear: fades from 0 → 1 opacity and translates up 4px. That's the entire motion vocabulary.

### Hover & press states

- **Hover (filled buttons):** background shifts 5% lighter, no transform.
- **Hover (outlined buttons / list rows):** `--paper-2` background fill, no transform.
- **Hover (text links):** color shifts to `--accent`, no underline change.
- **Press:** `transform: scale(0.98)`, transition 120ms.
- **Focus:** 2px solid `--accent` outline, 2px offset. Always visible — accessibility is non-negotiable for a tool that lives in every page.

### Transparency & blur

Used **once**: the floating panel can sit on top of host-page content. We use `backdrop-filter: blur(12px) saturate(1.2)` with a `rgba(255, 252, 247, 0.92)` paper-tinted overlay for the panel. **Nowhere else.** The options page is fully opaque.

### Layout rules

- **Floating button** is `position: fixed`, `z-index: 2147483647` (max), anchored 8px below the active editable field's bottom-right corner. This is non-negotiable — it must clear every host page, including ones with their own floating UI.
- **Options page** is a single column, `max-width: 680px`, generous 32px outer margins. Never multi-column. Reading width is sacred.
- **Floating panel** sits *above* the button (`panelPositionAboveButton` in source) when there's room, else flips to below. Max-width 420px, min-width 260px.

### Imagery & color vibe

There is essentially **no decorative imagery** in this product. If imagery is ever added (marketing site, blog), it should be:
- **Black & white**, or duotone in `--ink-900` × `--paper`.
- **Grainy and warm** — film grain, never digital noise.
- **Documentary** — hands writing, paper, ink, typewriters. Not stock-photo handshakes, never abstract gradients.

### Cards

Cards are **defined by tone, not by chrome.** A card is a `--paper-2` rectangle with `--radius-md` corners and a 1px `--line` border. **No drop shadow on cards** — that's reserved for floating elements only. The visual hierarchy comes from the warm-paper-on-warmer-paper contrast, not from elevation.

---

## Caveats / substitutions flagged for review

The extension ships **no fonts, no logo, no icons** and currently relies on `system-ui`. Everything visual in this design system is therefore a *proposal* extending the existing color/spacing/copy heritage; the marketing video uses those proposed assets from `marketing-video/assets/`. Specifically flagged:

- **Fonts: substituted from Google Fonts.** Instrument Serif + Geist + Geist Mono are loaded via Google Fonts CDN in `colors_and_type.css`. If the project has license-procured TTFs of these (or different) families, drop them in `fonts/` and update the `@import` line.
- **Wordmark and glyph: design-system-introduced.** Live in `assets/wordmark.svg` and `assets/glyph.svg`. Replace if a real mark exists.
- **Icon set: Lucide, linked from CDN** (closest match to the "intelligent + minimalist" brief at 1.5px stroke). A handful are inlined under `assets/icon-*.svg`. Swap if there's a preferred set.
- **Accent color (`#2747D6`): introduced** — the source has no accent. Used only for the AI loading moment and focus rings.

## Iconography

The Simple Words extension ships **zero icons or images**. The current options page is text-only; the floating button is a text pill (`"Simple Words"`). Marketing-video-specific icons and marks live under `marketing-video/assets/`.

Because there is no existing icon system, this design system establishes one:

- **Icon set:** [**Lucide**](https://lucide.dev/) — chosen for its 1.5px stroke weight, geometric construction, and quietly modern feel. Matches the "intelligent and minimalist" brief without being trendy.
- **Linking:** loaded from CDN (`https://unpkg.com/lucide-static@latest`) — no codebase icon font yet, so we link the closest CDN match. **Flagged for the user** as a substitution.
- **Stroke weight:** always `1.5px`, never `2px`. Always `currentColor`.
- **Sizing:** `16px` inline with body, `20px` in buttons, `24px` for section heads. Never larger than `24px` in product UI.
- **Fill style:** outlined only. Never filled. Never two-tone.

**Emoji:** never used. Anywhere. Not in product, not in marketing, not in error states.

**Unicode glyphs:** sparingly. The em-dash (—) is fine in marketing copy. The middle-dot (·) is used as a list separator. The ellipsis (…) is preferred over three periods. The right-arrow (→) is preferred over `->` in body copy.

**Brand mark:** Simple Words has no existing logo. This system introduces a simple wordmark in Instrument Serif italic (`Simple Words`) and a glyph mark — a lowercase italic *sw* in a paper square. Both live in `assets/`. Flagged as design-system-introduced (not from the source) so the project owner can replace if a real mark exists.
