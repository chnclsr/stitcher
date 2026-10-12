import { Share } from "@capacitor/share";
import { Capacitor } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { saveImage } from "./save";

export async function shareImage(image: Blob): Promise<"shared" | "downloaded"> {
  const filename = `stick-ai-${Date.now()}.png`;
  if (Capacitor.isNativePlatform()) {
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Could not prepare PNG for sharing."));
      reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
      reader.readAsDataURL(image);
    });
    const { uri } = await Filesystem.writeFile({ path: filename, data: base64, directory: Directory.Cache });
    await Share.share({ title: "My stick.ai cutout", files: [uri], dialogTitle: "Share your cutout" });
    return "shared";
  }

  const file = new File([image], filename, { type: "image/png" });
  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "My stick.ai cutout" });
      return "shared";
    } catch (error) {
      // A dismissed share sheet is a deliberate cancel; don't unexpectedly download.
      if (error instanceof DOMException && error.name === "AbortError") throw error;
    }
  }

  await saveImage(image);
  return "downloaded";
}
