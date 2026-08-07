import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: "5mb" }));

const PORT = 3000;

// Lazy getter for Gemini client
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is missing.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// API Health
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", app: "LinguaAI Persian" });
});

// AI Chat with feedback endpoint
app.post("/api/chat", async (req, res) => {
  try {
    const { message, history, personaPrompt, userLevel, dialect = "en-US", userGender = "masculine" } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const ai = getGeminiClient();

    const dialectNames: Record<string, string> = {
      "en-US": "American English (لهجه آمریکایی)",
      "en-GB": "British English (لهجه بریتانیایی)",
      "ar-IQ": "Iraqi Arabic Dialect (لهجه محلی عراقی)",
      "ar-LB": "Lebanese Arabic Dialect (لهجه محلی لبنانی)",
    };

    const targetDialectName = dialectNames[dialect] || "American English";
    const userGenderLabel = userGender === "feminine" ? "Female / مؤنث ♀️" : "Male / مذکر ♂️";

    const systemInstruction = `
You are an expert multilingual tutor specializing in Persian bidirectional conversation and language training.
Active target language/dialect: ${targetDialectName}.
Student Gender: ${userGenderLabel}.
Student CEFR Level: ${userLevel || "A2"}.
Active Persona/Role: ${personaPrompt || "Friendly Native Tutor"}.

STRICT INSTRUCTIONS:
1. Respond to the user's input naturally in the specified target dialect (${targetDialectName}).
   - If target is Iraqi Arabic (ar-IQ), use authentic local Iraqi vocabulary (e.g., شلونك/شلونچ, هسا, دا اسوي, هسة, عيني).
   - If target is Lebanese Arabic (ar-LB), use authentic local Lebanese vocabulary (e.g., كيفك/كيفيك, شو اخبارك, هلق, شو هاد, تكرم عينك).
   - If target is American English (en-US), use authentic American phrasing.
   - If target is British English (en-GB), use authentic British phrasing (e.g., cheers, mate, knackered).
2. ADAPT FOR STUDENT GENDER (${userGenderLabel}):
   - Use correct gendered grammar forms when addressing the user (especially critical for Arabic like Iraqi/Lebanese verb and pronoun endings - e.g., feminine -چ or -ِك vs masculine -ك).
3. Provide a fluent, idiomatic Persian (فارسی) translation of your reply.
4. Analyze the user's message for grammar, spelling, gender agreement, or naturalness in ${targetDialectName}.
5. If there are errors or wrong gender agreements, provide the corrected sentence and a clear Persian explanation.
6. Provide a 'genderNoteFa' if there is a gender distinction (e.g., how the sentence differs when addressing a male ♂️ vs female ♀️).
7. Suggest 2 better or more native alternative phrases.
8. Highlight 2-3 key vocabulary words/idioms with Persian equivalents.

Output format MUST be strictly JSON adhering to this schema:
{
  "replyEn": "string - your reply in target language/dialect",
  "replyFa": "string - fluent Persian translation",
  "grammarScore": number between 50 and 100,
  "correctedSentence": "string or null - corrected version if user input had mistakes",
  "explanationFa": "string or null - brief Persian explanation of grammar/gender correction",
  "genderNoteFa": "string - note explaining gender differences (e.g. 'در لهجه عراقی برای خانم‌ها شلونچ و برای آقایان شلونك گفته می‌شود')",
  "betterAlternatives": ["string", "string"],
  "vocabHighlights": [
    { "word": "string", "meaningFa": "string" }
  ]
}
`;

    // Construct conversation context
    let formattedPrompt = `Target Dialect: ${targetDialectName}\nStudent Gender: ${userGenderLabel}\nStudent Level: ${userLevel || "A2"}\n\n`;
    if (history && Array.isArray(history) && history.length > 0) {
      formattedPrompt += "Recent Conversation History:\n";
      for (const item of history.slice(-6)) {
        formattedPrompt += `${item.sender === "user" ? "Student" : "Tutor"}: ${item.text}\n`;
      }
    }
    formattedPrompt += `\nStudent's Latest Message: "${message}"\n\nGenerate JSON response now:`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: formattedPrompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            replyEn: { type: Type.STRING },
            replyFa: { type: Type.STRING },
            grammarScore: { type: Type.INTEGER },
            correctedSentence: { type: Type.STRING, nullable: true },
            explanationFa: { type: Type.STRING, nullable: true },
            genderNoteFa: { type: Type.STRING, nullable: true },
            betterAlternatives: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            vocabHighlights: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  word: { type: Type.STRING },
                  meaningFa: { type: Type.STRING },
                },
              },
            },
          },
          required: ["replyEn", "replyFa", "grammarScore"],
        },
      },
    });

    const responseText = response.text || "{}";
    const data = JSON.parse(responseText);

    res.json({ success: true, data });
  } catch (error: any) {
    console.error("Error in /api/chat:", error);
    res.status(500).json({
      error: error.message || "Failed to process AI chat response.",
    });
  }
});

