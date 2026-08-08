import express from 'express';
import { GoogleGenAI } from '@google/genai';

const app = express();
app.use(express.json());

const apiKey = process.env.GEMINI_API_KEY || '';
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

// Helper to sanitize Gemini response text
function cleanGeminiResponse(rawText: string): string {
  let text = rawText.trim();
  if (text.startsWith('```json')) {
    text = text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
  } else if (text.startsWith('```')) {
    text = text.replace(/^```\s*/i, '').replace(/\s*```$/i, '');
  }
  return text.trim();
}

// 1. AI Chat & Grammar Analysis Route
app.post('/api/chat-explain', async (req, res) => {
  try {
    const { userText, history, personaId, dialect, userGender, userLevel } = req.body;

    if (!userText) {
      return res.status(400).json({ error: 'userText is required' });
    }

    if (!ai) {
      // Fallback response if GEMINI_API_KEY is not set
      return res.json({
        success: true,
        data: {
          replyEn: `I received your message: "${userText}". To unlock full real-time Gemini AI responses, please configure your GEMINI_API_KEY in the settings environment variables.`,
          replyFa: `پیام شما دریافت شد: "${userText}". برای فعال‌سازی کامل هوش مصنوعی جمینای، لطفاً کلید API را در تنظیمات وارد کنید.`,
          grammarScore: 95,
          correctedSentence: userText,
          explanationFa: 'کلید API تنظیم نشده است، اما جمله شما صحیح به نظر می‌رسد.',
          betterAlternatives: [],
          vocabHighlights: []
        }
      });
    }

    const systemPrompt = `You are a warm, highly skilled, interactive AI language teacher helping a Persian learner practice English or Arabic dialects (such as Lebanese ar-LB or Iraqi ar-IQ).
User details:
- Target Dialect/Accent: ${dialect || 'en-US'}
- User Gender: ${userGender || 'masculine'}
- User CEFR Level: ${userLevel || 'B1'}
- Active Persona ID: ${personaId || 'tutor'}

Your response MUST be strict valid JSON matching this exact structure:
{
  "replyEn": "Natural, engaging conversational response in English or the selected dialect (e.g. Arabic if dialect is ar-IQ or ar-LB). Keep it 1-3 sentences long and ask an engaging follow-up question.",
  "replyFa": "Fluent Persian translation of your replyEn text.",
  "grammarScore": 90,
  "correctedSentence": "Corrected version of user's input if there were grammatical/spelling errors, otherwise same as userText.",
  "explanationFa": "Short explanation in Persian regarding grammar, vocabulary, or cultural tone.",
  "genderNoteFa": "Optional note in Persian if gender-specific grammar rules apply in Persian/Arabic/English.",
  "betterAlternatives": ["An alternative, more natural native phrase for what user said."],
  "vocabHighlights": [
    { "word": "example", "meaningFa": "مثال", "partOfSpeech": "noun" }
  ]
}`;

    const prompt = `System Instructions:\n${systemPrompt}\n\nRecent Conversation History:\n${JSON.stringify(history || [])}\n\nUser Message: "${userText}"`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.7,
      }
    });

    const responseText = response.text ? cleanGeminiResponse(response.text) : '';
    const parsed = JSON.parse(responseText);

    return res.json({
      success: true,
      data: parsed
    });
  } catch (error: any) {
    console.error('Error in /api/chat-explain:', error);
    return res.status(500).json({
      error: 'Failed to generate AI response',
      details: error.message
    });
  }
});

