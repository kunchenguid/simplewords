# AGENTS.md

This file provides guidance to coding agents when working with code in this repository.

## Commands

```sh
npm ci                       # Install dependencies
npx playwright install --with-deps chromium  # One-time: Playwright Chromium for e2e
npm run build                # tsc --noEmit + esbuild bundle into extension/
npm test                     # Vitest (jsdom) - unit tests in test/
npx vitest run test/llm.test.ts        # Run a single Vitest file
npx vitest run -t 'pattern'            # Run tests matching a name
npm run test:e2e             # Playwright (headed Chromium; needs a display)
npm run lint                 # ESLint
npm run format:check         # Prettier check (use `npm run format` to write)
npm run check                # format:check + lint + test + build + test:e2e
```

`build:background` bundles `src/background.ts` as an ES module with code-splitting into `extension/` and `extension/chunks/`. `build:pages` bundles `src/content.ts` and `src/options.ts` as IIFE. All generated `extension/*.js` and `extension/chunks/` are git-ignored.

To load the unpacked extension: `npm run build`, then in `chrome://extensions` enable Developer mode and Load unpacked from `extension/`.

## Architecture

This is a Manifest V3 Chrome extension. There is no hosted backend - the browser calls the model provider directly. The codebase is plain TypeScript bundled by esbuild; there is no framework.

**Three entry points under `src/`, each bundled separately into `extension/`:**

- `background.ts` (service worker, ES module): Owns all provider calls. Receives `simplewords.refine`, `simplewords.openOptions`, and `simplewords.codexOAuthLogin` runtime messages from the content script and options page. Dispatches to `llm.ts` for OpenAI/Ollama (via the Vercel `ai` SDK + `@ai-sdk/openai`) or Codex (custom path in `llm.ts` using Codex's chat endpoint). Codex tokens are refreshed in-flight using `codexAuth.ts` when `codexAccessTokenIsExpiring` returns true; refreshed tokens are persisted back to `chrome.storage.local`.
- `content.ts` (content script, IIFE, injected on `<all_urls>` but gated by `isSimpleWordsEnabledForUrl`): Watches focus/selection on the page, places the floating button near the active editable element using `uiPosition.ts`, and on click sends the draft plus a serialized visible-text tree (`domTree.ts`, capped at `MAX_CONTEXT_CHARS = 30_000`) to the background. Result panel renders refined draft, loading, and error/setup states. All chrome.\* access goes through `chromeApi.ts`, which detects extension-context-invalidation (occurs on reload/update while a tab is open) and stops further calls.
- `options.ts` (options page, IIFE): Reads/writes settings via `chrome.storage.local`, kicks off Codex OAuth via the background, and surfaces provider configuration UI.

**Shared modules:**

- `settings.ts` - `SimpleWordsSettings` shape, `DEFAULT_SETTINGS`, `normalizeSettings`, `normalizeEnabledDomains`, `isProviderConfigured`, `isSimpleWordsEnabledForUrl`, and `DEFAULT_SYSTEM_PROMPT`. Provider is one of `'openai' | 'codex' | 'ollama'`.
- `codexAuth.ts` - PKCE OAuth flow against ChatGPT/Codex, plus expiry detection and refresh.
- `i18n.ts` - String table used by both UI surfaces. Must be kept in lockstep with `extension/_locales/<locale>/messages.json` for all 10 locales (en, es, zh_CN, hi, ar, pt_BR, fr, de, ja, ru). For `extensionDescription`, `package.json` `description` must also match the English locale message.

**Tests:** Vitest unit tests in `test/` use jsdom and cover each `src/` module by name. Playwright e2e in `e2e/extension.spec.ts` launches the built `extension/` directory in real Chromium.

**Releases:** release-please reads conventional commits on `main` and opens release PRs that bump `package.json`, `package-lock.json`, and `extension/manifest.json` together. `CHANGELOG.md` and `.release-please-manifest.json` are auto-generated - do not edit by hand. On release, CI zips `extension/` into `simplewords.zip`, attaches it to the GitHub Release, and (if the `SUBMIT_KEYS` secret is set) uploads via `scripts/chrome-web-store-publish.mjs`.

## Marketing Video

The `marketing-video/` directory is a standalone HyperFrames project for the Simple Words marketing video.

From that directory, run `npm run dev` to preview, `npm run check` to lint, validate, and inspect, and `npm run render` to generate the MP4.

The committed render is `marketing-video/simplewords-marketing.mp4`.

## Releases

Releases are managed by release-please from conventional commits on `main`.

Release PRs update `package.json`, `package-lock.json`, and `extension/manifest.json`.

When a release is created, GitHub Actions builds the extension, packages `extension/` as `simplewords.zip`, and attaches the zip to the GitHub Release.

Chrome Web Store publishing runs through `scripts/chrome-web-store-publish.mjs` only when the `SUBMIT_KEYS` GitHub secret is configured.
