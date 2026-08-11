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

// 4. Multi-provider TTS API
//
// Supported providers:
// - google
// - azure
// - elevenlabs
//
// Native Android TTS is handled inside the APK.
// API keys MUST stay on the server.

type TtsProvider =
  | 'google'
  | 'azure'
  | 'elevenlabs';

function normalizeTtsLanguage(
  lang: string
): string {
  if (!lang) return 'en-US';

  if (lang === 'ar-IQ') return 'ar-IQ';
  if (lang === 'ar-LB') return 'ar-LB';
  if (lang === 'en-GB') return 'en-GB';
  if (lang === 'en-AU') return 'en-AU';
  if (lang === 'fa' || lang === 'fa-IR') {
    return 'fa-IR';
  }

  return 'en-US';
}

function googleVoiceFor(
  lang: string
): string {
  switch (lang) {
    case 'en-GB':
      return 'en-GB-Neural2-A';

    case 'en-AU':
      return 'en-AU-Neural2-A';

    case 'ar-IQ':
      return 'ar-XA-Wavenet-A';

    case 'ar-LB':
      return 'ar-XA-Wavenet-A';

    case 'fa-IR':
      return 'fa-IR-Wavenet-A';

    case 'en-US':
    default:
      return 'en-US-Neural2-F';
  }
}

function azureVoiceFor(
  lang: string
): string {
  switch (lang) {
    case 'en-GB':
      return 'en-GB-SoniaNeural';

    case 'en-AU':
      return 'en-AU-NatashaNeural';

    case 'ar-IQ':
      return 'ar-IQ-RanaNeural';

    case 'ar-LB':
      return 'ar-LB-LaylaNeural';

    case 'fa-IR':
      return 'fa-IR-DilaraNeural';

    case 'en-US':
    default:
      return 'en-US-JennyNeural';
  }
}

function elevenLabsVoiceFor(): string {
  return (
    process.env.ELEVENLABS_VOICE_ID ||
    ''
  );
}

function clampRate(
  value: unknown
): number {
  const number =
    Number(value);

  if (!Number.isFinite(number)) {
    return 1;
  }

  return Math.max(
    0.5,
    Math.min(number, 2)
  );
}

function clampPitch(
  value: unknown
): number {
  const number =
    Number(value);

  if (!Number.isFinite(number)) {
    return 1;
  }

  return Math.max(
    0.5,
    Math.min(number, 2)
  );
}

function escapeXml(
  value: string
): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function googleTts(
  text: string,
  lang: string,
  rate: number,
  pitch: number
): Promise<Buffer> {

  const apiKey =
    process.env.GOOGLE_TTS_API_KEY ||
    '';

  if (!apiKey) {
    throw new Error(
      'GOOGLE_TTS_API_KEY is not configured'
    );
  }

  const response =
    await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',

        headers: {
          'Content-Type':
            'application/json',
        },

        body: JSON.stringify({
          input: {
            text: text.slice(0, 5000),
          },

          voice: {
            languageCode: lang,
            name: googleVoiceFor(lang),
          },

          audioConfig: {
            audioEncoding: 'MP3',
            speakingRate: rate,
            pitch:
              (pitch - 1) * 8,
          },
        }),
      }
    );

  if (!response.ok) {

    const body =
      await response.text();

    throw new Error(
      `Google TTS ${response.status}: ${body.slice(0, 500)}`
    );
  }

  const data =
    await response.json() as {
      audioContent?: string;
    };

  if (!data.audioContent) {
    throw new Error(
      'Google TTS returned no audio'
    );
  }

  return Buffer.from(
    data.audioContent,
    'base64'
  );
}

