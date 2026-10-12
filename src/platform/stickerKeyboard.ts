import { Capacitor, registerPlugin } from "@capacitor/core";
import { saveImage } from "./save";

interface StickerKeyboardPlugin {
  addSticker(options: { base64: string }): Promise<{ message: string }>;
}

const StickerKeyboard = registerPlugin<StickerKeyboardPlugin>("StickerKeyboard");

export async function addStickerToKeyboard(image: Blob): Promise<{ message: string }> {
  if (!Capacitor.isNativePlatform()) {
    await saveImage(image);
    return { message: "Sticker downloaded. Install the stick.ai Android app to add it to its keyboard." };
  }

  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not prepare sticker for your keyboard."));
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.readAsDataURL(image);
  });
  return StickerKeyboard.addSticker({ base64 });
}
