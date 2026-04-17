// 🚀 UX Improvement Phase 5: Helper utility to make requests to backend securely with Timeout/Loading handling
export const fetchWithTimeout = async (url: string, options: any, timeoutMs: number = 15000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    
    clearTimeout(id);
    
    if (!response.ok) {
      throw new Error("HTTP error " + response.status);
    }
    
    return await response.json();
  } catch (error: any) {
    clearTimeout(id);
    if (error.name === "AbortError") {
      throw new Error("Timeout");
    }
    throw error;
  }
};
