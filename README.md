# CashGlome — website

The landing page: plain HTML, CSS and JavaScript, with no framework, no build step, no trackers and no third-party requests (fonts are self-hosted).

## Run it locally

```bash
npx vite site --port 5180
```

Or open `index.html` through any static file server.

## Before publishing

Edit `CONFIG` at the top of `main.js`:

- `contact`: the inbox for "Request the deck" (currently a placeholder, `hello@cashglome.app`).
- `web`: where the web app is hosted (currently `app/`).
- `downloads`: one entry per platform. Set `status: 'available'` and a `url` when a build ships. The Windows link expects the installer at `downloads/CashGlome-Setup-4.0.0.exe`; it is not checked in, so upload it there (or point the URL at a GitHub release).

The button for the visitor's own platform is moved to the front automatically.

## Assets

`assets/` is generated from the app repo:

```bash
npx electron site/scripts/prepare-assets.cjs <folder-of-app-screenshots>
```

It copies the paintings (all public domain, from Wikimedia Commons), the app's fonts and icon, and turns the screenshots into JPEGs.

## Facts on the page

Every statistic on the page links to its source. The app answers shown in "Ask" are real answers from the app's built-in example month. Don't add user numbers or traction until they're real.
