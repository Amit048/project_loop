import crypto from "crypto";

// ─── Embedding provider ─────────────────────────────────────────────────────
// Pluggable: if VOYAGE_API_KEY (Anthropic's recommended embeddings partner)
// is configured, use it. Otherwise fall back to a deterministic local
// hashing-trick embedding so semantic search works out of the box in dev/demo
// without requiring a second API key.
const VECTOR_SIZE = 256;

function localHashEmbedding(text) {
  const vector = new Array(VECTOR_SIZE).fill(0);
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  for (const token of tokens) {
    const hash = crypto.createHash("md5").update(token).digest();
    const idx = hash.readUInt32BE(0) % VECTOR_SIZE;
    const sign = hash[4] % 2 === 0 ? 1 : -1;
    vector[idx] += sign;
  }

  // L2-normalize so cosine similarity behaves well
  const norm = Math.sqrt(vector.reduce((s, v) => s + v * v, 0)) || 1;
  return vector.map((v) => v / norm);
}

async function voyageEmbedding(text) {
  const res = await fetch("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.VOYAGE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ input: [text], model: "voyage-3" }),
  });
  const json = await res.json();
  return json.data[0].embedding;
}

export const embedText = async (text) => {
  if (process.env.VOYAGE_API_KEY) {
    try {
      return await voyageEmbedding(text);
    } catch (err) {
      console.error("Voyage embedding failed, falling back to local hash:", err.message);
    }
  }
  return localHashEmbedding(text);
};

export const cosineSimilarity = (a, b) => {
  const len = Math.min(a.length, b.length);
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
};

// Returns the top-K embedding docs most similar to the query vector.
export const topKSimilar = (queryVector, embeddingDocs, k = 5) => {
  return embeddingDocs
    .map((doc) => ({ doc, score: cosineSimilarity(queryVector, doc.vector) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
};

export default { embedText, cosineSimilarity, topKSimilar };