// AI Smart Dictionary Explanation Endpoint
app.post("/api/dictionary-explain", async (req, res) => {
  try {
    const { word, contextSentence, dialect = "en-US", userGender = "masculine" } = req.body;
    if (!word) {
      return res.status(400).json({ error: "Word is required" });
    }

    const ai = getGeminiClient();

    const systemInstruction = `
You are a master lexicographer specializing in Persian, English (US/UK), and local Arabic dialects (Iraqi ar-IQ, Lebanese ar-LB).
Target Word/Phrase: "${word}".
Selected Dialect/Language Context: ${dialect}.
User Gender Context: ${userGender}.

Respond with JSON adhering strictly to:
{
  "word": "${word}",
  "phonetic": "string - phonetic pronunciation guide e.g. /kəˈmjuːt/ or Arabic pronunciation e.g. Shlonak / Kifak",
  "partOfSpeech": "string - noun, verb, adjective, adverb, idiom, phrase",
  "definitionEn": "string - clear explanation in target language or simple English/Arabic",
  "definitionFa": "string - comprehensive Persian meaning with cultural/dialect nuances",
  "usageTipFa": "string - practical advice or common usage in Persian",
  "genderNoteFa": "string - gender differences if any e.g. (مذکر ♂️: شلونك | مؤنث ♀️: شلونچ)",
  "collocations": ["string", "string", "string"],
  "synonyms": ["string", "string"],
  "antonyms": ["string", "string"],
  "extraExamples": [
    { "en": "string", "fa": "string" },
    { "en": "string", "fa": "string" }
  ]
}
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: `Explain "${word}" in detail in dialect ${dialect}.`,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
      },
    });

    const responseText = response.text || "{}";
    const data = JSON.parse(responseText);

    res.json({ success: true, data });
  } catch (error: any) {
    console.error("Error in /api/dictionary-explain:", error);
    res.status(500).json({
      error: error.message || "Failed to explain word.",
    });
  }
});

// AI Custom Drill Sentence Generator
app.post("/api/generate-sentences", async (req, res) => {
  try {
    const { category, level, topic, dialect = "en-US", gender = "masculine", count = 4 } = req.body;
    const ai = getGeminiClient();

    const systemInstruction = `
Generate ${count} natural, practical sentences with fluent Persian translations for learners.
Target Dialect: ${dialect} (en-US, en-GB, ar-IQ Iraqi Arabic, ar-LB Lebanese Arabic).
Gender context: ${gender} (masculine ♂️ or feminine ♀️).
Category: ${category || "daily_life"}
CEFR Level: ${level || "A2"}
Topic Focus: ${topic || "general conversational practice"}

Return JSON format:
{
  "sentences": [
    {
      "en": "string - sentence in target dialect",
      "fa": "string - fluent Persian translation",
      "grammarPointFa": "string - brief grammar or dialect/gender note in Persian",
      "gender": "string - masculine / feminine / unisex",
      "keyWord": "string - main target word"
    }
  ]
}
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: `Generate ${count} practical sentences in dialect ${dialect} for gender ${gender}.`,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
      },
    });

    const data = JSON.parse(response.text || "{}");
    res.json({ success: true, data });
  } catch (error: any) {
    console.error("Error in /api/generate-sentences:", error);
    res.status(500).json({ error: error.message || "Failed to generate sentences." });
  }
});

// Vite & Static server setup
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
