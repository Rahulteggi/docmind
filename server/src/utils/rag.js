const OpenAI = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Split text into overlapping chunks
function chunkText(text, chunkSize = 500, overlap = 50) {
  const words = text.split(/\s+/);
  const chunks = [];
  let i = 0;
  while (i < words.length) {
    const chunk = words.slice(i, i + chunkSize).join(' ');
    if (chunk.trim().length > 20) chunks.push(chunk);
    i += chunkSize - overlap;
  }
  return chunks;
}

// Cosine similarity between two vectors
function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-10);
}

// Get embeddings for an array of texts (batch)
async function embedTexts(texts) {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: texts,
  });
  return response.data.map((d) => d.embedding);
}

// Get embedding for a single query
async function embedQuery(text) {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: [text],
  });
  return response.data[0].embedding;
}

// Find top-k most similar chunks
function findTopChunks(queryEmbedding, chunks, k = 4) {
  return chunks
    .map((chunk, i) => ({ ...chunk, index: i, score: cosineSimilarity(queryEmbedding, chunk.embedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}

// Generate answer using GPT with retrieved context
async function generateAnswer(question, contextChunks, conversationHistory = []) {
  const context = contextChunks.map((c, i) => `[Source ${i + 1}, Page ${c.pageNum}]:\n${c.text}`).join('\n\n');

  const messages = [
    {
      role: 'system',
      content: `You are DocMind, an intelligent document assistant. Answer questions based ONLY on the provided document context.
Be concise, accurate, and cite sources like [Source 1], [Source 2] when referencing specific parts.
If the answer isn't in the context, say "I couldn't find that information in the document."`,
    },
    ...conversationHistory.slice(-6).map((m) => ({ role: m.role, content: m.content })),
    {
      role: 'user',
      content: `Context from document:\n${context}\n\nQuestion: ${question}`,
    },
  ];

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages,
    max_tokens: 600,
    temperature: 0.3,
  });

  return response.choices[0].message.content;
}

// Summarize a document
async function summarizeDocument(text) {
  const truncated = text.slice(0, 6000);
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'Summarize this document in 2-3 sentences, capturing the main topic and key points.' },
      { role: 'user', content: truncated },
    ],
    max_tokens: 200,
  });
  return response.choices[0].message.content;
}

module.exports = { chunkText, embedTexts, embedQuery, findTopChunks, generateAnswer, summarizeDocument };
