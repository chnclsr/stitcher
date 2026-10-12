import { fal } from "@fal-ai/client";
import cors from "cors";
import { rateLimit } from "express-rate-limit";
import express, { type ErrorRequestHandler } from "express";
import multer from "multer";

const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MODEL = "fal-ai/bria/background/remove";
const OUTPUT_LIMIT = 25 * 1024 * 1024;
const FAL_TIMEOUT_MS = 120_000;
const MAX_TARGET_LENGTH = 120;

export type RemoveBackground = (photo: Express.Multer.File, targetObject?: string) => Promise<Buffer>;

async function removeWithFal(photo: Express.Multer.File, targetObject?: string): Promise<Buffer> {
  const apiKey = process.env.FAL_KEY;
  if (!apiKey) throw new Error("FAL_KEY is not configured.");

  fal.config({ credentials: apiKey });
  const imageBytes = Uint8Array.from(photo.buffer);
  const file = new File([imageBytes], photo.originalname || "capture", {
    type: photo.mimetype,
  });
  const abortController = new AbortController();
  let timeout: ReturnType<typeof setTimeout>;
  const deadline = new Promise<never>((_resolve, reject) => {
    timeout = setTimeout(() => {
      abortController.abort();
      reject(new Error("fal request timed out."));
    }, FAL_TIMEOUT_MS);
  });
  try {
    const imageUrl = await Promise.race([fal.storage.upload(file), deadline]);
    const result = await Promise.race([
      fal.subscribe(MODEL, {
        input: {
          image_url: imageUrl,
          ...(targetObject ? { prompt: `Keep only ${targetObject}.` } : {}),
        },
        abortSignal: abortController.signal,
      }),
      deadline,
    ]);
    const response = await Promise.race([
      fetch(result.data.image.url, { signal: abortController.signal }),
      deadline,
    ]);
    if (!response.ok) throw new Error(`fal output download failed: ${response.status}`);

    const contentType = response.headers.get("content-type")?.split(";")[0];
    if (contentType !== "image/png") throw new Error("fal output was not a PNG.");
    const statedLength = Number(response.headers.get("content-length"));
    if (Number.isFinite(statedLength) && statedLength > OUTPUT_LIMIT) {
      throw new Error("fal output size is invalid.");
    }
    if (!response.body) throw new Error("fal output body was empty.");

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > OUTPUT_LIMIT) {
        await reader.cancel();
        throw new Error("fal output size is invalid.");
      }
      chunks.push(value);
    }
    if (total === 0) throw new Error("fal output body was empty.");
    return Buffer.concat(chunks, total);
  } finally {
    clearTimeout(timeout!);
  }
}

function hasImageSignature(photo: Express.Multer.File): boolean {
  const bytes = photo.buffer;
  if (photo.mimetype === "image/jpeg") {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (photo.mimetype === "image/png") {
    return bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  }
  if (photo.mimetype === "image/webp") {
    return bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
  }
  return false;
}

export function createApp(removeBackground: RemoveBackground = removeWithFal) {
  const configuredLimitMb = Number(process.env.MAX_UPLOAD_MB ?? 10);
  const limitMb = Number.isFinite(configuredLimitMb)
    ? Math.min(Math.max(configuredLimitMb, 1), 20)
    : 10;
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: limitMb * 1024 * 1024, files: 1 },
    fileFilter: (_request, file, done) => {
      if (!ACCEPTED_TYPES.has(file.mimetype)) {
        done(new Error("Unsupported image type."));
        return;
      }
      done(null, true);
    },
  });

  const app = express();
  app.disable("x-powered-by");
  const trustedProxyHops = Number(process.env.TRUST_PROXY_HOPS ?? 0);
  if (Number.isInteger(trustedProxyHops) && trustedProxyHops > 0 && trustedProxyHops <= 5) {
    app.set("trust proxy", trustedProxyHops);
  }
  const allowedOrigins = new Set([
    "http://localhost:5173",
    "http://localhost:4173",
    "https://localhost",
    "capacitor://localhost",
    ...(process.env.APP_ORIGINS ?? "").split(",").map((origin) => origin.trim()).filter(Boolean),
  ]);
  app.use(cors({ origin: (origin, done) => done(null, !origin || allowedOrigins.has(origin)) }));
  app.get("/health", (_request, response) => {
    const configured = Boolean(process.env.FAL_KEY);
    response.status(configured ? 200 : 503).json({ ok: configured });
  });
  app.post(
    "/api/remove-background",
    rateLimit({ windowMs: 60_000, limit: 12, standardHeaders: "draft-8", legacyHeaders: false }),
    upload.single("photo"),
    async (request, response) => {
      if (!request.file) {
        response.status(400).json({ error: "Attach an image in the photo field." });
        return;
      }
      if (!hasImageSignature(request.file)) {
        response.status(415).json({ error: "Image data does not match its file type." });
        return;
      }

      const rawTargetObject = request.body?.targetObject;
      if (rawTargetObject !== undefined && typeof rawTargetObject !== "string") {
        response.status(400).json({ error: "Object description must be plain text." });
        return;
      }
      const targetObject = rawTargetObject?.trim();
      if (targetObject && targetObject.length > MAX_TARGET_LENGTH) {
        response.status(400).json({ error: `Object description must be ${MAX_TARGET_LENGTH} characters or fewer.` });
        return;
      }

      try {
        const png = await removeBackground(request.file, targetObject || undefined);
        response
          .status(200)
          .set({ "Content-Type": "image/png", "Cache-Control": "no-store" })
          .send(png);
      } catch {
        response.status(502).json({ error: "Background removal failed. Try again." });
      }
    },
  );

  const handleUploadError: ErrorRequestHandler = (error, _request, response, _next) => {
    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      response.status(413).json({ error: `Image exceeds ${limitMb} MB.` });
      return;
    }
    if (error instanceof Error && error.message === "Unsupported image type.") {
      response.status(415).json({ error: "Use a JPEG, PNG, or WebP image." });
      return;
    }
    response.status(400).json({ error: "Invalid upload." });
  };

  app.use(handleUploadError);
  return app;
}
