# Simple Words — Extension UI Kit

Pixel-faithful recreation of the Simple Words Chrome extension surfaces, factored into reusable React components.

## Surfaces

1. **Floating button** (`FloatingButton.jsx`) — the pill button that pins itself to the bottom-right of any active editable field.
2. **Refine panel** (`RefinePanel.jsx`) — the floating panel that shows the loading state, the rewritten draft, and the Replace/Dismiss actions.
3. **Options page** (`OptionsPage.jsx`) — the full settings page with provider tabs, system prompt, name field, and per-provider config.
4. **Host page** (`HostPage.jsx`) — a faked Gmail-like compose window, just so the floating button has something to attach to in `index.html`.

## Component breakdown

- `FloatingButton` — the brand pill, `border-radius: 999px`, ink-900 background. Inherits from `colors_and_type.css`.
- `RefinePanel` — paper-tinted blur panel with `--shadow-3`. Two states: `loading` ("Refining…" with the loader spin) and `ready` (rewritten reply + actions).
- `OptionsPage` — single column 680px max width. Section components: `Section`, `Field` (label + input + hint), `ProviderSelect` (tabbed switcher between OpenAI / Codex / Ollama).
- `Field` / `Section` / `Button` — small primitives.

## Demo

`index.html` boots a fake Gmail compose window with a draft typed in. The Simple Words button is anchored below the textarea; clicking it opens the refine panel with a 1-second simulated "Refining…" state, then a rewritten draft. Click "Replace draft" to swap the textarea content; click "Dismiss" to close. There's also a tab switch at the top to jump to the **Options page** view.

Everything is mocked client-side — no actual LLM calls.
