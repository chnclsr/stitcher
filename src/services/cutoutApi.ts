const apiBase = import.meta.env.VITE_API_BASE_URL ?? "";

export async function removeBackground(photo: Blob, targetObject = ""): Promise<Blob> {
  const form = new FormData();
  form.append("photo", photo, "stitcher-capture.jpg");
  if (targetObject.trim()) form.append("targetObject", targetObject.trim());

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 135_000);
  try {
    const response = await fetch(`${apiBase}/api/remove-background`, {
      method: "POST",
      body: form,
      signal: controller.signal,
    });
    if (!response.ok) {
      const detail = await response.json().catch(() => null) as { error?: string } | null;
      throw new Error(detail?.error ?? "Could not remove background. Try again.");
    }
    const result = await response.blob();
    if (result.type !== "image/png") throw new Error("Server did not return a transparent PNG.");
    return result;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("This is taking too long. Check your connection and try again.");
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}
