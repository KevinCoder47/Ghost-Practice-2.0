/**
 * narrationService.ts
 *
 * Generates professional legal billing narrations using OpenAI.
 * Falls back to template-based narrations if the API key is not set
 * or the API call fails — so the app works out of the box without a key.
 */

import OpenAI from 'openai';

interface NarrationInput {
  activity_type: string;
  contact_name: string;
  subject?: string;
  matter_description?: string;
  attorney_id?: number;
}

// ─── Template fallbacks (no API key needed) ───────────────────────────────────

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

// ─── OpenAI narration ─────────────────────────────────────────────────────────

let openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.startsWith('sk-your')) {
    return null;
  }
  if (!openai) {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openai;
}

const SYSTEM_PROMPT = `You are a legal billing assistant for a South African law firm.
Your task is to write a single, professional billing narration entry.

Rules:
- Write ONE sentence only (max 25 words)
- Use formal legal language (e.g. "attending to", "perusing", "settling", "in connection with")
- Do NOT include time durations or matter numbers
- Do NOT use first-person ("I", "we")
- Start with a gerund (e.g. "Attending to...", "Drafting...", "Consulting...")
- Be specific but concise`;

async function aiNarration(input: NarrationInput): Promise<string> {
  const client = getOpenAIClient();
  if (!client) return templateNarration(input);

  const userPrompt = `Activity: ${input.activity_type}
Contact: ${input.contact_name}
${input.subject ? `Subject: ${input.subject}` : ''}
${input.matter_description ? `Matter: ${input.matter_description}` : ''}

Write the billing narration:`;

  try {
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 80,
      temperature: 0.3, // low temp = consistent, professional tone
    });

    const text = completion.choices[0]?.message?.content?.trim();
    return text ?? templateNarration(input);
  } catch (err) {
    console.warn('OpenAI narration failed, using template fallback:', err);
    return templateNarration(input);
  }
}

// ─── Public export ────────────────────────────────────────────────────────────

export async function generateNarration(input: NarrationInput): Promise<string> {
  return aiNarration(input);
}