# stick.ai

<div align="center">
  <p><strong>Turn the things around you into shareable cutouts.</strong></p>
  <p>Capture or choose a photo, name what should stay, then save or share a clean PNG.</p>
  <p><code>React</code> · <code>TypeScript</code> · <code>Capacitor</code> · <code>fal.ai</code></p>
</div>

<p align="center">
  <img src="docs/screenshots/stick-ai-home.png" alt="stick.ai home screen showing the capture, cutout, and share flow" width="100%">
</p>

> **Current processing:** stick.ai sends captured still images to fal through a secure proxy. Cutouts are cloud processed; live and on-device segmentation are not implemented.

## Make a cutout

1. **Capture** with your camera or choose a photo.
2. **Choose** the object with an optional hint, such as “the red mug near the back.”
3. **Share** a transparent PNG as a clean asset or a sticker with a white edge.

## How it works

![stick.ai architecture: camera and photo picker, React app, secure proxy, fal background removal, and save/share adapters](docs/diagrams/architecture.svg)

The proxy keeps `FAL_KEY` server-side. See the [architecture guide](docs/ARCHITECTURE.md) for API behavior and limits.

<details>
<summary>Object selection and recovery diagrams</summary>

An optional object hint travels with the photo. If processing fails, users can retry from review.

![Optional object hint sent through the proxy to fal](docs/diagrams/object-guidance.svg)

![Capture, review, processing, result, and retry states](docs/diagrams/capture-lifecycle.svg)

Editable diagram sources: [object guidance](docs/diagrams/object-guidance.html) · [app lifecycle](docs/diagrams/capture-lifecycle.html).
</details>

## Run locally

Install dependencies and start the web app:

```bash
npm install
npm run dev
```

Start the proxy in a second terminal. Configure `backend/.env` first; see [backend setup](backend/README.md).

```bash
cd backend
npm run dev
```

Vite forwards local `/api` requests to port 8788. Set `VITE_API_BASE_URL` when frontend and proxy use different hosts; leave it empty for same-origin deployment.

## Android

Open the project in Android Studio with JDK 17 or 21 and an installed Android SDK. Then run:

```bash
npm run android:sync
npm run android:open
```

Test camera, save, and share on a physical phone.

## Checks

```bash
npm run build
npm run build:proxy
npm run test:proxy
```

## Privacy

- Photos are uploaded to the stick.ai proxy and fal for processing. Confirm provider retention settings before public deployment.
- The proxy limits uploads to 10 MB, checks file signatures, and rate-limits requests to 12 per minute per client IP.
- Never put `FAL_KEY` in the web app, Android package, or Git history.
- Public deployment needs abuse controls and a clear image-retention policy.
