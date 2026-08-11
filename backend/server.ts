import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();

const PORT = Number(process.env.PORT) || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY?.trim() || '';

const ai = GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: GEMINI_API_KEY })
  : null;

/**
 * ---------------------------------------------------------
 * Middleware
 * ---------------------------------------------------------
 */

app.use(
  cors({
    origin: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(
  express.json({
    limit: '1mb',
  })
);

/**
 * ---------------------------------------------------------
 * Helpers
 * ---------------------------------------------------------
 */

function cleanGeminiResponse(text: string): string {
  return text
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

function getErrorType(error: unknown): {
  statusCode: number;
  errorType: string;
} {
  const message =
    error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

  if (
    message.includes('api key') ||
    message.includes('unauthorized') ||
    message.includes('authentication') ||
    message.includes('permission denied')
  ) {
    return {
      statusCode: 401,
      errorType: 'auth',
    };
  }

  if (
    message.includes('429') ||
    message.includes('rate limit') ||
    message.includes('resource exhausted')
  ) {
    return {
      statusCode: 429,
      errorType: 'rate_limit',
    };
  }

  if (
    message.includes('timeout') ||
    message.includes('timed out') ||
    message.includes('deadline exceeded')
  ) {
    return {
      statusCode: 504,
      errorType: 'timeout',
    };
  }

  if (
    message.includes('json') ||
    message.includes('parse') ||
    message.includes('unexpected token')
  ) {
    return {
      statusCode: 500,
      errorType: 'invalid_response',
    };
  }

  return {
    statusCode: 500,
    errorType: 'gemini_error',
  };
}

function requireGemini(res: Response): boolean {
  if (ai) {
    return true;
  }

  res.status(500).json({
    success: false,
    error: 'Gemini API key not configured',
    errorType: 'config_error',
  });

  return false;
}

/**
 * ---------------------------------------------------------
 * Health Check
 * ---------------------------------------------------------
 */

app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    service: 'LinguaAI Backend',
    gemini: Boolean(GEMINI_API_KEY),
    timestamp: new Date().toISOString(),
  });
});

/**
 * ---------------------------------------------------------
 * Chat Explain
 * ---------------------------------------------------------
 */

app.post('/api/chat-explain', async (req: Request, res: Response) => {
  try {
    const {
      userText,
      history,
      personaId,
      dialect,
      userGender,
      userLevel,
    } = req.body;

    if (typeof userText !== 'string' || !userText.trim()) {
      return res.status(400).json({
        success: false,
        error: 'userText is required',
        errorType: 'validation',
      });
    }

    if (!requireGemini(res)) {
      return;
    }

    const systemPrompt = `
You are a warm, highly skilled AI language teacher helping a Persian-speaking learner practice English or Arabic dialects.

User information:
- Level: ${userLevel || 'B1'}
- Target dialect: ${dialect || 'en-US'}
- User gender: ${userGender || 'masculine'}
- Persona: ${personaId || 'tutor'}

Your response MUST be valid JSON and MUST follow this exact structure:

{
  "replyEn": "Natural conversational response in the target language. Keep it 1-3 sentences and ask a useful follow-up question.",
  "replyFa": "Fluent Persian translation of replyEn.",
  "grammarScore": 0,
  "correctedSentence": "Corrected version of the user's sentence, or the original sentence if already correct.",
  "explanationFa": "Short and clear Persian explanation of grammar, vocabulary, or natural usage.",
  "genderNoteFa": "Optional Persian note about gender-specific grammar when relevant.",
  "betterAlternatives": [
    "A more natural alternative sentence."
  ],
  "vocabHighlights": [
    {
      "word": "example",
      "meaningFa": "مثال",
      "partOfSpeech": "noun"
    }
  ]
}

Rules:
- Return ONLY valid JSON.
- Do not use Markdown.
- Do not wrap JSON in code fences.
- If the user's sentence is correct, grammarScore should normally be between 90 and 100.
- Be encouraging.
- Do not invent errors.
`;

    const recentHistory = Array.isArray(history)
      ? history.slice(-10)
      : [];

    const prompt = `
${systemPrompt}

Recent conversation:
${JSON.stringify(recentHistory)}

User message:
${JSON.stringify(userText)}
`;

    const response = await ai!.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.7,
      },
    });

    const responseText = cleanGeminiResponse(response.text || '');

    if (!responseText) {
      throw new Error('Empty response from Gemini');
    }

    const parsed = JSON.parse(responseText);

    if (
      !parsed ||
      typeof parsed !== 'object' ||
      typeof parsed.replyEn !== 'string' ||
      !parsed.replyEn.trim()
    ) {
      throw new Error('Invalid Gemini response structure');
    }

    return res.status(200).json({
      success: true,
      data: parsed,
    });
  } catch (error: unknown) {
    console.error('[Backend] /api/chat-explain error:', error);

    const { statusCode, errorType } = getErrorType(error);

    const message =
      error instanceof Error
        ? error.message
        : 'Failed to generate AI response';

    return res.status(statusCode).json({
      success: false,
      error: message,
      errorType,
    });
  }
});

