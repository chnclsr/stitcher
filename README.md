# Stitcher

One tap turns a real-world object into a transparent, share-ready digital asset—without editing or switching apps.

## Hackathon MVP

Build one reliable flow:

1. Open a live CameraX preview.
2. Capture a photo.
3. Send the photo to the Stitcher proxy for background removal through fal.
4. Preview the transparent PNG on a checkerboard.
5. Save or share the result.

The MVP processes captured still images in the cloud. It does not perform live or on-device segmentation.

### Required features

- Camera permission and CameraX preview.
- One-tap capture and visible processing state.
- fal background removal through a server-side proxy.
- Transparent PNG preview with Asset and Sticker modes.
- Save to MediaStore and share through Android Sharesheet.
- Retry, timeout, and useful error states.

Defer live-video segmentation, accounts, cloud libraries, sticker-pack integrations, and advanced effects until the core flow works reliably.

## Architecture

| Layer | Choice |
| --- | --- |
| Android | Kotlin, Jetpack Compose, ViewModel, StateFlow |
| Camera | CameraX |
| Networking | Retrofit/OkHttp |
| Image loading | Coil |
| Background removal | fal `fal-ai/bria/background/remove` |
| Proxy | Node.js/TypeScript |
| Save and share | MediaStore, Android Sharesheet, FileProvider |

The app sends a captured JPEG to the proxy. The proxy calls fal with `FAL_KEY` held server-side. The app receives a transparent PNG, previews it, then saves or shares it.

## Build order

1. Verify fal returns a transparent cutout for the demo object.
2. Build the proxy endpoint and secure its API key.
3. Build the camera capture and upload flow.
4. Add the transparent preview, Asset/Sticker toggle, save, and share.
5. Add timeout, retry, and error states.
6. Rehearse the full flow on the demo phone before adding extras.

## Judging demo

Show the complete capture-to-share flow on a real Android phone. Explain the cloud processing honestly. Measure processing time and report the observed result rather than promising unverified latency.

Use a 2-minute demo: problem and user (20s), capture and processing (30s), transparent result (30s), save/share (20s), impact and next step (20s). Keep 1 minute for Q&A.

## Security and privacy

- Never put `FAL_KEY` in the Android app, APK, or Git history.
- Keep the key in the proxy environment.
- Tell users that the captured image is sent to fal for cloud processing.
- Limit upload size and validate image type in the proxy.

## Project status

Initial repository setup. Android and proxy implementation has not started.
