# Simple Words - Extension UI Kit

Production-derived recreation of the Simple Words Chrome extension surfaces, factored into reusable React components for prototyping.
Check the production extension files before treating this kit as pixel-faithful.

## Surfaces

1. **Floating button** (`FloatingButton.jsx`) - the pill button that pins itself to the bottom-right of any active editable field.
2. **Refine panel** (`RefinePanel.jsx`) - the floating panel that shows the loading state, the rewritten draft, and the Replace/Dismiss actions.
3. **Options page** (`OptionsPage.jsx`) - the settings page prototype with system prompt, name field, and per-provider config.
4. **Host page** (`HostPage.jsx`) - a faked Gmail-like compose window, just so the floating button has something to attach to in `index.html`.

The production floating button and panel show only when the active editor is connected, visible, and contains non-whitespace text.
They hide when the active editor is disconnected, cleared, whitespace-only, or hidden, including `hidden`, `aria-hidden="true"`, CSS-hidden ancestors, closed `dialog` elements, and closed `details` content outside the summary.
They also suppress stale refinement results after focus moves, the editor becomes hidden or empty, or a newer refinement starts for the same editor.
Preserve that visibility contract in production-facing work.

## Component breakdown

- `FloatingButton` - the brand pill, `border-radius: 999px`, ink-900 background.
  Inherits from `colors_and_type.css`.
- `RefinePanel` - paper-tinted blur panel with `--shadow-3`.
  Two states: `loading` ("Refining..." with the loader spin) and `ready` (rewritten reply + actions).
- `OptionsPage` - single column 680px max width.
  Production keeps a native provider `select` inside a Provider section and preserves the existing provider-section show/hide contract.
  This prototype may use a tabbed `ProviderSelect`; do not copy that pattern into production without checking `extension/options.html`.
- `Field` / `Section` / `Button` - small primitives.

## Demo

`index.html` boots a fake Gmail compose window with a draft typed in.
The Simple Words button is anchored below the textarea; clicking it opens the refine panel with a 1-second simulated "Refining..." state, then a rewritten draft.
Click "Replace draft" to swap the textarea content; click "Dismiss" to close.
There's also a tab switch at the top to jump to the **Options page** view.

Everything is mocked client-side - no actual LLM calls.
