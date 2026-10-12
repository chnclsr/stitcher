const apiBase = import.meta.env.VITE_API_BASE_URL ?? "";

export async function removeBackground(photo: Blob, targetObject = ""): Promise<Blob> {
  const form = new FormData();
  form.append("photo", photo, "stick-ai-capture.jpg");
  if (targetObject.trim()) form.append("targetObject", targetObject.trim());

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 135_000);
  try {
    let response: Response;
    try {
      response = await fetch(`${apiBase}/api/remove-background`, {
        method: "POST",
        body: form,
        signal: controller.signal,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new Error("This is taking too long. Check your connection and try again.");
      }
      if (error instanceof TypeError) {
        throw new Error("Couldn’t reach the cutout service. Check your connection and try again.");
      }
      throw error;
    }
    if (!response.ok) {
      const detail = await response.json().catch(() => null) as { error?: string } | null;
      throw new Error(detail?.error ?? "Could not remove background. Try again.");
    }
    const result = await response.blob();
    if (result.type !== "image/png") throw new Error("Server did not return a transparent PNG.");
    return result;
  } finally {
    window.clearTimeout(timeout);
  }
}
