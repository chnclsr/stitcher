# stick.ai

**Make the things around you shareable.**

Take a photo, optionally name what should stay, and turn it into a transparent PNG.

**01 Capture** · **02 Choose an object** · **03 Save or share**

<img src="docs/screenshots/stick-ai-home.png" alt="stick.ai capture screen with the capture, cutout, and share flow" width="760">

> **Processing today:** photos are sent to fal through the proxy. Processing happens in the cloud; live and on-device segmentation are not implemented.

## Run locally

Start the web app:

```bash
npm install
npm run dev
```

In a second terminal, configure `backend/.env` with `FAL_KEY`, then start the proxy. It requires Node.js 22 or newer. See [proxy setup](backend/README.md).

```bash
cd backend
npm install
npm run dev
```

Vite forwards `/api` requests to port 8788. Set `VITE_API_BASE_URL` when app and proxy use different hosts. Leave it empty for same-origin use.

## Android

Open the project in Android Studio with JDK 17 or 21 and an Android SDK. Then sync and launch:

```bash
npm run android:sync
npm run android:open
```

Test camera, save, and share on a physical phone.

<details>
<summary>Architecture and app flows</summary>

![stick.ai architecture: camera and photo picker, React app, proxy, fal background removal, and save/share adapters](docs/diagrams/architecture.svg)

Optional hints help select objects in complex photos. Failed requests return to review for retry.

![Object hint flow through the proxy to fal](docs/diagrams/object-guidance.svg)

![Capture, review, processing, result, and retry states](docs/diagrams/capture-lifecycle.svg)

See the [architecture guide](docs/ARCHITECTURE.md) for API behavior and limits. Editable sources: [object guidance](docs/diagrams/object-guidance.html) · [app lifecycle](docs/diagrams/capture-lifecycle.html).
</details>

## Checks

```bash
npm run build
npm run build:proxy
npm run test:proxy
```

## Photo handling

- Photos go to the stick.ai proxy and fal for processing. Check provider retention settings before public deployment.
- Proxy allows uploads up to 10 MB and limits each client IP to 12 requests per minute.
- Keep `FAL_KEY` on the proxy. Never add it to the web app, Android package, or Git history.
- Public deployment needs stronger abuse controls and a clear image-retention policy.
