# Stitcher

<div align="center">
  <p><strong>Objects, made shareable.</strong></p>
  <p>Turn a real-world object into a transparent, share-ready asset in a few taps.</p>
  <p><sub>REACT · TYPESCRIPT · CAPACITOR · FAL.AI</sub></p>
</div>

> [!NOTE]
> Stitcher processes captured still images through fal in the cloud. It does not perform live or on-device segmentation.

## Current flow

1. Capture a photo with the device camera or choose an image.
2. Review it, then send it to the stick.ai proxy.
3. Preview the transparent PNG on a checkerboard.
4. Choose Asset or Sticker mode.
5. Download/save the PNG or open the native share sheet.

## 01 · System architecture

These diagrams describe the current implementation. See [the architecture guide](docs/ARCHITECTURE.md) for component details, API behavior, and limits. The editable source graph is in [`docs/diagrams/graph.json`](docs/diagrams/graph.json).

![Stitcher architecture: camera and photo picker, React app, secure Express proxy, fal background removal, and save/share adapters](docs/diagrams/architecture.svg)

![Stitcher data flow from captured image through fal background removal to a saved or shared PNG](docs/diagrams/capture-flow.svg)

## 02 · Object guidance

Complex photos can contain several objects. Add a short description such as “the red mug near the back”; Stitcher sends that optional hint through the proxy with the photo. The fal key stays server-side.

![Sequence diagram showing optional target text moving from Stitcher through the secure proxy to fal, then returning a transparent PNG](docs/diagrams/object-guidance.svg)

## 03 · App lifecycle

The review step lets users add a target description before processing. If background removal fails, they return to review and can retry with the same photo.

![Stitcher app states: capture, review with optional target text, processing, result, and recovery on failure](docs/diagrams/capture-lifecycle.svg)

## Stack

- React, TypeScript, Vite, responsive CSS
- Capacitor Camera, Filesystem, and Share plugins
- Node.js/TypeScript proxy with fal `fal-ai/bria/background/remove`
- `FAL_KEY` stays on the proxy server

Platform actions live in `src/platform/`. The UI calls `captureImage()`, `saveImage()`, and `shareImage()` rather than calling Capacitor directly.

## Run the web app

```bash
npm install
npm run dev
```

The cutout flow needs the proxy running too. In a second terminal, run `cd backend` then `npm run dev` (configure `backend/.env` first; see [backend/README.md](backend/README.md)). Vite forwards local `/api` requests to port 8788. Set `VITE_API_BASE_URL` to the deployed proxy URL when frontend and backend use different hosts. Leave it empty for a same-origin deployment.

## Android

Open the project in Android Studio with JDK 17 or 21 and an installed Android SDK, then run:

```bash
npm run android:sync
npm run android:open
```

Build and test camera, save, and share on a physical phone. This host has Java 25 and no Android SDK. Gradle 8.14.3 rejects the Java 25 class format, so APK packaging remains unverified here.

## Checks

```bash
npm run build
npm run build:proxy
npm run test:proxy
```

## Demo

Show the installed Android flow: problem (20s), capture and processing (30s), transparent result (30s), save/share (20s), impact and next step (20s). Keep one minute for Q&A. Report measured processing time. Explain that fal processes the captured image in the cloud.

## Privacy and limits

- The photo is sent to the stick.ai proxy and fal for processing.
- The proxy limits uploads to 10 MB by default, checks file signatures, and rate-limits requests to 12 per minute per client IP.
- Never put `FAL_KEY` in the web app, Android package, or Git history.
- Public deployment needs stronger abuse controls and an explicit image-retention policy.
