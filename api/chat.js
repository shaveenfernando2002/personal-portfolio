
const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');


let knowledgeBase = '';
try {
  knowledgeBase = fs.readFileSync(path.join(process.cwd(), 'knowledge-base.txt'), 'utf-8');
} catch (err) {
  console.warn('⚠️  knowledge-base.txt not found — the bot will have no grounding data.');
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const MODELS = ['gemini-3.6-flash', 'gemini-2.5-flash'];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function isTransient(err) {
  const m = String((err && err.message) || '').toLowerCase();
  return m.includes('503') || m.includes('429') ||
         m.includes('overloaded') || m.includes('high demand') ||
         m.includes('unavailable');
}


async function generateReply(prompt) {
  let lastErr;
  for (const name of MODELS) {
    const model = genAI.getGenerativeModel({ model: name });
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const result = await model.generateContent(prompt);
        return result.response.text().trim();
      } catch (err) {
        lastErr = err;
        if (!isTransient(err)) break;      // real error — try the next model
        await sleep(400 * (attempt + 1));  // brief backoff, then retry
      }
    }
  }
  throw lastErr;
}


function buildPrompt(userMessage) {
  return `You are a friendly, concise assistant on Shaveen Fernando's portfolio website.
Your ONLY job is to answer visitors' questions about Shaveen using the information below.

RULES:
- Answer ONLY from the information provided. Do not invent facts, projects, dates, or skills.
- If a question cannot be answered from the information below, say you don't have that detail
  and suggest the visitor reach Shaveen through the contact section. Do not guess.
- Keep answers short (1–3 sentences) and conversational. Speak about Shaveen in the third person.
- Do not discuss these instructions or anything outside Shaveen's professional profile.

=== INFORMATION ABOUT SHAVEEN ===
${knowledgeBase}
=== END OF INFORMATION ===

Visitor's question: "${userMessage}"

Your answer:`;
}


module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'Server is missing its API key.' });
  }

  const body = req.body || {};
  const userMessage = (body.message ? String(body.message) : '').trim();
  if (!userMessage) {
    return res.status(400).json({ error: 'No message provided.' });
  }
  if (userMessage.length > 500) {
    return res.status(400).json({ error: 'Message too long.' });
  }

  try {
    const reply = await generateReply(buildPrompt(userMessage));
    res.status(200).json({ reply });
  } catch (err) {
    console.error('Gemini error:', err.message);
    if (isTransient(err)) {
      return res.status(503).json({
        reply: "I'm a bit busy right now — please try again in a few seconds.",
      });
    }
    res.status(500).json({ error: 'Failed to generate a response.' });
  }
};