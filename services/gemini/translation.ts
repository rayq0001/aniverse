import { fetchWithTimeout } from "./client";

export const translateText = async (
  text: string,
  targetLanguage: string = "Arabic"
) => {
  try {
    const data = await fetchWithTimeout("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, targetLanguage })
    });
    return data.text || text;
  } catch (err) {
    console.error("Translation error:", err);
    return text || "حدث خطأ";
  }
};

export const translateGenres = async (genres: string[]) => {
  if (!genres.length) return [];
  try {
    const data = await fetchWithTimeout("/api/translate-genres", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ genres })
    });
    return data.genres || genres;
  } catch (err) {
    console.error("Genres translation error:", err);
    return genres;
  }
};
