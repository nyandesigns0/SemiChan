export async function handleFileUpload(file: File): Promise<{ id: string; data: string; type: "file" }> {
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

  return {
    id: `${file.name}-${file.size}-${Date.now()}`,
    data: base64,
    type: "file",
  };
}

export async function validateImageUrl(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: "HEAD" });
    const contentType = res.headers.get("content-type") ?? "";
    return res.ok && contentType.startsWith("image/");
  } catch (error) {
    console.warn("Failed to validate image url", error);
    return false;
  }
}

export async function loadImageFromUrl(url: string): Promise<{ id: string; data: string; type: "url" }> {
  return {
    id: `${url}-${Date.now()}`,
    data: url,
    type: "url",
  };
}
