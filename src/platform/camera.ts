import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { Capacitor } from "@capacitor/core";

export async function captureImage(): Promise<Blob | null> {
  if (Capacitor.isNativePlatform()) {
    const photo = await Camera.getPhoto({
      quality: 92,
      allowEditing: false,
      resultType: CameraResultType.Uri,
      source: CameraSource.Camera,
      correctOrientation: true,
    });
    if (!photo.webPath) throw new Error("Camera returned no image.");
    const response = await fetch(photo.webPath);
    return response.blob();
  }
  return null;
}
