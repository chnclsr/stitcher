export type NormalizedPoint = { x: number; y: number };

type CroppedSelection = {
  photo: Blob;
  polygon: NormalizedPoint[];
};

export async function cropToPolygon(photo: Blob, points: NormalizedPoint[]): Promise<CroppedSelection> {
  const image = await loadImage(photo);
  const sourcePoints = points.map(({ x, y }) => ({ x: x * image.naturalWidth, y: y * image.naturalHeight }));
  const minX = Math.min(...sourcePoints.map(({ x }) => x));
  const minY = Math.min(...sourcePoints.map(({ y }) => y));
  const maxX = Math.max(...sourcePoints.map(({ x }) => x));
  const maxY = Math.max(...sourcePoints.map(({ y }) => y));
  const padding = Math.max(4, Math.round(Math.max(maxX - minX, maxY - minY) * 0.04));
  const left = Math.max(0, Math.floor(minX - padding));
  const top = Math.max(0, Math.floor(minY - padding));
  const right = Math.min(image.naturalWidth, Math.ceil(maxX + padding));
  const bottom = Math.min(image.naturalHeight, Math.ceil(maxY + padding));
  const width = Math.max(1, right - left);
  const height = Math.max(1, bottom - top);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not prepare the selected area.");

  context.beginPath();
  sourcePoints.forEach(({ x, y }, index) => {
    if (index === 0) context.moveTo(x - left, y - top);
    else context.lineTo(x - left, y - top);
  });
  context.closePath();
  context.clip();
  context.drawImage(image, -left, -top);

  const polygon = sourcePoints.map(({ x, y }) => ({ x: (x - left) / width, y: (y - top) / height }));
  return { photo: await canvasToPng(canvas), polygon };
}

export async function clipPngToPolygon(photo: Blob, points: NormalizedPoint[]): Promise<Blob> {
  const image = await loadImage(photo);
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not finish the selected cutout.");

  context.drawImage(image, 0, 0);
  context.globalCompositeOperation = "destination-in";
  context.beginPath();
  points.forEach(({ x, y }, index) => {
    if (index === 0) context.moveTo(x * canvas.width, y * canvas.height);
    else context.lineTo(x * canvas.width, y * canvas.height);
  });
  context.closePath();
  context.fill();
  return canvasToPng(canvas);
}

function loadImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read this photo."));
    };
    image.src = url;
  });
}

function canvasToPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Could not prepare the selected area."));
    }, "image/png");
  });
}
