# Simple Words - Extension UI Kit

Production-derived recreation of the Simple Words Chrome extension surfaces, factored into reusable React components for prototyping.
Check the production extension files before treating this kit as pixel-faithful.

## Surfaces

1. **Floating button** (`FloatingButton.jsx`) - a prototype pill button with the older sparkles icon and label.
   Production now uses a compact `sw` glyph button near the lower-right edge of focused editable fields, so check the extension files before treating this component as pixel-faithful.
2. **Refine panel** (`RefinePanel.jsx`) - the floating panel that shows the loading state, the rewritten draft, and the Replace/Dismiss actions.
3. **Options page** (`OptionsPage.jsx`) - the settings page prototype with provider config, enabled domains, name field, and advanced system prompt.
4. **Host page** (`HostPage.jsx`) - a faked Gmail-like compose window, just so the floating button has something to attach to in `index.html`.

The production floating button and panel show only when the current domain is enabled and the active editor is connected, focused, and visible, including empty editors.
They hide when focus moves away, the user clicks outside the editor and injected UI, the active editor is disconnected or hidden, or the extension context is invalidated.
Hidden states include `hidden`, `aria-hidden="true"`, `display: none` ancestors, the editor's own hidden or collapsed visibility, closed `dialog` elements, and closed `details` content outside the summary.
A focused editor with explicit visible styling can remain active inside a `visibility: hidden` ancestor.
They also reposition on window, visual viewport, and nested scroll changes, and suppress stale refinement results after focus moves, the editor becomes hidden, or a newer refinement starts for the same editor.
Preserve that visibility contract in production-facing work.

## Component breakdown

- `FloatingButton` - the prototype brand pill, `border-radius: 999px`, ink-900 background.
  Inherits from `colors_and_type.css`.
- `RefinePanel` - paper-tinted blur panel with `--shadow-3`.
  Two states: `loading` ("Refining..." with the loader spin) and `ready` (rewritten reply + actions).
- `OptionsPage` - single column 680px max width.
  Production uses three step cards: `Model provider`, `Where it appears`, and `Writing style`.
  The native provider `select` lives in `Model provider`, and the selected provider still controls the provider-section show/hide contract.
  This prototype may use a tabbed `ProviderSelect`; do not copy that pattern into production without checking `extension/options.html`.
- `Field` / `Section` / `Button` - small primitives.

## Demo

`index.html` boots a fake Gmail compose window with a draft typed in.
The prototype still positions its legacy pill below the textarea; production positions the compact `sw` button near the editor's lower-right edge.
Clicking the button opens the refine panel with a 1-second simulated "Refining..." state, then a rewritten draft.
Click "Replace draft" to swap the textarea content; click "Dismiss" to close.
There's also a tab switch at the top to jump to the **Options page** view.

Everything is mocked client-side - no actual LLM calls.