/**
 * ---------------------------------------------------------
 * Scenario Chat
 * ---------------------------------------------------------
 */

app.post('/api/scenario-chat', async (req: Request, res: Response) => {
  try {
    const {
      userText,
      history,
      persona,
      dialect,
      userGender,
      userLevel,
    } = req.body;

    if (typeof userText !== 'string' || !userText.trim()) {
      return res.status(400).json({
        success: false,
        error: 'userText is required',
        errorType: 'validation',
      });
    }

    if (!requireGemini(res)) {
      return;
    }

    const isArabic =
      dialect === 'ar-IQ' ||
      dialect === 'ar-LB';

    const languageInstruction = isArabic
      ? `Speak naturally in ${
          dialect === 'ar-IQ'
            ? 'Iraqi Arabic'
            : 'Lebanese Arabic'
        }.`
      : `Speak natural conversational English with ${dialect || 'en-US'} style.`;

    const systemPrompt = `
You are playing a roleplay scenario character.

Name:
${persona?.name || 'Partner'}

Role:
${persona?.role || 'Assistant'}

Character instructions:
${persona?.systemPrompt || ''}

${languageInstruction}

User level:
${userLevel || 'B1'}

User gender:
${userGender || 'masculine'}

Return ONLY valid JSON:

{
  "replyEn": "Natural in-character response, 1-2 sentences.",
  "replyFa": "Persian translation.",
  "grammarScore": 0,
  "correctedSentence": "Corrected user sentence if necessary.",
  "explanationFa": "Short Persian learning tip."
}
`;

    const prompt = `
${systemPrompt}

History:
${JSON.stringify(Array.isArray(history) ? history.slice(-10) : [])}

User:
${JSON.stringify(userText)}
`;

    const response = await ai!.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.7,
      },
    });

    const cleanText = cleanGeminiResponse(response.text || '');

    if (!cleanText) {
      throw new Error('Empty response from Gemini');
    }

    const parsed = JSON.parse(cleanText);

    if (!parsed?.replyEn) {
      throw new Error('Invalid Gemini scenario response');
    }

    return res.status(200).json({
      success: true,
      data: parsed,
    });
  } catch (error: unknown) {
    console.error('[Backend] /api/scenario-chat error:', error);

    const { statusCode, errorType } = getErrorType(error);

    return res.status(statusCode).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to process scenario chat',
      errorType,
    });
  }
});

/**
 * ---------------------------------------------------------
 * Dictionary
 * ---------------------------------------------------------
 */

app.post('/api/dictionary-explain', async (req: Request, res: Response) => {
  try {
    const {
      query,
      word,
      dialect,
      userGender,
    } = req.body;

    const targetWord =
      typeof query === 'string' && query.trim()
        ? query.trim()
        : typeof word === 'string' && word.trim()
          ? word.trim()
          : '';

    if (!targetWord) {
      return res.status(400).json({
        success: false,
        error: 'Word or query is required',
        errorType: 'validation',
      });
    }

    if (!requireGemini(res)) {
      return;
    }

    const prompt = `
Analyze the word or phrase "${targetWord}" for a Persian-speaking language learner.

Target dialect:
${dialect || 'en-US'}

User gender:
${userGender || 'masculine'}

Return ONLY valid JSON:

{
  "word": "${targetWord}",
  "phonetic": "/.../",
  "phoneticUk": "/.../",
  "meaningFa": "Clear Persian meaning and definition.",
  "partOfSpeech": "noun|verb|adjective|adverb|expression",
  "level": "A1|A2|B1|B2|C1|C2",
  "examples": [
    {
      "en": "Example sentence.",
      "fa": "ترجمه فارسی."
    }
  ],
  "collocations": [
    "common collocation"
  ],
  "synonyms": [
    "synonym"
  ],
  "antonyms": [
    "antonym"
  ]
}
`;

    const response = await ai!.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const cleanText = cleanGeminiResponse(response.text || '');

    if (!cleanText) {
      throw new Error('Empty response from Gemini');
    }

    const parsed = JSON.parse(cleanText);

    if (!parsed?.word) {
      throw new Error('Invalid Gemini dictionary response');
    }

    return res.status(200).json({
      success: true,
      data: parsed,
    });
  } catch (error: unknown) {
    console.error('[Backend] /api/dictionary-explain error:', error);

    const { statusCode, errorType } = getErrorType(error);

    return res.status(statusCode).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to analyze word',
      errorType,
    });
  }
});

/**
 * ---------------------------------------------------------
 * Root endpoint
 * ---------------------------------------------------------
 */

app.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    service: 'LinguaAI Backend',
    status: 'running',
  });
});

/**
 * ---------------------------------------------------------
 * Start Server
 * ---------------------------------------------------------
 */

app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('==========================================');
  console.log('🚀 LinguaAI Backend');
  console.log('==========================================');
  console.log(`Port: ${PORT}`);
  console.log(
    `Gemini: ${GEMINI_API_KEY ? '✅ Configured' : '❌ MISSING'}`
  );
  console.log('Health: /api/health');
  console.log('==========================================');
  console.log('');
});
