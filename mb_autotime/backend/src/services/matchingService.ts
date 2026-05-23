import pool from '../config/db.js';
import type { Matter, SuggestionRequest, SuggestionResponse } from '../models/timeEntryModel.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Safely initialize the Gemini client
const apiKey = process.env.GEMINI_API_KEY?.trim();
const genAI = apiKey && !apiKey.startsWith('your-') && !apiKey.startsWith('sk-') 
  ? new GoogleGenerativeAI(apiKey) 
  : null;

export async function getSuggestion(req: SuggestionRequest): Promise<SuggestionResponse> {
  const { activity_type, contact_name, subject = '' } = req;

  // 1. Fetch matters from DB (keep this fast)
  const { rows: matters }: { rows: Matter[] } = await pool.query('SELECT * FROM matters');

  try {
    if (!genAI) {
      throw new Error("No valid Gemini API key found.");
    }

    // 2. Use Lite model to save quota and increase speed
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });

    const matterContext = matters.map(m => 
      `ID:${m.matter_id} | Client:${m.client_name} | Desc:${m.matter_description}`
    ).join('\n');

    // 3. THE "ALL-IN-ONE" PROMPT
    const prompt = `You are a legal assistant. Match this activity to a matter and write a billing narration.

ACTIVITY: ${activity_type} with ${contact_name} regarding "${subject}"

MATTERS:
${matterContext}

TASK:
1. Pick the best Matter ID (or 0 if no match).
2. Write a 1-sentence professional billing narration (gerund-start, formal).
3. Give a short reason for the match.

OUTPUT FORMAT (JSON ONLY):
{
  "id": number,
  "narration": "string",
  "reason": "string",
  "confidence": "high" | "medium" | "low"
}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    
    // Clean markdown formatting if Gemini wraps the response in ```json ... ```
    const cleanJsonText = response.text().replace(/```json|```/g, '').trim();
    const data = JSON.parse(cleanJsonText);

    const matchedMatter = matters.find(m => m.matter_id === data.id) || null;

    return {
      suggested_matter: matchedMatter,
      narration: data.narration,
      confidence: data.confidence,
      match_reason: data.reason,
    };

  } catch (err: any) {
    console.warn("⚠️ AI Busy or Limit Hit, using fallback:", err.message);
    
    // 4. Basic fallback matching if API fails or rate-limits
    const fallbackMatter = matters.find(m => 
      m.client_name?.toLowerCase().includes(contact_name.toLowerCase()) ||
      contact_name.toLowerCase().includes(m.client_name?.toLowerCase())
    ) || null;

    return {
      suggested_matter: fallbackMatter,
      narration: `Attending to ${activity_type} with ${contact_name}${subject ? ` re ${subject}` : ''}.`,
      confidence: fallbackMatter ? 'medium' : 'low',
      match_reason: 'Fallback used due to API limits.'
    };
  }
}