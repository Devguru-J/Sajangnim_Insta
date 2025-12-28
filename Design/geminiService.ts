
import { GoogleGenAI, Type } from "@google/genai";
import { BusinessType, Tone, Purpose } from "./types";

export const generateInstaContent = async (
  businessType: BusinessType,
  prompt: string,
  tone: Tone,
  purpose: Purpose
) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
  
  const systemInstruction = `
    You are an expert Instagram marketer specializing in small businesses like cafes and hair salons in Korea.
    Your goal is to write content that feels authentic, warm, and professional, avoiding obviously AI-generated or aggressive sales language.
    Use natural Korean spoken by shop owners (사장님).
    Include emojis where appropriate.
  `;

  const userPrompt = `
    Business Type: ${businessType}
    Main Content/Update: ${prompt}
    Tone Style: ${tone}
    Marketing Goal: ${purpose}
    
    Please generate:
    1. An engaging Instagram caption (minimum 4-5 sentences).
    2. A list of 10-15 relevant hashtags.
    3. Two short, catchy phrases for Instagram Stories.
    4. One question to encourage comments (Engagement question).
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: userPrompt,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          caption: { type: Type.STRING },
          hashtags: { 
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          storyPhrases: { 
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          engagementQuestion: { type: Type.STRING }
        },
        required: ["caption", "hashtags", "storyPhrases", "engagementQuestion"]
      }
    }
  });

  return JSON.parse(response.text);
};
