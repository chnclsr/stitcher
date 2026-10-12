import { Directory, Filesystem } from "@capacitor/filesystem";
import { Capacitor } from "@capacitor/core";

export async function saveImage(image: Blob): Promise<void> {
  const filename = `stitcher-${Date.now()}.png`;
  if (Capacitor.isNativePlatform()) {
    const base64 = await blobToBase64(image);
    await Filesystem.writeFile({
      path: filename,
      data: base64,
      directory: Directory.Documents,
      recursive: true,
    });
    return;
  }

  const url = URL.createObjectURL(image);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not prepare PNG for saving."));
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.readAsDataURL(blob);
  });
}
