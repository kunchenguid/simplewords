# Chrome Web Store assets

These files are prepared for the Chrome Web Store listing.
They reuse the Simple Words design system and key frames from `marketing-video/simplewords-marketing.mp4`.

## Upload files

- `store-icon-128.png` - store icon, 128 x 128.
- `screenshot-01-reply-faster.png` - screenshot, 1280 x 800.
- `screenshot-02-write-rough.png` - screenshot, 1280 x 800.
- `screenshot-03-click-button.png` - screenshot, 1280 x 800.
- `screenshot-04-refined-draft.png` - screenshot, 1280 x 800.
- `screenshot-05-replace-send.png` - screenshot, 1280 x 800.
- `small-promo-tile-440x280.png` - small promo tile, 440 x 280.
- `marquee-promo-tile-1400x560.png` - marquee promo tile, 1400 x 560.

## Source files

- `sources/*.svg` contains the editable layouts.
- `sources/render.html` is a headless Chrome helper for exporting the SVG layouts.
- `frames/*.jpg` contains the stills extracted from the marketing video.

The PNG exports are written as RGB images without an alpha channel.

## Regenerating exports

Re-extract any changed stills from `../marketing-video/simplewords-marketing.mp4` into `frames/*.jpg` before exporting PNGs.

From `chrome-web-store-assets`, use these frame timestamps:

```sh
ffmpeg -ss 7.100 -i ../marketing-video/simplewords-marketing.mp4 -frames:v 1 -vf scale=800:800 frames/01-email-reveal.jpg
ffmpeg -ss 10.367 -i ../marketing-video/simplewords-marketing.mp4 -frames:v 1 -vf scale=800:800 frames/02-rough-reply.jpg
ffmpeg -ss 12.100 -i ../marketing-video/simplewords-marketing.mp4 -frames:v 1 -vf scale=800:800 frames/03-click-button.jpg
ffmpeg -ss 16.200 -i ../marketing-video/simplewords-marketing.mp4 -frames:v 1 -vf scale=800:800 frames/04-refined-draft.jpg
ffmpeg -ss 21.100 -i ../marketing-video/simplewords-marketing.mp4 -frames:v 1 -vf scale=800:800 frames/05-replace-send.jpg
```

From `chrome-web-store-assets/sources`, serve the files and open `render.html?file=<source-name>` with headless Chrome.
For example, `render.html?file=screenshot-01-reply-faster` renders `screenshot-01-reply-faster.svg`.

Export each upload PNG at its listed size with Chrome's `--screenshot` and `--window-size` flags, then run `npm test` to verify the dimensions and RGB color type.