// 2. Scenario Roleplay Chat Route
app.post('/api/scenario-chat', async (req, res) => {
  try {
    const { userText, history, persona, dialect, userGender, userLevel } = req.body;

    if (!userText) {
      return res.status(400).json({ error: 'userText is required' });
    }

    if (!ai) {
      return res.json({
        success: true,
        data: {
          replyEn: `[Roleplay Fallback]: Excellent effort! You said "${userText}".`,
          replyFa: `[پاسخ نمونه سناریو]: آفرین! شما گفتید "${userText}".`,
          grammarScore: 90,
          correctedSentence: userText,
          explanationFa: 'جمله شما مفهوم بود.',
          betterAlternatives: []
        }
      });
    }

    const isArabicDialect = dialect === 'ar-IQ' || dialect === 'ar-LB';
    const langInstructions = isArabicDialect
      ? `Speak in authentic ${dialect === 'ar-IQ' ? 'Iraqi Arabic (عراقي)' : 'Lebanese Arabic (لبناني)'} dialect.`
      : `Speak in natural conversational English with ${dialect || 'en-US'} accent style.`;

    const systemPrompt = `You are playing a roleplay scenario character:
Name/Role: ${persona?.name || 'Partner'} - ${persona?.role || 'Assistant'}
Custom System Prompt: ${persona?.systemPrompt || ''}
${langInstructions}

Return a valid JSON response with:
{
  "replyEn": "In-character reply in ${isArabicDialect ? 'Arabic' : 'English'} (1-2 sentences).",
  "replyFa": "Persian translation of your reply.",
  "grammarScore": 95,
  "correctedSentence": "Corrected user input if grammatically flawed.",
  "explanationFa": "Persian tip on pronunciation, grammar, or cultural etiquette."
}`;

    const prompt = `System Guidelines:\n${systemPrompt}\n\nChat History:\n${JSON.stringify(history || [])}\n\nUser Input: "${userText}"`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.7,
      }
    });

    const responseText = response.text ? cleanGeminiResponse(response.text) : '';
    const parsed = JSON.parse(responseText);

    return res.json({
      success: true,
      data: parsed
    });
  } catch (error: any) {
    console.error('Error in /api/scenario-chat:', error);
    return res.status(500).json({
      error: 'Failed to process scenario chat',
      details: error.message
    });
  }
});

// 3. Dictionary & Word Analysis Route
app.post('/api/dictionary-explain', async (req, res) => {
  try {
    const { query, word, dialect, userGender } = req.body;
    const targetWord = query || word;

    if (!targetWord) {
      return res.status(400).json({ error: 'Word or query is required' });
    }

    if (!ai) {
      return res.json({
        success: true,
        data: {
          word: targetWord,
          phonetic: '/.../',
          meaningFa: `ترجمه برای ${targetWord}`,
          partOfSpeech: 'noun',
          level: 'B1',
          examples: [
            { en: `How to use ${targetWord} in a sentence.`, fa: `نحوه استفاده از ${targetWord} در جمله.` }
          ],
          collocations: ['common usage', 'native phrase'],
          synonyms: ['similar word']
        }
      });
    }

    const systemPrompt = `Analyze the word/phrase "${targetWord}" for a Persian speaker learning English or Arabic dialects.
Target Dialect: ${dialect || 'en-US'}

Return valid JSON with:
{
  "word": "${targetWord}",
  "phonetic": "IPA phonetic transcription (e.g. /əbˈsəluːtli/)",
  "phoneticUk": "Optional UK IPA if English",
  "meaningFa": "Clear Persian translation and definition",
  "partOfSpeech": "noun/verb/adjective/adverb/expression",
  "level": "A1/A2/B1/B2/C1/C2",
  "examples": [
    { "en": "Example sentence in English/Arabic", "fa": "Persian translation" }
  ],
  "collocations": ["frequent collocation 1", "frequent collocation 2"],
  "synonyms": ["synonym 1", "synonym 2"],
  "antonyms": ["antonym 1"]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: systemPrompt,
      config: {
        responseMimeType: 'application/json',
      }
    });

    const responseText = response.text ? cleanGeminiResponse(response.text) : '';
    const parsed = JSON.parse(responseText);

    return res.json({
      success: true,
      data: parsed
    });
  } catch (error: any) {
    console.error('Error in /api/dictionary-explain:', error);
    return res.status(500).json({
      error: 'Failed to analyze word',
      details: error.message
    });
  }
});

// 4. Server-Side TTS Proxy Endpoint (solves browser CORS and audio playback blocks)
app.get('/api/tts', async (req, res) => {
  try {
    const text = (req.query.text as string || '').trim();
    let lang = (req.query.lang as string || 'en-US').trim();

    if (!text) {
      return res.status(400).send('Text parameter is required');
    }

    // Map dialect codes to Google Translate TTS ISO codes
    if (lang === 'ar-IQ' || lang === 'ar-LB') {
      lang = 'ar';
    } else if (lang.startsWith('en')) {
      lang = 'en';
    }

    // Construct Google TTS audio stream URL
    const googleTtsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${encodeURIComponent(lang)}&q=${encodeURIComponent(text.slice(0, 300))}`;

    const audioRes = await fetch(googleTtsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'audio/mpeg, audio/*',
      }
    });

    if (!audioRes.ok) {
      throw new Error(`TTS upstream status: ${audioRes.status}`);
    }

    const arrayBuffer = await audioRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', buffer.length.toString());
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.send(buffer);
  } catch (error: any) {
    console.error('Error proxying TTS audio:', error);
    return res.status(500).send('Failed to generate audio');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`LinguaAI server running on port ${PORT}`);
});
