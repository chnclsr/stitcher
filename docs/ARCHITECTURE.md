# Stitcher architecture

This guide reflects the current `developments` branch. Stitcher is a React/Vite web app packaged for Android with Capacitor. It processes captured or selected still images through the Stitcher proxy and fal. Segmentation is neither live nor on-device.

The [PR Lens source graph](diagrams/graph.json) generates the two diagrams below.

## Components

![Stitcher architecture: client, proxy, and fal service](diagrams/architecture.svg)

- **React client (`src/App.tsx`)** manages photo selection, review, optional object guidance, processing state, Asset/Sticker mode, and result actions.
- **Capture adapter (`src/platform/camera.ts`)** invokes Capacitor Camera on native Android. In the browser, the UI uses HTML file inputs for camera capture or choosing an image.
- **Cutout API client (`src/services/cutoutApi.ts`)** posts a `photo` multipart field and optional `targetObject` to `/api/remove-background`. It expects an `image/png` response and aborts after 135 seconds.
- **Express proxy (`backend/src/app.ts`)** keeps `FAL_KEY` server-side, validates uploads, applies rate limiting, calls fal, and returns the PNG with `Cache-Control: no-store`.
- **fal** receives the still image and runs `fal-ai/bria/background/remove`. When object guidance is supplied, the proxy passes a prompt to the model.
- **Output and platform adapters** preserve the transparent PNG for Asset mode or draw a white border in a client-side canvas for Sticker mode. Saving and sharing use browser APIs on web and Capacitor Filesystem/Share on Android.

## Request flow

![Sequence from photo upload through fal to the transparent PNG and client-side export](diagrams/capture-flow.svg)

1. The app captures or selects a still image and optionally collects an object description.
2. The client posts the image to `POST /api/remove-background`.
3. The proxy checks the upload, sends it through fal storage and inference, then downloads the returned PNG.
4. The proxy returns the transparent PNG; the app displays it on a checkerboard.
5. The app exports either the clean cutout or the locally outlined sticker through Save or Share.

## Proxy contract and limits

| Item | Behavior |
|---|---|
| `GET /health` | Returns `200 {"ok":true}` when `FAL_KEY` is configured; otherwise `503 {"ok":false}`. |
| `POST /api/remove-background` | Accepts multipart field `photo` (JPEG, PNG, or WebP) and optional text field `targetObject`. Returns transparent PNG bytes. |
| Upload limit | 10 MB by default. `MAX_UPLOAD_MB` is clamped to 1–20 MB. |
| Object guidance | Maximum 120 characters. |
| Rate limit | 12 remove requests per minute per client IP, stored in memory. |
| fal deadline | 120 seconds for upload, inference, and output retrieval. |
| Client deadline | 135 seconds. |

The development Vite server proxies `/api` to `http://localhost:8788`. Set `VITE_API_BASE_URL` when the frontend and proxy are hosted separately. Configure `APP_ORIGINS` for deployed frontend origins. Keep `FAL_KEY` in `backend/.env`; never put it in frontend variables, the Android package, or Git history.

## Platform behavior

- On Android, capture uses the Capacitor Camera plugin with orientation correction. The app writes saved output to `Documents` and writes shareable files to `Cache` before opening the native share sheet.
- In a browser, users can capture with the file input or choose an image. Save uses a download link. Share uses the Web Share API when file sharing is available.
- Processing needs network access. The original image is uploaded through the proxy to fal; this app does not perform local background removal.

## Production considerations

The current rate limiter is process-local; multiple proxy instances need a shared store. The in-memory multipart handling and default upload size are intended for this prototype. Before public deployment, define an image-retention policy, operational monitoring, and stronger abuse protections. See [backend setup and API details](../backend/README.md).
