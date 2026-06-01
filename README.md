<h1 align="center">Simple Words</h1>
<p align="center">
  <a href="https://github.com/kunchenguid/simplewords/actions/workflows/ci.yml"
    ><img
      alt="CI"
      src="https://img.shields.io/github/actions/workflow/status/kunchenguid/simplewords/ci.yml?style=flat-square&label=ci"
  /></a>
  <a href="https://github.com/kunchenguid/simplewords/actions/workflows/release-please.yml"
    ><img
      alt="Release"
      src="https://img.shields.io/github/actions/workflow/status/kunchenguid/simplewords/release-please.yml?style=flat-square&label=release"
  /></a>
  <a
    href="https://chromewebstore.google.com/detail/simple-words/kmlhfcjpmhcoclpcghckibfkgpfbjfbb"
    ><img
      alt="Chrome Web Store"
      src="https://img.shields.io/badge/chrome%20web%20store-install-blue?style=flat-square"
  /></a>
  <a href="https://x.com/kunchenguid"
    ><img
      alt="X"
      src="https://img.shields.io/badge/X-@kunchenguid-black?style=flat-square"
  /></a>
  <a href="https://discord.gg/Wsy2NpnZDu"
    ><img
      alt="Discord"
      src="https://img.shields.io/discord/1439901831038763092?style=flat-square&label=discord"
  /></a>
</p>

<h3 align="center">Reply faster. Sound better.</h3>

<p align="center">
  <img
    alt="Simple Words turns a rough reply into a respectful draft"
    src="marketing-video/simplewords-marketing-square.gif"
    width="720"
  />
</p>

Turn a rough reply into a respectful draft before you send.
Say what you mean, click Simple Words, and keep the version that sounds like you meant it to sound.

Simple Words is a Chrome extension for the moments when your first pass is honest, but not quite ready to send.
It keeps the workflow inside the editor you are already using and calls the model provider you choose directly from your browser.

- **Rough reply in, respectful draft out** - Start with the messy version and refine it in place.
- **Reply where you already are** - Use Simple Words from the active editor on enabled mail domains.
- **Your provider, your settings** - Use OpenAI or a compatible endpoint, a Codex subscription, or a local Ollama server.

## Quick Start

1. Install Simple Words from the [Chrome Web Store](https://chromewebstore.google.com/detail/simple-words/kmlhfcjpmhcoclpcghckibfkgpfbjfbb).
2. Use the options page that opens after install to choose a model provider.
3. Write a rough reply in Gmail, Outlook, Yahoo Mail, iCloud Mail, Proton Mail, or another enabled domain.
4. Click **Simple Words**, review the refined draft, then click **Replace draft**.

## Install

**Chrome Web Store**

Install the published extension here:

```text
https://chromewebstore.google.com/detail/simple-words/kmlhfcjpmhcoclpcghckibfkgpfbjfbb
```

**From Source**

This project uses [pnpm](https://pnpm.io) (enable it with `corepack enable`).

```sh
git clone https://github.com/kunchenguid/simplewords.git
cd simplewords
pnpm install
pnpm run build
```

Then open `chrome://extensions`, enable **Developer mode**, click **Load unpacked**, and select the `extension/` directory.

## How It Works

```
┌──────────────────────┐
│ You write a rough    │
│ draft in an editor   │
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│ Simple Words detects │
│ a visible editable   │
│ field on an enabled  │
│ domain               │
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│ The floating button  │
│ sends your draft and │
│ page context to your │
│ selected provider    │
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│ You review the       │
│ refined reply and    │
│ decide whether to    │
│ replace the draft    │
└──────────────────────┘
```

- **Direct calls** - Requests go from your browser to your selected provider.
- **Scoped appearance** - The button only appears on websites in the enabled domain list.
- **Context-aware rewrites** - The extension includes visible page text near the editor so the model can understand the reply context.
- **Localized UI** - The extension UI supports English, Spanish, Chinese Simplified, Hindi, Arabic, Portuguese Brazil, French, German, Japanese, and Russian.

## Extension Reference

| Surface         | Description                                                                                                                                                  |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Floating button | Appears near focused editable fields on enabled domains, including empty drafts.                                                                             |
| Result panel    | Shows loading, setup or provider error guidance, and refined draft states with **Open settings**, **Replace draft**, and **Dismiss** actions as appropriate. |
| Options page    | Stores provider settings, writing instructions, name, and enabled domains in Chrome local storage.                                                           |

If the button or panel disappears after the extension reloads or updates while a mail tab is still open, refresh the active mail tab and try again.

### Provider Settings

| Provider                                       | Settings                                                                                                                  |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| OpenAI (or a compatible endpoint) with API Key | API key, base URL, model, and reasoning effort.                                                                           |
| Codex subscription                             | Sign in with Codex in the options page, or use `~/.codex/auth.json` as a fallback. Base URL, model, and reasoning effort. |
| Ollama                                         | Local base URL and model.                                                                                                 |

## Configuration

Simple Words stores configuration in `chrome.storage.local`.
There is no hosted Simple Words backend in the request path.

| Setting         | Default                                                                                                       |
| --------------- | ------------------------------------------------------------------------------------------------------------- |
| Provider        | `openai`                                                                                                      |
| OpenAI base URL | `https://api.openai.com/v1`                                                                                   |
| OpenAI model    | `gpt-5.5`                                                                                                     |
| Codex base URL  | `https://chatgpt.com/backend-api/codex`                                                                       |
| Codex model     | `gpt-5.5-fast`                                                                                                |
| Ollama base URL | `http://localhost:11434/v1`                                                                                   |
| Ollama model    | `gemma4`                                                                                                      |
| Enabled domains | `mail.google.com`, `outlook.live.com`, `outlook.office.com`, `mail.yahoo.com`, `icloud.com`, `mail.proton.me` |

## Development

```sh
pnpm install # Install dependencies
pnpm exec playwright install --with-deps chromium # Install Playwright Chromium
pnpm run build # Type-check and bundle the extension files
pnpm test # Run Vitest
pnpm run test:e2e # Run Playwright browser tests
pnpm run lint # Run ESLint
pnpm run format:check # Check formatting
pnpm run check # Run format, lint, Vitest, build, and browser tests
```

`pnpm run test:e2e` launches the extension in headed Chromium, so it requires a graphical display.

The built files `extension/background.js`, `extension/content.js`, `extension/options.js`, and `extension/chunks/` are generated artifacts and are not tracked in Git.

When changing static extension copy, update `src/i18n.ts` and every `extension/_locales/*/messages.json` file with matching keys and preserved substitutions such as `$1`.
For `extensionDescription`, also keep `package.json` aligned with the English locale message.
