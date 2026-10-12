import { Share } from "@capacitor/share";
import { Capacitor } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";

export async function shareImage(image: Blob): Promise<void> {
  const filename = `stitcher-${Date.now()}.png`;
  if (Capacitor.isNativePlatform()) {
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Could not prepare PNG for sharing."));
      reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
      reader.readAsDataURL(image);
    });
    const { uri } = await Filesystem.writeFile({ path: filename, data: base64, directory: Directory.Cache });
    await Share.share({ title: "My Stitcher cutout", files: [uri], dialogTitle: "Share your cutout" });
    return;
  }
  if (navigator.canShare?.({ files: [new File([image], filename, { type: "image/png" })] })) {
    await navigator.share({ files: [new File([image], filename, { type: "image/png" })], title: "My Stitcher cutout" });
    return;
  }
  throw new Error("File sharing is not available here. Download the PNG instead.");
}
