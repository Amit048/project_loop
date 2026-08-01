import { GoogleGenAI } from "@google/genai";

// ─── Server-side only. The API key NEVER reaches the browser. ──────────────
const genAI = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  : null;

const MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

function stripMarkdownFences(text) {
  let cleaned = text
    .trim()
    .replace(/^```(json)?/i, "")
    .replace(/```$/, "")
    .trim();

  // Gemini occasionally prepends/appends stray text around the JSON object
  // (a short preamble, a trailing note) even when told not to. Extract just
  // the outermost {...} block rather than assuming the whole string is JSON.
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }

  return cleaned;
}

async function callGemini({ system, prompt, maxTokens = 1024 }) {
  if (!genAI) {
    throw new Error(
      "GEMINI_API_KEY is not configured on the server. Add it to backend/.env"
    );
  }
  const response = await genAI.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      systemInstruction: system,
      maxOutputTokens: maxTokens,
    },
  });

  return response.text ?? "";
}

// ─── AI1: Auto-classification (Day 18) ──────────────────────────────────────
// Returns strict JSON: sentiment, sentimentScore, themes[], featureArea.
// Retries once on a parse failure before giving up.
export const classifyFeedback = async (content, existingThemeNames = []) => {
  const system = `You are a customer-feedback classification engine for a B2B SaaS product.
Return ONLY valid JSON, no markdown fences, no commentary, matching exactly this shape:
{"sentiment":"POS|NEU|NEG","sentimentScore":-1..1,"themes":["..."],"featureArea":"...","rationale":"one short sentence"}
Reuse an existing theme name whenever the feedback clearly fits one. Only propose a new theme
name if nothing existing fits. Existing themes: ${JSON.stringify(existingThemeNames)}`;

  const prompt = `Classify this customer feedback:\n"""${content}"""`;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const raw = await callGemini({ system, prompt, maxTokens: 300 });
      const parsed = JSON.parse(stripMarkdownFences(raw));

      if (
        !["POS", "NEU", "NEG"].includes(parsed.sentiment) ||
        typeof parsed.sentimentScore !== "number" ||
        !Array.isArray(parsed.themes)
      ) {
        throw new Error("Shape mismatch in AI classification response");
      }
      return parsed;
    } catch (err) {
      console.error(
        `classifyFeedback attempt ${attempt + 1} failed:`,
        err.message
      );
      if (attempt === 1) {
        // Flag for manual review rather than crash the ingestion pipeline
        return {
          sentiment: "UNCLASSIFIED",
          sentimentScore: 0,
          themes: [],
          featureArea: "",
          rationale: "AI classification failed — flagged for manual review",
        };
      }
    }
  }
};

// ─── AI3: Retrieval-grounded Q&A (Ask LOOP) (Day 23) ────────────────────────
// contextItems: [{ id, content, sentiment, channel }]
export const answerFromFeedback = async (question, contextItems) => {
  if (!contextItems.length) {
    return {
      answer:
        "There isn't enough feedback in the workspace yet to answer that question.",
      usedFeedbackIds: [],
    };
  }

  const system = `You are Ask LOOP, a retrieval-grounded assistant. You must answer ONLY using
the feedback items provided below — never invent feedback that isn't listed. If the provided
items don't contain the answer, say so plainly. Return ONLY valid JSON:
{"answer":"...", "usedFeedbackIds":["id1","id2"]}`;

  const context = contextItems
    .map((c) => `[${c.id}] (${c.channel}, ${c.sentiment}): ${c.content}`)
    .join("\n");

  const prompt = `Feedback items:\n${context}\n\nQuestion: ${question}`;

  if (!genAI) {
    return {
      answer:
        "Ask LOOP needs a GEMINI_API_KEY configured on the server before it can answer questions. Add one to backend/.env and restart the server.",
      usedFeedbackIds: [],
    };
  }

  const raw = await callGemini({ system, prompt, maxTokens: 700 });
  try {
    return JSON.parse(stripMarkdownFences(raw));
  } catch {
    return { answer: raw, usedFeedbackIds: contextItems.map((c) => c.id) };
  }
};

// ─── AI4: Voice-of-Customer report narrative (Day 25) ───────────────────────
// stats are pre-computed in code (see reportController) so the model writes
// prose around real numbers instead of inventing figures.
export const generateReportNarrative = async (stats) => {
  const system = `You write a concise, professional Voice-of-Customer report narrative for a
Head of Product. Use only the numbers and quotes given — never invent statistics. Return ONLY
valid JSON: {"narrative":"...", "recommendedActions":["...", "..."]}`;

  const prompt = `Period stats:\n${JSON.stringify(stats, null, 2)}`;

  if (!genAI) {
    return {
      narrative:
        "AI narrative generation is unavailable — GEMINI_API_KEY is not configured on the server. The stats below are still real and computed from your data; add a key to backend/.env to get an AI-written summary.",
      recommendedActions: [],
    };
  }

  try {
    const raw = await callGemini({ system, prompt, maxTokens: 900 });
    try {
      return JSON.parse(stripMarkdownFences(raw));
    } catch {
      return { narrative: raw, recommendedActions: [] };
    }
  } catch (err) {
    console.log("generateReportNarrative failed:", err.message);
    return {
      narrative:
        "AI narrative generation failed for this report (the API call errored — check the backend terminal for details, e.g. quota limits). The stats above are still real and computed directly from your data.",
      recommendedActions: [],
    };
  }
};

export default { classifyFeedback, answerFromFeedback, generateReportNarrative };