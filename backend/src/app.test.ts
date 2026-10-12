import assert from "node:assert/strict";
import { test } from "node:test";
import request from "supertest";
import { PNG } from "pngjs";
import { createApp } from "./app.js";

const transparentPng = (() => {
  const image = new PNG({ width: 1, height: 1 });
  image.data.set([255, 0, 0, 0]);
  return PNG.sync.write(image);
})();

test("health endpoint returns ready", async () => {
  const previousKey = process.env.FAL_KEY;
  process.env.FAL_KEY = "test-key";
  const response = await request(createApp()).get("/health");
  if (previousKey === undefined) delete process.env.FAL_KEY;
  else process.env.FAL_KEY = previousKey;
  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { ok: true });
});

test("local web origin can call the proxy from a browser", async () => {
  const response = await request(createApp()).get("/health").set("Origin", "http://localhost:5173");
  assert.equal(response.headers["access-control-allow-origin"], "http://localhost:5173");
});

test("health endpoint reports missing fal configuration", async () => {
  const previousKey = process.env.FAL_KEY;
  delete process.env.FAL_KEY;
  const response = await request(createApp()).get("/health");
  if (previousKey !== undefined) process.env.FAL_KEY = previousKey;
  assert.equal(response.status, 503);
  assert.deepEqual(response.body, { ok: false });
});

const jpegFixture = Buffer.from([0xff, 0xd8, 0xff, 0x00]);

test("remove endpoint passes through transparent PNG bytes", async () => {
  const response = await request(createApp(async () => transparentPng))
    .post("/api/remove-background")
    .attach("photo", jpegFixture, { filename: "cup.jpg", contentType: "image/jpeg" });

  assert.equal(response.status, 200);
  assert.equal(response.headers["content-type"], "image/png");
  const decoded = PNG.sync.read(response.body);
  assert.equal(decoded.data[3], 0);
});

test("remove endpoint passes an optional object description", async () => {
  let receivedTarget: string | undefined;
  const response = await request(createApp(async (_photo, targetObject) => {
    receivedTarget = targetObject;
    return transparentPng;
  }))
    .post("/api/remove-background")
    .field("targetObject", "  the red mug near the back  ")
    .attach("photo", jpegFixture, { filename: "room.jpg", contentType: "image/jpeg" });

  assert.equal(response.status, 200);
  assert.equal(receivedTarget, "the red mug near the back");
});

test("remove endpoint rejects oversized object descriptions", async () => {
  const response = await request(createApp(async () => transparentPng))
    .post("/api/remove-background")
    .field("targetObject", "x".repeat(121))
    .attach("photo", jpegFixture, { filename: "room.jpg", contentType: "image/jpeg" });

  assert.equal(response.status, 400);
  assert.match(response.body.error, /120 characters or fewer/i);
});

test("remove endpoint rejects a missing image", async () => {
  const response = await request(createApp()).post("/api/remove-background");
  assert.equal(response.status, 400);
  assert.match(response.body.error, /photo field/i);
});

test("remove endpoint returns safe error when fal call fails", async () => {
  const response = await request(createApp(async () => { throw new Error("private provider detail"); }))
    .post("/api/remove-background")
    .attach("photo", jpegFixture, { filename: "cup.jpg", contentType: "image/jpeg" });

  assert.equal(response.status, 502);
  assert.deepEqual(response.body, { error: "Background removal failed. Try again." });
});

test("remove endpoint rejects file data with a mismatched type", async () => {
  const response = await request(createApp(async () => transparentPng))
    .post("/api/remove-background")
    .attach("photo", Buffer.from("not an image"), { filename: "cup.jpg", contentType: "image/jpeg" });

  assert.equal(response.status, 415);
  assert.deepEqual(response.body, { error: "Image data does not match its file type." });
});

test("remove endpoint limits repeated requests", async () => {
  const app = createApp(async () => transparentPng);
  let response;
  for (let attempt = 0; attempt < 13; attempt += 1) {
    response = await request(app)
      .post("/api/remove-background")
      .attach("photo", jpegFixture, { filename: "cup.jpg", contentType: "image/jpeg" });
  }
  assert.equal(response?.status, 429);
});
