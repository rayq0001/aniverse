import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase";
import { fetchWithTimeout } from "./client";

export const explainMangaPage = async (
  imageBase64: string,
  language: "ar" | "en" = "ar"
) => {
  try {
    const data = await fetchWithTimeout("/api/explain-page", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageBase64, language })
    }, 20000); // Vision parsing can be slightly longer
    return data.text || "حدث خطأ";
  } catch (err) {
    console.error("Vision Error:", err);
    return "حدث خطأ في تحليل الصورة";
  }
};

export const findMatchingManhwaByImage = async (
  base64: string,
  mimeType: string
) => {
  try {
    const snap = await getDocs(collection(db, "manhwas"));
    const list = snap.docs.map((d) => ({
      id: d.id,
      title: d.data().title,
      titleEn: d.data().titleEn,
    }));

    const data = await fetchWithTimeout("/api/find-matching", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ base64, mimeType, list })
    }, 20000);

    return data || {};
  } catch (err) {
    console.error("Visual Search Error:", err);
    return null;
  }
};
