# Simple Words — Design System

> Never waste time wordsmithing your replies.
> Just say what you mean, and let AI help turn it into a respectful draft before you send.

Simple Words is a **Chrome extension** that rewrites a rough draft in any editable field (textarea, contenteditable, input) into something professional, respectful, and friendly — using the surrounding page as context. It surfaces in two places:

1. **A floating pill button** anchored to the active editable field on any page (`content.js` injects it into the host page's DOM).
2. **An options page** for picking an LLM provider (OpenAI-compatible / Codex / Ollama) and customizing the system prompt.

This design system extends the bare functional shell into something that feels **elegant, futuristic, intelligent, and minimalist** — the brief from the project owner. It keeps the existing deep-ink palette as a backbone, grounds it in warm paper instead of cold white, and pairs a serif display voice with a technical grotesque body — so the product reads as both _literary_ (it's about words) and _engineered_ (it's an AI tool).

## Sources

- **GitHub repo** — [`kunchenguid/simplewords`](https://github.com/kunchenguid/simplewords) (`fix/content-editor-visibility`). Manifest V3 Chrome extension, TypeScript + esbuild. Key files inspected:
  - `extension/manifest.json` — name, description, permissions
  - `extension/options.html` — current options-page DOM and inline CSS
  - `src/content.ts` — floating button + panel injected into page
  - `src/options.ts` / `src/settings.ts` — settings model and defaults
- No Figma file or external brand assets were provided.
  The options page now loads Instrument Serif, Geist, and Geist Mono from Google Fonts; the content script still relies on host-page font availability with system fallbacks.
  The extension uses an inline `sw` glyph on the options page and inline SVG icons in the injected UI; marketing-video-specific assets now live under `marketing-video/assets/`.

## Index

| File / Folder         | Purpose                                                                       |
| --------------------- | ----------------------------------------------------------------------------- |
| `README.md`           | This file. Brand context, content & visual foundations, iconography.          |
| `SKILL.md`            | Agent-skill manifest — load this to design _as_ Simple Words.                 |
| `colors_and_type.css` | All color, type, spacing, radius, shadow, motion tokens.                      |
| `fonts/`              | Webfont files (Instrument Serif, Geist, Geist Mono — see Visual Foundations). |
| `assets/`             | Logo lockups, glyph mark, icon SVGs.                                          |
| `preview/`            | Small HTML cards that populate the Design System tab.                         |
| `ui_kits/extension/`  | Production-derived prototypes for the floating button, panel, and options.    |

---

## Content Fundamentals

Simple Words is a **quiet, useful tool**. It does one thing — make your reply sound right — and it doesn't preen about it. The voice mirrors that.

### Tone

- **Plain, direct, considered.** No exclamation marks, no marketing puff. The product _itself_ is about turning rough into polished, so the copy practices what it preaches.
- **Confidently quiet.** No "✨ AI-powered" flourishes. No emoji. The intelligence is in the result, not the chrome.
- **Humble about LLMs.** From the existing options copy: _"Chrome extensions cannot silently read Codex CLI auth from disk."_ — explains the limitation, then offers the workaround. No hand-waving.
- **Lowercase except where required.** Sentence case for headings (`Writing instructions`, not `Writing Instructions` or `WRITING INSTRUCTIONS`).
  Buttons are sentence case (`Replace draft`, `Dismiss`, `Save`).

### Person & address

- **Second-person ("you"), never first-person plural ("we").** _"Choose an LLM provider."_ / _"Leave blank to restore the default system prompt."_ — the user is the agent.
- The product refers to itself as **"Simple Words"** (proper noun, two words, both capitalized). Never "the extension," never "SW."
- The model addresses the _writer_, not the recipient — the system prompt instructs it to _"rewrite a rough text draft into professional, respectful, friendly content draft that expresses the same intent."_

### Casing

- **Headings:** sentence case. `Writing instructions`, `OpenAI-compatible`, `Codex backend`.
- **Buttons:** sentence case verb-first when an action (`Save`, `Replace draft`, `Dismiss`). Title case for the brand button itself: `Simple Words`.
- **Labels:** sentence case (`My name`, `System prompt`, `Reasoning effort`).
- **Provider/option values:** lowercase (`none`, `low`, `medium`, `high`, `xhigh`).

### Microcopy examples (lifted verbatim from the source)

- Tagline / extension description: _"Never waste time wordsmithing your replies. Just say what you mean, and let AI help turn it into a respectful draft before you send."_
- Options-page intro: _"Choose an LLM provider. The extension calls the selected provider directly after you click the Simple Words button."_
- Empty-state error: _"Write a rough reply first."_
- Loading: button _"Refining"_, panel heading _"Refining draft"_, panel body _"Refining…"_
- System-prompt hint: _"Leave blank to restore the default system prompt."_
- Save confirmation: _"Saved."_ (single word, with period.)

### Things to avoid

- **No emoji.** Anywhere. Not in copy, not in errors, not in marketing.
- **No em-dashes inside generated drafts.** The default system prompt explicitly forbids them: _"Do not use em dashes. Use regular dash '-' when needed."_ (Em-dashes _are_ fine in our brand/marketing copy — only the model output bans them.)
- **No exclamation marks.** Tools that whisper feel more confident than tools that shout.
- **No "magic" / "AI-powered" / "supercharged"** language. The product is matter-of-fact.

---

## Visual Foundations

The current extension ships the Simple Words visual refresh in the options page and injected content UI.
The design system keeps it grounded in _quiet sophistication_:

### The core idea: paper × ink × intelligence

Three forces in tension:

1. **Paper** — warm off-white (`#FAF8F5`), the base. Suggests _writing_ — a clean sheet, a letter being drafted.
2. **Ink** — deep blue-black (`#0E1525`), the foreground. Suggests _finished words_, the result.
3. **Intelligence** — a single restrained electric-ink accent (`#2747D6`) used _only_ for AI moments (loading, the active button, focus rings). Suggests the model's hand on the page.

The product literally turns ink-rough into ink-clean, so the visual language is monochrome plus one accent. Never multi-hue, never gradients-as-decoration.

### Typography

| Role                  | Family                                                | Use                                                                                            |
| --------------------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Display / serif voice | **Instrument Serif** (italic preferred for headlines) | Brand wordmark, large quotes, hero numbers, pull-quotes in marketing. The "literary" register. |
| UI / body             | **Geist** (400, 500, 600)                             | Everything else — labels, buttons, body, nav. Technical, neutral, modern.                      |
| Mono                  | **Geist Mono**                                        | Model names, API keys, code, settings values.                                                  |

System fallbacks: `ui-serif, Georgia, serif` for the display; `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif` for the body — preserves the original's `system-ui` heritage if webfonts fail.

Weights are restrained: 400 for body, 500 for emphasized labels, 600 for buttons and section heads. **Never 700+** — heavy weights don't fit the elegance register.

### Color

See `colors_and_type.css` for tokens.
The system has only ~12 colors total.
The extension's refreshed values (`#0E1525`, `#526071`, `#176b3a`, `#c9d2e3`, `#f1f5f9`) are preserved as semantic tokens so the options page and injected UI map cleanly into the system; the warm paper tokens (`paper`, `paper-2`, `paper-3`) extend it.

### Spacing

A 4px base scale: `4 / 8 / 12 / 16 / 20 / 24 / 32 / 48 / 64`.
The refreshed extension mostly stays on that grid, with production exceptions for tight UI details: 7px icon gaps, 10px glyph radius, 11px save-button padding, 13px panel-button padding, 14px labels/section gaps, 18px legacy section spacing, 22px section padding, 44px glyph size, and 80px bottom page padding.

### Radii

Three sizes, matching the source's existing usage:

- **`--radius-sm` = 8px** — inputs, secondary buttons
- **`--radius-md` = 14px** — cards, panels, sections
- **`--radius-pill` = 999px** — the floating brand button (only)

### Shadows & elevation

Inherited from the source and refined into a 3-step elevation scale. Shadows are **always cool blue-black** (`rgba(14, 21, 37, X)`), never neutral gray:

- **`--shadow-1`** — `0 1px 2px rgba(14, 21, 37, 0.06)` — flat surfaces, hairline lift
- **`--shadow-2`** — `0 8px 24px rgba(14, 21, 37, 0.22)` — the floating button (matches source)
- **`--shadow-3`** — `0 18px 48px rgba(14, 21, 37, 0.22)` — the floating panel (matches source)

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
- **Focus (buttons):** 2px solid `--accent` outline, 2px offset.
- **Focus (form fields):** `--accent` border plus `0 0 0 3px rgba(39, 71, 214, 0.16)` ring, with native outline removed.
  Always visible — accessibility is non-negotiable for a tool that lives in every page.

### Transparency & blur

Used **once**: the floating panel can sit on top of host-page content.
We use `backdrop-filter: blur(12px) saturate(1.2)` with a `rgba(255, 252, 247, 0.96)` paper-tinted overlay for the panel.
**Nowhere else.**
The options page is fully opaque.

### Layout rules

- **Floating button** is `position: fixed`, `z-index: 2147483647` (max), anchored 8px below the active editable field's bottom-right corner.
  This is non-negotiable — it must clear every host page, including ones with their own floating UI.
  The injected button and panel are visible only while the active editor is connected and visible.
  Hide them when the editor or any ancestor is `hidden`, `aria-hidden="true"`, `display: none`, `visibility: hidden`, `visibility: collapse`, inside a closed `dialog`, or inside closed `details` content.
  Stale refinement results must stay suppressed after focus moves, the editor becomes hidden, or a newer refinement starts for the same editor.
- **Options page** is a single column, `max-width: 680px`, with `48px 24px 80px` page padding.
  Never multi-column.
  Reading width is sacred.
- **Floating panel** sits _above_ the button (`panelPositionAboveButton` in source) when there's room, else flips to below.
  Max-width 420px, min-width 280px.

### Imagery & color vibe

There is essentially **no decorative imagery** in this product. If imagery is ever added (marketing site, blog), it should be:

- **Black & white**, or duotone in `--ink-900` × `--paper`.
- **Grainy and warm** — film grain, never digital noise.
- **Documentary** — hands writing, paper, ink, typewriters. Not stock-photo handshakes, never abstract gradients.

### Cards

Cards are **defined by tone, not by chrome.** A card is a `--paper-2` rectangle with `--radius-md` corners and a 1px `--line` border. **No drop shadow on cards** — that's reserved for floating elements only. The visual hierarchy comes from the warm-paper-on-warmer-paper contrast, not from elevation.

---

## Caveats / substitutions flagged for review

The production extension now uses the core visual refresh, but packaged brand assets are still limited.
The options page loads fonts from Google Fonts, renders an inline `sw` glyph, and the injected UI inlines minimal SVG icons.
The marketing video uses proposed assets from `marketing-video/assets/`.
Specifically flagged:

- **Fonts: substituted from Google Fonts.** Instrument Serif + Geist + Geist Mono are loaded via Google Fonts CDN in `extension/options.html` and `colors_and_type.css`.
  If the project has license-procured TTFs of these (or different) families, drop them in `fonts/` and update the imports.
- **Wordmark and glyph: design-system-introduced.** The options page renders an inline `sw` glyph; design-system asset files live in `assets/wordmark.svg` and `assets/glyph.svg`.
  Replace if a real mark exists.
- **Icon set: inline SVGs.** The production floating button and panel use inline sparkles and loader SVGs at 1.5px stroke.
  A handful of design-system icons are inlined under `assets/icon-*.svg`.
  Swap if there's a preferred set.
- **Accent color (`#2747D6`): introduced.** Used only for the AI loading moment and focus rings.

## Iconography

The Simple Words extension ships no packaged icon font or image set.
The options page uses an inline `sw` glyph, and the floating button/panel use inline sparkles and loader SVGs.
Marketing-video-specific icons and marks live under `marketing-video/assets/`.

Because there is no packaged icon system, this design system establishes one:

- **Icon set:** Lucide-style inline SVGs, chosen for their 1.5px stroke weight, geometric construction, and quietly modern feel.
  Matches the "intelligent and minimalist" brief without being trendy.
- **Linking:** production UI inlines the required SVGs.
  The broader design system may use CDN-backed Lucide references only for prototypes.
- **Stroke weight:** always `1.5px`, never `2px`. Always `currentColor`.
- **Sizing:** `16px` inline with body and loaders, `14px` in the injected floating button and panel heading, `24px` for section heads. Never larger than `24px` in product UI.
- **Fill style:** outlined only. Never filled. Never two-tone.

**Emoji:** never used. Anywhere. Not in product, not in marketing, not in error states.

**Unicode glyphs:** sparingly. The em-dash (—) is fine in marketing copy. The middle-dot (·) is used as a list separator. The ellipsis (…) is preferred over three periods. The right-arrow (→) is preferred over `->` in body copy.

**Brand mark:** Simple Words has no existing logo. This system introduces a simple wordmark in Instrument Serif italic (`Simple Words`) and a glyph mark — a lowercase italic _sw_ in a paper square. Both live in `assets/`. Flagged as design-system-introduced (not from the source) so the project owner can replace if a real mark exists.
