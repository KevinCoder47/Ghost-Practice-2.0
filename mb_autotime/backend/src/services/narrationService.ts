import { GoogleGenerativeAI } from '@google/generative-ai';

interface NarrationInput {
  activity_type: string;
  contact_name: string;
  subject?: string;
  matter_description?: string;
  attorney_id?: number;
}

// ─── Template fallbacks ───────────────────────────────────────────────────────
const TEMPLATES: Record<string, (input: NarrationInput) => string> = {
  email: ({ contact_name, subject, matter_description }) =>
    `Attending to correspondence ${subject ? `re ${subject} ` : ''}with ${contact_name}${matter_description ? ` in connection with ${matter_description}` : ''}.`,
  call: ({ contact_name, subject, matter_description }) =>
    `Telephone conference with ${contact_name}${subject ? ` re ${subject}` : ''}${matter_description ? ` in connection with ${matter_description}` : ''}.`,
  meeting: ({ contact_name, subject, matter_description }) =>
    `Attending consultation with ${contact_name}${subject ? ` re ${subject}` : ''}${matter_description ? ` — ${matter_description}` : ''}.`,
  draft: ({ subject, matter_description }) =>
    `Drafting and settling ${subject ?? 'legal document'}${matter_description ? ` in connection with ${matter_description}` : ''}.`,
  review: ({ subject, matter_description }) =>
    `Perusing and considering ${subject ?? 'documents'}${matter_description ? ` re ${matter_description}` : ''}.`,
  research: ({ subject, matter_description }) =>
    `Conducting legal research${subject ? ` re ${subject}` : ''}${matter_description ? ` in connection with ${matter_description}` : ''}.`,
  court: ({ subject, matter_description }) =>
    `Appearing in court${subject ? ` re ${subject}` : ''}${matter_description ? ` — ${matter_description}` : ''}.`,
  consultation: ({ contact_name, subject, matter_description }) =>
    `Consultation with ${contact_name}${subject ? ` re ${subject}` : ''}${matter_description ? ` — ${matter_description}` : ''}.`,
};

function templateNarration(input: NarrationInput): string {
  const key = input.activity_type.toLowerCase();
  const template = TEMPLATES[key] ?? TEMPLATES['email'];
  return template(input);
}

// ─── Gemini narration ─────────────────────────────────────────────────────────

let genAI: GoogleGenerativeAI | null = null;

function getGeminiClient(): GoogleGenerativeAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey.startsWith('your-') || apiKey.startsWith('sk-')) {
    return null;
  }
  if (!genAI) {
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

const SYSTEM_INSTRUCTION = `You are a legal billing assistant for a South African law firm.
Task: Write a ONE sentence professional billing narration.
Rules:
- Max 25 words.
- Start with a gerund (e.g. "Attending to", "Perusing", "Drafting").
- Use formal language.
- NO preamble, NO quotes.`;

async function aiNarration(input: NarrationInput): Promise<string> {
  const client = getGeminiClient();
  if (!client) return templateNarration(input);

  try {
    // FIX: Using the verified model string from your diagnostic list
    const model = client.getGenerativeModel({ 
      model: "gemini-2.0-flash" 
    });

    const prompt = `System: ${SYSTEM_INSTRUCTION}
    
Activity: ${input.activity_type}
Contact: ${input.contact_name}
Subject: ${input.subject ?? 'N/A'}
Description: ${input.matter_description ?? 'N/A'}

Write the billing narration:`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();
    
    return text.length > 5 ? text : templateNarration(input);
  } catch (err: any) {
    console.error('❌ Gemini Error:', err.message);
    return templateNarration(input);
  }
}

export async function generateNarration(input: NarrationInput): Promise<string> {
  return aiNarration(input);
}