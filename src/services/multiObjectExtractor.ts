export type ExtractedObject = {
  blob: Blob;
  width: number;
  height: number;
  pixelCount: number;
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
};

/**
 * Splits a transparent PNG containing multiple distinct objects into
 * individual cropped PNG blobs (one per object).
 */
export async function splitTransparentPngIntoObjects(
  pngBlob: Blob,
  options: {
    minPixelCount?: number;
    alphaThreshold?: number;
    padding?: number;
  } = {}
): Promise<Blob[]> {
  const {
    alphaThreshold = 15,
    padding = 12,
  } = options;

  const imageUrl = URL.createObjectURL(pngBlob);
  const image = new Image();
  image.src = imageUrl;

  try {
    await image.decode();
    const width = image.naturalWidth;
    const height = image.naturalHeight;

    if (width === 0 || height === 0) return [pngBlob];

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return [pngBlob];

    ctx.drawImage(image, 0, 0);
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    // 1. Identify foreground pixels and count total
    let totalForegroundPixels = 0;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] > alphaThreshold) {
        totalForegroundPixels++;
      }
    }

    if (totalForegroundPixels < 100) return [pngBlob];

    // Minimum component size to reject noise/dust:
    // At least 400 pixels or 0.7% of total foreground pixels
    const minComponentSize = options.minPixelCount ?? Math.max(350, Math.round(totalForegroundPixels * 0.007));

    // 2. Connected Component Labeling (8-connectivity BFS)
    const totalPixels = width * height;
    const labels = new Int32Array(totalPixels);
    const queue = new Int32Array(totalPixels);
    let currentLabel = 0;

    type RawComponent = {
      label: number;
      pixelCount: number;
      minX: number;
      maxX: number;
      minY: number;
      maxY: number;
    };

    const rawComponents: RawComponent[] = [];

    // 8-neighbor offsets
    const neighborDx = [-1, 0, 1, -1, 1, -1, 0, 1];
    const neighborDy = [-1, -1, -1, 0, 0, 1, 1, 1];

    for (let y = 0; y < height; y++) {
      const rowOffset = y * width;
      for (let x = 0; x < width; x++) {
        const idx = rowOffset + x;
        const alpha = data[idx * 4 + 3];

        if (alpha > alphaThreshold && labels[idx] === 0) {
          currentLabel++;
          let qHead = 0;
          let qTail = 0;
          queue[qTail++] = idx;
          labels[idx] = currentLabel;

          let count = 0;
          let minX = x;
          let maxX = x;
          let minY = y;
          let maxY = y;

          while (qHead < qTail) {
            const cur = queue[qHead++];
            count++;
            const cx = cur % width;
            const cy = Math.floor(cur / width);

            if (cx < minX) minX = cx;
            if (cx > maxX) maxX = cx;
            if (cy < minY) minY = cy;
            if (cy > maxY) maxY = cy;

            for (let k = 0; k < 8; k++) {
              const nx = cx + neighborDx[k];
              const ny = cy + neighborDy[k];

              if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                const nIdx = ny * width + nx;
                if (labels[nIdx] === 0 && data[nIdx * 4 + 3] > alphaThreshold) {
                  labels[nIdx] = currentLabel;
                  queue[qTail++] = nIdx;
                }
              }
            }
          }

          const boxWidth = maxX - minX + 1;
          const boxHeight = maxY - minY + 1;

          // Accept if big enough in area and size
          if (count >= minComponentSize && boxWidth >= 16 && boxHeight >= 16) {
            rawComponents.push({
              label: currentLabel,
              pixelCount: count,
              minX,
              maxX,
              minY,
              maxY,
            });
          }
        }
      }
    }

    // If 1 or 0 valid objects found, return the original
    if (rawComponents.length <= 1) {
      return [pngBlob];
    }

    // Sort objects horizontally (left to right) for intuitive ordering
    rawComponents.sort((a, b) => a.minX - b.minX);

    // 3. Extract each component into a cropped transparent PNG
    const extractedBlobs: Blob[] = [];

    for (const comp of rawComponents) {
      const cw = comp.maxX - comp.minX + 1;
      const ch = comp.maxY - comp.minY + 1;
      const pad = Math.max(8, Math.min(padding, Math.round(Math.min(cw, ch) * 0.04)));

      const outWidth = cw + pad * 2;
      const outHeight = ch + pad * 2;

      const outCanvas = document.createElement("canvas");
      outCanvas.width = outWidth;
      outCanvas.height = outHeight;
      const outCtx = outCanvas.getContext("2d");
      if (!outCtx) continue;

      const outImageData = outCtx.createImageData(outWidth, outHeight);
      const outData = outImageData.data;

      for (let y = comp.minY; y <= comp.maxY; y++) {
        const rowOffset = y * width;
        const dstY = y - comp.minY + pad;
        const dstRowOffset = dstY * outWidth;

        for (let x = comp.minX; x <= comp.maxX; x++) {
          const srcIdx = rowOffset + x;
          if (labels[srcIdx] === comp.label) {
            const dstX = x - comp.minX + pad;
            const dstIdx = (dstRowOffset + dstX) * 4;
            const srcByteIdx = srcIdx * 4;

            outData[dstIdx] = data[srcByteIdx];
            outData[dstIdx + 1] = data[srcByteIdx + 1];
            outData[dstIdx + 2] = data[srcByteIdx + 2];
            outData[dstIdx + 3] = data[srcByteIdx + 3];
          }
        }
      }

      outCtx.putImageData(outImageData, 0, 0);

      const blob = await new Promise<Blob | null>((resolve) => {
        outCanvas.toBlob((b) => resolve(b), "image/png");
      });

      if (blob) {
        extractedBlobs.push(blob);
      }
    }

    return extractedBlobs.length > 0 ? extractedBlobs : [pngBlob];
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}
