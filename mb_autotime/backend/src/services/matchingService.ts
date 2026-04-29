/**
 * matchingService.ts
 *
 * Given an activity (contact name, subject, activity type), find the most
 * likely matter from the database. Uses a tiered matching strategy:
 *
 *  Tier 1 – Exact client_name match        → confidence: high
 *  Tier 2 – Partial client_name match      → confidence: medium
 *  Tier 3 – matter_description keyword hit → confidence: medium
 *  Tier 4 – No match found                 → confidence: low, matter: null
 *
 * Attorneys can confirm/correct entries, and future versions can record those
 * corrections to improve per-attorney matching (GP training loop).
 */

import pool from '../config/db.js';
import type { Matter, SuggestionRequest, SuggestionResponse } from '../models/timeEntryModel.js';
import { generateNarration } from './narrationService.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalise(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
}

function tokenOverlap(a: string, b: string): number {
  const tokensA = new Set(normalise(a).split(/\s+/));
  const tokensB = new Set(normalise(b).split(/\s+/));
  let hits = 0;
  tokensA.forEach((t) => { if (tokensB.has(t)) hits++; });
  return hits;
}

// ─── Core matching logic ───────────────────────────────────────────────────────

async function findBestMatter(
  contactName: string,
  subject: string = ''
): Promise<{ matter: Matter | null; confidence: 'high' | 'medium' | 'low'; reason: string }> {
  const { rows: matters }: { rows: Matter[] } = await pool.query(
    'SELECT * FROM matters ORDER BY matter_id'
  );

  if (matters.length === 0) {
    return { matter: null, confidence: 'low', reason: 'No matters in database' };
  }

  // ── Tier 1: exact client name match ─────────────────────────────────────────
  const exactMatch = matters.find(
    (m) => m.client_name && normalise(m.client_name) === normalise(contactName)
  );
  if (exactMatch) {
    return {
      matter: exactMatch,
      confidence: 'high',
      reason: `Exact client match: "${exactMatch.client_name}"`,
    };
  }

  // ── Tier 2: partial client name (contact name contains client or vice versa) ─
  const partialMatch = matters.find((m) => {
    if (!m.client_name) return false;
    const nc = normalise(m.client_name);
    const nn = normalise(contactName);
    return nc.includes(nn) || nn.includes(nc);
  });
  if (partialMatch) {
    return {
      matter: partialMatch,
      confidence: 'medium',
      reason: `Partial client match: "${partialMatch.client_name}"`,
    };
  }

  // ── Tier 3: keyword overlap with matter description or subject ───────────────
  let bestScore = 0;
  let bestMatter: Matter | null = null;

  for (const matter of matters) {
    const descScore = matter.matter_description
      ? tokenOverlap(subject, matter.matter_description)
      : 0;
    const clientScore = matter.client_name
      ? tokenOverlap(contactName, matter.client_name)
      : 0;
    const score = descScore * 2 + clientScore; // weight description hits more

    if (score > bestScore) {
      bestScore = score;
      bestMatter = matter;
    }
  }

  if (bestMatter && bestScore > 0) {
    return {
      matter: bestMatter,
      confidence: 'medium',
      reason: `Keyword match (score ${bestScore}) on subject/description`,
    };
  }

  // ── Tier 4: no match ─────────────────────────────────────────────────────────
  return {
    matter: null,
    confidence: 'low',
    reason: 'No matching matter found — manual assignment required',
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function getSuggestion(
  req: SuggestionRequest
): Promise<SuggestionResponse> {
  const { activity_type, contact_name, subject = '', attorney_id } = req;

  const { matter, confidence, reason } = await findBestMatter(contact_name, subject);

  const narration = await generateNarration({
    activity_type,
    contact_name,
    subject,
    matter_description: matter?.matter_description ?? undefined,
    attorney_id,
  });

  return {
    suggested_matter: matter,
    narration,
    confidence,
    match_reason: reason,
  };
}