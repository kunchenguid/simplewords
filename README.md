# Simple Words

Simple Words is a Chrome extension that turns rough replies into friendly drafts using surrounding page context.

## Development

Install dependencies with `npm ci`.

Run `npm run build` before loading the extension locally or packaging it.

The built files `extension/background.js`, `extension/content.js`, `extension/options.js`, and `extension/chunks/` are generated artifacts and are not tracked in Git.

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
