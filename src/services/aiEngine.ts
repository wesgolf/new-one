import { GoogleGenAI, Type } from "@google/genai";
import { Release, ContentItem, Goal, Todo } from "../types";

let _ai: GoogleGenAI | null = null;
function getAI(): GoogleGenAI {
  if (!_ai) {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("VITE_GEMINI_API_KEY is not set. Add it to your .env file.");
    }
    _ai = new GoogleGenAI({ apiKey });
  }
  return _ai;
}

export interface AIAnalysisResult {
  focusTrackId: string;
  focusRationale: string;
  signals: {
    type: 'momentum' | 'warning' | 'opportunity' | 'insight';
    title: string;
    description: string;
    action: string;
    impact: 'high' | 'medium' | 'low';
    category: 'Streaming' | 'Social' | 'General';
  }[];
  dailyTasks: {
    task: string;
    reason: string;
    priority: 'high' | 'medium' | 'low';
    category: 'Content' | 'Release' | 'Engagement' | 'Admin';
  }[];
}

export async function analyzeArtistState(
  releases: Release[],
  content: ContentItem[],
  goals: Goal[],
  todos: Todo[]
): Promise<AIAnalysisResult> {
  const prompt = `
    Analyze the current state of an independent artist and generate a strategic game plan.
    
    Releases: ${JSON.stringify(releases)}
    Content: ${JSON.stringify(content)}
    Goals: ${JSON.stringify(goals)}
    Todos: ${JSON.stringify(todos)}
    
    Current Date: ${new Date().toISOString()}
    
    Tasks:
    1. Select the "Focus Track" (the release that needs the most attention right now).
    2. Provide a rationale for why this track is the focus.
    3. Generate "Signals" (momentum, warnings, or insights) based on performance data and gaps.
    4. Generate 3-5 high-impact "Daily Tasks" for today.
    
    Be specific, strategic, and data-driven.
  `;

  const response = await getAI().models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          focusTrackId: { type: Type.STRING },
          focusRationale: { type: Type.STRING },
          signals: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING, enum: ['momentum', 'warning', 'opportunity', 'insight'] },
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                action: { type: Type.STRING },
                impact: { type: Type.STRING, enum: ['high', 'medium', 'low'] },
                category: { type: Type.STRING, enum: ['Streaming', 'Social', 'General'] }
              },
              required: ['type', 'title', 'description', 'action', 'impact', 'category']
            }
          },
          dailyTasks: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                task: { type: Type.STRING },
                reason: { type: Type.STRING },
                priority: { type: Type.STRING, enum: ['high', 'medium', 'low'] },
                category: { type: Type.STRING, enum: ['Content', 'Release', 'Engagement', 'Admin'] }
              },
              required: ['task', 'reason', 'priority', 'category']
            }
          }
        },
        required: ['focusTrackId', 'focusRationale', 'signals', 'dailyTasks']
      }
    }
  });

  return JSON.parse(response.text);
}
