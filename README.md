# Simple Words

Simple Words is a Chrome extension for people who never want to waste time wordsmithing replies.
Just say what you mean, and let AI help turn it into a respectful draft before you send.
The extension UI supports English, Spanish, Chinese (Simplified), Hindi, Arabic, Portuguese (Brazil), French, German, Japanese, and Russian.

## Development

Install dependencies with `npm ci`.

Run `npm run build` before loading the extension locally or packaging it.

The built files `extension/background.js`, `extension/content.js`, `extension/options.js`, and `extension/chunks/` are generated artifacts and are not tracked in Git.

When changing static extension copy, update `src/i18n.ts` and every `extension/_locales/*/messages.json` file with matching keys and preserved substitutions such as `$1`.

## Marketing Video

The `marketing-video/` directory is a standalone HyperFrames project for the Simple Words marketing video.

From that directory, run `npm run dev` to preview, `npm run check` to lint, validate, and inspect, and `npm run render` to generate the MP4.

The committed render is `marketing-video/simplewords-marketing.mp4`.

## Releases

Releases are managed by release-please from conventional commits on `main`.

Release PRs update `package.json`, `package-lock.json`, and `extension/manifest.json`.

When a release is created, GitHub Actions builds the extension, packages `extension/` as `simplewords.zip`, and attaches the zip to the GitHub Release.

Chrome Web Store publishing runs only when the `SUBMIT_KEYS` GitHub secret is configured.

If `SUBMIT_KEYS` is missing, the workflow skips publishing and still creates the GitHub Release artifact.
