# stick.ai — Tools, Plugins, and Repositories

**Report date:** 12 October 2026  
**Project:** stick.ai (repository name: `stitcher`)  
**Git branch:** `developments`

## Product summary

stick.ai turns a photo into a transparent cutout. Users can optionally describe which object to keep, choose asset or sticker styling, then save or share the result. Current segmentation runs in fal’s cloud through the project proxy; it is not live or on-device.

## Tools and purpose

| Tool | Purpose |
| --- | --- |
| OpenAI Codex | Plan and implement the app, update documentation, and debug the UI and mobile flow. |
| Codex review agents | Independently review README diagrams/layout, mobile UI behavior, animation, object guidance, and final changes. |
| Git | Track changes and commit project work on `developments`. |
| GitHub | Host and sync the project repository. |
| Node.js and npm | Run the Vite app and install/build frontend and proxy dependencies. Proxy requires Node.js 22+. |
| Android Studio, JDK, Android SDK | Build, install, and inspect the Capacitor Android app on a phone. |
| Browser / Unified Computer Use | Inspect the running local web app and responsive UI. |
| fal.ai BRIA Background Removal | Remove photo backgrounds and return transparent PNGs. Called only by the backend proxy. |

## App stack and plugins

### Frontend

- React 19, TypeScript, and Vite.
- Capacitor 8 for Android packaging.
- Capacitor Camera for photo capture and selection.
- Capacitor Filesystem for saving image files.
- Capacitor Share for native sharing.
- Project-specific Android `StickerKeyboard` Capacitor plugin and IME service for adding a sticker keyboard.
- Phosphor icons; Bricolage Grotesque and Nunito Sans fonts.

### Backend

- Node.js/TypeScript and Express proxy.
- `@fal-ai/client` calls `fal-ai/bria/background/remove`.
- Multer accepts image uploads; CORS configures allowed app origins; dotenv loads local settings; express-rate-limit limits requests.
- `FAL_KEY` stays in `backend/.env` on the server. It must not go into the web bundle or Android package.

### Codex skills and plugin status

- `design-taste-frontend`: local frontend design skill used to guide the visual redesign. Its upstream source is [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill).
- `caveman`: response-style skill used for concise communication. It does not affect the app runtime.
- No separate ADHD-specific plugin or other marketplace plugin installation is verified in the project. Capacitor plugins above are app dependencies, not Codex plugins.

## GitHub repositories

| Repository | Purpose | Project status |
| --- | --- | --- |
| [chnclsr/stitcher](https://github.com/chnclsr/stitcher) | Main stick.ai app, Android wrapper, backend proxy, docs, and diagrams. | Working branch: `developments`; current remote is `origin`. |
| [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill) | Upstream source for the frontend design skill. | Reference/source repository; not the app repository. |

## Data flow

1. User captures or selects a still photo and may enter an object hint.
2. The client uploads the photo and optional hint to the project proxy.
3. Proxy sends the image to fal.ai and receives a transparent PNG.
4. App previews the result and lets the user style, save, share, or add a sticker to the Android keyboard.

Processing needs network access. Proxy defaults include a 10 MB upload limit and 12 requests per minute per client IP. See [backend/README.md](backend/README.md) for configuration and deployment notes.

## Scope and verification notes

- The Android app uses captured still images; continuous live segmentation and on-device segmentation are not implemented.
- This report documents repository dependencies and work tools. It does not claim a fresh build or test run.
- Before deployment, review fal.ai retention settings and add production-grade abuse controls and an image-retention policy.
