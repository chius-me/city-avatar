<div align="right">English | <a href="./README.zh.md">简体中文</a></div>

<div align="center">

<img src="./public/favicon.svg" width="56" height="56" alt="CITY Avatar">

# CITY Avatar

Turn any photo of a person, pet, or creature into a ***CITY THE ANIMATION*** official-style avatar with Cloudflare Workers AI.

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Deploy](https://github.com/chius-n/city-avatar/actions/workflows/deploy.yml/badge.svg)](https://github.com/chius-n/city-avatar/actions/workflows/deploy.yml)
![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-f38020?logo=cloudflare&logoColor=white)
![Workers AI](https://img.shields.io/badge/Workers%20AI-FLUX.2-f38020?logo=cloudflare&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6?logo=typescript&logoColor=white)

[Live Demo](https://avatar.city.chius.dev) · [CITY Social Map](https://social.city.chius.dev) · [Issues](https://github.com/chius-n/city-avatar/issues) · [Awesome CITY](https://github.com/chius-n/awesome-citytheanimation)

</div>

> Upload a portrait, a cat, or any creature photo and restyle it into the clean flat cel-shaded aesthetic of [`city-the-animation.com/character/`](https://city-the-animation.com/character/).
>
> Live site: **https://avatar.city.chius.dev**

![CITY Avatar Showcase](./docs/screenshot-showcase.webp)

![CITY Avatar Studio](./docs/screenshot-studio.webp)

## Features

- **Photo-to-CITY Stylization**: Upload a photo via file picker, drag-and-drop, or instant clipboard paste (`Ctrl+V` / `Cmd+V`), or try the built-in tabby cat and portrait samples.
- **Subject-Aware Conditioning**: Dedicated **Auto**, **Person**, and **Pet / Creature** modes preserve human hair/outfits and keep animals as expressive 2D anime creatures without human-face leakage.
- **Official C-I-T-Y Star & Sky Backdrops**: Choose from the four signature C-I-T-Y pastel five-point star cards (**Marigold `#f7b647`**, **Sakura `#f09cb4`**, **Meadow `#99cb77`**, **Coral `#ee847d`**) plus **Summer Sky** and **Sunset Clouds**, paired with **Official Icon**, **Storybook**, and **Manga Pop** render styles and expression presets.
- **Before/After Slider & Canvas Finishing**: Scrub across an interactive split-screen comparison view, switch between **Rounded**, **Circle**, and **Square** crops, pan/zoom on a crisp `1024×1024` canvas, optionally add CITY frames or captions, and export to PNG, WebP, or clipboard.
- **Local IndexedDB History & Adapted Visual Grammar**: Automatically keeps recent generations in the browser's IndexedDB (`My Gallery` slide-over drawer) and supports **中文 / EN / 日本語** switching inside an interface adapted from [*CITY THE ANIMATION*](https://city-the-animation.com/).

## How It Works

```text
Browser (React + Vite)
  ├── Resize upload to <=768px JPEG + create 180px thumbnail
  ├── Complete Cloudflare Turnstile (interaction-only)
  ├── POST /api/stylize ──▶ Cloudflare Worker
  │                           ├── Same-origin + image magic-bytes checks
  │                           ├── Edge burst RateLimit (STYLE_BURST_LIMITER)
  │                           ├── Turnstile server-side Siteverify
  │                           ├── SQLite Durable Object (QuotaGuard):
  │                           │   concurrency lock, per-IP credits & global budget
  │                           └── Workers AI FLUX.2 multipart inference
  │                               (flux-2-klein-4b / flux-2-klein-9b / flux-2-dev)
  └── Real-time 1024×1024 HTML5 Canvas masks, frames, Before/After slider & IndexedDB gallery
```

No external database is required. All image preparation, canvas decoration, and creation history live locally in the browser, while the Cloudflare Worker enforces security checks, coordinates daily quotas in SQLite Durable Objects, and runs multipart inference via `env.AI`.

## Quota & Abuse Protection

To protect Workers AI Neurons against automated scraping and cross-site abuse, `/api/stylize` enforces five layered defenses:

- **Cloudflare Turnstile**: Managed widget verification checked server-side against `siteverify` (`action` and production hostname validated).
- **Same-Origin & Payload Guard**: Rejects cross-origin `POST` requests without matching `Origin`/`Sec-Fetch-Site`, validates decoded PNG/JPEG/WebP magic bytes, and enforces a 4 MiB image / 6 MiB body cap.
- **Edge Burst Limiter**: Workers `ratelimits` binding (`STYLE_BURST_LIMITER`, 4 req / 60s per IP) drops rapid floods at the edge before verification or inference runs.
- **Weighted Daily Credits & Global Breaker (`QuotaGuard`)**: SQLite-backed Durable Object enforces 1 active request per IP, **12 credits / UTC day** per hashed IP (`4B` = 1 pt, `Dev` = 4 pts, `9B` = 5 pts) with automatic refunds on upstream failures, and a site-wide **8,500 Neurons / UTC day** ceiling.
- **Emergency Kill Switch**: Set `GENERATION_ENABLED="false"` in Worker vars to pause inference instantly without taking down the UI.

## Development & Deployment

Node.js 22+ and a Cloudflare account (with Workers AI and Durable Objects enabled) are required.

```bash
npm install
npx wrangler secret put TURNSTILE_SECRET
npm run dev        # Start local Vite + Cloudflare Workers dev server
npm run cf-typegen # Regenerate Worker binding types
npm run typecheck  # Run strict TypeScript checks
npm run build      # Type-check & build Worker + client bundle
npm run deploy     # Build and deploy to Cloudflare Workers
```

Pushing to `main` also triggers [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) to regenerate Worker types, build, and deploy automatically via repository secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` (`TURNSTILE_SECRET` remains stored as a Cloudflare Worker secret).

## Credits & Sources

- **Visual Aesthetic Reference**: [*CITY THE ANIMATION* Official Website](https://city-the-animation.com/) (`city-the-animation.com/character/`).
- **Curated Resources**: [`chius-n/awesome-citytheanimation`](https://github.com/chius-n/awesome-citytheanimation).
- **Sister Project**: [`chius-n/city-social-map`](https://github.com/chius-n/city-social-map) ([`social.city.chius.dev`](https://social.city.chius.dev)).
- **AI Inference**: Cloudflare Workers AI (`@cf/black-forest-labs/flux-2-klein-4b`, `flux-2-klein-9b`, `flux-2-dev`).

## 📄 License

Software source code in this repository is distributed under the [MIT License](LICENSE).

Unofficial fan-made creative tool. Original *CITY* characters, visual design, and intellectual property belong to © Keiichi Arawi · Kodansha / *CITY THE ANIMATION* Production Committee (Kyoto Animation).

---

<div align="center">
  <sub>Crafted with ❤️ by <a href="https://chius.cc">Chius</a> · Powered by Cloudflare & GitHub</sub>
</div>
