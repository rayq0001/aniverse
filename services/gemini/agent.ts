import { fetchWithTimeout } from "./client";

export const runSmartAgent = async (
  userMessage: string,
  context: any,
  history: any[] = [],
  language: "ar" | "en" = "ar"
) => {
  try {
    const data = await fetchWithTimeout("/api/agent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userMessage, context, history, language })
    });
    return {
      text: data.text,
      functionCalls: data.functionCalls,
    };
  } catch (error) {
    console.error("Agent Error:", error);
    return {
      text:
        language === "ar"
          ? "حدث خطأ فني (أو انتهى وقت الطلب)، حاول مرة أخرى."
          : "Technical error or timeout, try again.",
    };
  }
};

export const getDeepManhwaAnalysis = async (
  title: string,
  description: string,
  comments: string[],
  language: "ar" | "en" = "ar"
) => {
  try {
    const data = await fetchWithTimeout("/api/analyze-manhwa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description, comments, language }),
    }, 30000); // 30s timeout for deep analysis

    return data.text || (language === "ar" ? "حدث خطأ" : "Error");
  } catch (err) {
    console.error("Analysis Error:", err);
    return language === "ar" ? "حدث خطأ في التحليل العميق" : "Analysis Error";
  }
};

export const analyzeChapterAI = async (
  title: string,
  chapterNumber: number,
  language: "ar" | "en" = "ar"
) => {
  try {
    const data = await fetchWithTimeout("/api/analyze-chapter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, chapterNumber, language })
    });
    return data.text || "حدث خطأ";
  } catch (err) {
    console.error("Chapter analysis Error:", err);
    return "حدث خطأ في تحليل الفصل";
  }
};
