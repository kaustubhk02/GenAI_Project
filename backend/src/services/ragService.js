const env = require('../config/env');
const SchemeChunk = require('../models/SchemeChunk');
const Scheme = require('../models/Scheme');
const EligibilityResult = require('../models/EligibilityResult');
const FarmerProfile = require('../models/FarmerProfile');

const { GoogleGenerativeAI } = require('@google/generative-ai');

const LANGUAGE_LABELS = {
  MARATHI: 'Marathi (मराठी)',
  HINDI: 'Hindi (हिंदी)',
  ENGLISH: 'English',
  mr: 'Marathi (मराठी)',
  hi: 'Hindi (हिंदी)',
  en: 'English'
};

function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function getEmbedding(text) {
  try {
    const apiKey = env.geminiApiKey;
    if (!apiKey) throw new Error('GEMINI_API_KEY is not set');

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
    const result = await model.embedContent(text);
    return result.embedding.values;
  } catch (err) {
    console.warn(`[RAG Embedding] Fallback vector used: ${err.message}`);
    // Fallback 768-dimensional normalized pseudo-vector
    const vec = Array.from({ length: 768 }, () => (Math.random() - 0.5));
    const norm = Math.sqrt(vec.reduce((sum, val) => sum + val * val, 0));
    return vec.map(v => v / norm);
  }
}

async function generateExplanation(prompt) {
  const apiKey = env.geminiApiKey;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set');

  const genAI = new GoogleGenerativeAI(apiKey);
  const modelCandidates = ['gemini-3.5-flash', 'gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-3.7-flash'];
  let lastErr = null;

  for (const modelName of modelCandidates) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (err) {
      lastErr = err;
      console.warn(`[RAG generateExplanation] ${modelName} failed, trying next candidate: ${err.message}`);
    }
  }
  throw lastErr || new Error('Failed to generate explanation from all candidates');
}

/**
 * Explains an eligibility result based on retrieved official scheme chunks and translates to regional language.
 * (Phase 15: Regional Language RAG Translation)
 */
async function explainResult(resultId, requestedLanguage = null) {
  const result = await EligibilityResult.findById(resultId).populate('scheme');
  if (!result) throw new Error('Eligibility result not found');
  const profile = await FarmerProfile.findOne({ user: result.user });
  
  // Determine language preference: query param > farmer profile > default to English
  const selectedLang = (requestedLanguage || profile?.personal?.preferredLanguage || 'ENGLISH').toUpperCase();
  const langLabel = LANGUAGE_LABELS[selectedLang] || selectedLang;

  const query = `Farmer profile: ${JSON.stringify(profile)}. Scheme name: ${result.scheme.name}. Status: ${result.status}. Matched: ${JSON.stringify(result.matchedRules)}. Failed: ${JSON.stringify(result.failedRules)}. Missing: ${JSON.stringify(result.missingInformation)}. Missing docs: ${JSON.stringify(result.missingDocuments)}`;
  
  const queryEmbedding = await getEmbedding(query);
  
  const chunks = await SchemeChunk.find({ scheme: result.scheme._id });
  let contextText = '';
  if (chunks.length > 0) {
    // Rank by cosine similarity against official scheme documentation
    const scoredChunks = chunks.map(chunk => ({
      text: chunk.text,
      score: cosineSimilarity(queryEmbedding, chunk.embedding)
    })).sort((a, b) => b.score - a.score).slice(0, 3);

    contextText = scoredChunks.map(c => c.text).join('\n---\n');
  } else {
    contextText = `Scheme: ${result.scheme.name}\nDescription: ${result.scheme.description}\nBenefits: ${result.scheme.benefitSummary}`;
  }

  const prompt = `You are a compassionate, knowledgeable agricultural welfare advisor explaining government scheme eligibility to an Indian farmer.

TARGET REGIONAL LANGUAGE: ${langLabel}
IMPORTANT INSTRUCTION: You MUST compose your ENTIRE explanation in ${langLabel}. If Marathi, write in natural Marathi (मराठी). If Hindi, write in natural Hindi (हिंदी). If English, write in plain English. Use respectful, warm, and simple rural vocabulary.

OFFICIAL SCHEME GUIDELINES & CONTEXT (from API Setu / Government Documentation):
${contextText}

FARMER EVALUATION DATA:
- Farmer Name: ${profile?.personal?.name || 'Farmer'}
- Scheme: ${result.scheme.name}
- Eligibility Status: ${result.status}
- Matched Criteria: ${JSON.stringify(result.matchedRules)}
- Failed Rules: ${JSON.stringify(result.failedRules)}
- Missing Information Needed: ${JSON.stringify(result.missingInformation)}
- Missing Documents Needed: ${JSON.stringify(result.missingDocuments)}

TASK:
1. Explain clearly in ${langLabel} why the farmer received the status "${result.status}".
2. If they are ELIGIBLE or ALMOST_ELIGIBLE, tell them what benefit they get (e.g. subsidy/DBT amount) and what next step or document (Aadhaar, 7/12 Land Record, Bank Passbook) they need.
3. If they are NOT_ELIGIBLE or INCOMPLETE, explain gently what is required.
4. Keep the explanation concise (3-4 sentences max), encouraging, and strictly grounded in the official context above.`;

  const explanation = await generateExplanation(prompt);
  return {
    explanation: explanation.trim(),
    language: selectedLang,
    languageLabel: langLabel,
    schemeCode: result.scheme.code,
    schemeName: result.scheme.name
  };
}

/**
 * Indexes official scheme documentation text into VectorDB (SchemeChunk collection).
 */
async function indexSchemeText(schemeId, text, sourceUrl = '', version = 1) {
  // Clear old chunks for this scheme
  await SchemeChunk.deleteMany({ scheme: schemeId });
  
  // Chunking strategy: 400-600 characters per chunk preserving paragraph breaks
  const paragraphs = text.split(/\n\n+/);
  const chunks = [];
  for (const para of paragraphs) {
    if (para.length > 500) {
      const subChunks = para.match(/[\s\S]{1,500}/g) || [para];
      chunks.push(...subChunks);
    } else if (para.trim()) {
      chunks.push(para.trim());
    }
  }

  let index = 0;
  for (const chunkText of chunks) {
    if (!chunkText.trim()) continue;
    const embedding = await getEmbedding(chunkText);
    await SchemeChunk.create({
      scheme: schemeId,
      text: chunkText,
      embedding,
      chunkIndex: index++,
      sourceUrl,
      version,
    });
  }
  return chunks.length;
}

module.exports = { explainResult, indexSchemeText, cosineSimilarity, getEmbedding };
