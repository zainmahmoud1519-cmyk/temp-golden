import { GoogleGenAI, Type } from "@google/genai";
import { AIAnalysisResult } from "../types";

// Safe initialization
const apiKey = process.env.API_KEY || '';
let ai: GoogleGenAI | null = null;

if (apiKey) {
  ai = new GoogleGenAI({ apiKey });
}

/**
 * Analyzes an email content for safety and summarization using Gemini
 */
export const analyzeEmailWithGemini = async (subject: string, body: string): Promise<AIAnalysisResult> => {
  if (!ai) {
    // Fallback if no API key
    return {
      summary: "لا يمكن التحليل (مفتاح API غير متوفر). هذا ملخص تجريبي.",
      safetyScore: 85,
      isPhishing: false,
      actionRequired: "لا يوجد إجراء مطلوب."
    };
  }

  try {
    // Ensure body is a string to prevent "substring is not a function" error
    const contentStr = typeof body === 'string' ? body : String(body || "");
    
    // Sanitize HTML slightly to avoid token bloat, though Gemini handles HTML well.
    const cleanBody = contentStr.substring(0, 5000); // Limit context window usage

    const prompt = `
      قم بتحليل محتوى البريد الإلكتروني التالي.
      الموضوع: ${subject}
      المحتوى (HTML/Text): ${cleanBody}
      
      المطلوب:
      1. ملخص قصير جداً للمحتوى (أقل من 30 كلمة).
      2. تقييم الأمان من 0 إلى 100 (100 آمن جداً).
      3. هل يبدو كبريد تصيد احتيالي؟
      4. ما الإجراء المقترح للمستخدم؟
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            safetyScore: { type: Type.NUMBER },
            isPhishing: { type: Type.BOOLEAN },
            actionRequired: { type: Type.STRING }
          }
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    return JSON.parse(text) as AIAnalysisResult;

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return {
      summary: "فشل التحليل بسبب خطأ تقني.",
      safetyScore: 0,
      isPhishing: false,
      actionRequired: "يرجى الحذر."
    };
  }
};