# Stitcher proxy

Node.js proxy for fal background removal. It keeps `FAL_KEY` out of the Android app.

## Run

1. Install Node.js 22 or newer.
2. Run `npm install` in this folder.
3. Copy `.env.example` to `.env` and set `FAL_KEY`.
4. Run `npm run dev`.

The proxy listens on port 8787 by default. Do not commit `.env`.

## API

`POST /api/remove-background`

- Multipart field: `photo`
- Accepted media: JPEG, PNG, or WebP
- Maximum size: `MAX_UPLOAD_MB` (10 MB by default)
- Success: transparent PNG bytes with `Content-Type: image/png`
- Errors: JSON object with a safe message and HTTP status

`GET /health` returns `{ "ok": true }` when `FAL_KEY` is configured and `503 { "ok": false }` otherwise.

The remove endpoint allows 12 requests per minute per client IP. This prototype limiter uses in-memory state, so production deployments need a shared rate-limit store and stronger abuse controls.

For separate frontend/backend hosts, set `APP_ORIGINS` to a comma-separated list of exact frontend origins. Local Vite and Capacitor origins are allowed by default. If deployed behind a reverse proxy, set `TRUST_PROXY_HOPS` to its exact hop count so rate limits use the client IP. Leave it at `0` when directly exposed.

fal upload, inference, and result download share a 120-second deadline. The fal SDK does not expose upload cancellation, so a timed-out storage upload may finish in the background.

The Android app uploads a captured still image. The proxy uploads it to fal, calls `fal-ai/bria/background/remove`, downloads the transparent result, then returns the PNG. Processing requires network access.