async function azureTts(
  text: string,
  lang: string,
  rate: number,
  pitch: number
): Promise<Buffer> {

  const key =
    process.env.AZURE_SPEECH_KEY ||
    '';

  const region =
    process.env.AZURE_SPEECH_REGION ||
    '';

  if (!key) {
    throw new Error(
      'AZURE_SPEECH_KEY is not configured'
    );
  }

  if (!region) {
    throw new Error(
      'AZURE_SPEECH_REGION is not configured'
    );
  }

  const voice =
    azureVoiceFor(lang);

  const ratePercent =
    Math.round(
      (rate - 1) * 100
    );

  const pitchPercent =
    Math.round(
      (pitch - 1) * 100
    );

  const rateString =
    `${ratePercent >= 0 ? '+' : ''}${ratePercent}%`;

  const pitchString =
    `${pitchPercent >= 0 ? '+' : ''}${pitchPercent}%`;

  const safeText =
    escapeXml(
      text.slice(0, 5000)
    );

  const ssml =
    `<speak version="1.0" ` +
    `xmlns="http://www.w3.org/2001/10/synthesis" ` +
    `xml:lang="${lang}">` +
    `<voice name="${voice}">` +
    `<prosody rate="${rateString}" pitch="${pitchString}">` +
    `${safeText}` +
    `</prosody>` +
    `</voice>` +
    `</speak>`;

  const response =
    await fetch(
      `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`,
      {
        method: 'POST',

        headers: {
          'Ocp-Apim-Subscription-Key':
            key,

          'Content-Type':
            'application/ssml+xml',

          'X-Microsoft-OutputFormat':
            'audio-24khz-48kbitrate-mono-mp3',

          'User-Agent':
            'LinguaAI',
        },

        body: ssml,
      }
    );

  if (!response.ok) {

    const body =
      await response.text();

    throw new Error(
      `Azure TTS ${response.status}: ${body.slice(0, 500)}`
    );
  }

  return Buffer.from(
    await response.arrayBuffer()
  );
}

async function elevenLabsTts(
  text: string,
  lang: string,
  rate: number,
  pitch: number
): Promise<Buffer> {

  const apiKey =
    process.env.ELEVENLABS_API_KEY ||
    '';

  const voiceId =
    elevenLabsVoiceFor();

  if (!apiKey) {
    throw new Error(
      'ELEVENLABS_API_KEY is not configured'
    );
  }

  if (!voiceId) {
    throw new Error(
      'ELEVENLABS_VOICE_ID is not configured'
    );
  }

  const response =
    await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`,
      {
        method: 'POST',

        headers: {
          'xi-api-key':
            apiKey,

          'Content-Type':
            'application/json',

          'Accept':
            'audio/mpeg',
        },

        body: JSON.stringify({
          text: text.slice(0, 5000),

          model_id:
            'eleven_multilingual_v2',

          language_code:
            lang,

          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.2,
            use_speaker_boost: true,
          },
        }),
      }
    );

  if (!response.ok) {

    const body =
      await response.text();

    throw new Error(
      `ElevenLabs TTS ${response.status}: ${body.slice(0, 500)}`
    );
  }

  return Buffer.from(
    await response.arrayBuffer()
  );
}

app.post(
  '/api/tts',
  async (req, res) => {

    try {

      const text =
        String(
          req.body?.text || ''
        ).trim();

      const provider =
        String(
          req.body?.provider || 'google'
        ) as TtsProvider;

      const lang =
        normalizeTtsLanguage(
          String(
            req.body?.lang ||
              'en-US'
          )
        );

      const rate =
        clampRate(
          req.body?.rate
        );

      const pitch =
        clampPitch(
          req.body?.pitch
        );

      if (!text) {

        return res
          .status(400)
          .json({
            error:
              'Text parameter is required',
          });
      }

      let audio: Buffer;

      switch (provider) {

        case 'google':

          audio =
            await googleTts(
              text,
              lang,
              rate,
              pitch
            );

          break;

        case 'azure':

          audio =
            await azureTts(
              text,
              lang,
              rate,
              pitch
            );

          break;

        case 'elevenlabs':

          audio =
            await elevenLabsTts(
              text,
              lang,
              rate,
              pitch
            );

          break;

        default:

          return res
            .status(400)
            .json({
              error:
                `Unsupported TTS provider: ${provider}`,
            });
      }

      res.setHeader(
        'Content-Type',
        'audio/mpeg'
      );

      res.setHeader(
        'Content-Length',
        audio.length.toString()
      );

      res.setHeader(
        'Cache-Control',
        'private, max-age=3600'
      );

      return res.send(audio);

    } catch (error: any) {

      console.error(
        'Error in /api/tts:',
        error
      );

      return res
        .status(500)
        .json({
          error:
            error?.message ||
            'Failed to generate TTS audio',
        });
    }
  }
);

const PORT =
  process.env.PORT || 3000;

app.listen(
  PORT,
  () => {
    console.log(
      `LinguaAI server running on port ${PORT}`
    );
  }
);
