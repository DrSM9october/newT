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
    const { message, history, personaPrompt, userLevel } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const ai = getGeminiClient();

    const systemInstruction = `
You are an expert, encouraging English language tutor for a Persian speaker.
Your active role/persona: ${personaPrompt || "Friendly Native English Conversation Partner"}.
Target Student CEFR Level: ${userLevel || "A2"}.

Your task:
1. Respond to the user's English input naturally as your persona in English. Keep vocabulary appropriate for Level ${userLevel || "A2"}.
2. Provide an accurate, idiomatic Persian translation of your English reply.
3. Analyze the user's last message for grammar, spelling, or naturalness. If there are errors, provide the corrected sentence and a brief Persian explanation. If their sentence is already perfect, leave correctedSentence null and score 100.
4. Suggest 2 better or more native alternatives to express what the user said.
5. Highlight 2-3 key vocabulary words from your response with Persian equivalents.

Output format MUST be strictly JSON adhering to this schema:
{
  "replyEn": "string - your reply in English",
  "replyFa": "string - Persian translation of your reply",
  "grammarScore": number between 50 and 100,
  "correctedSentence": "string or null - corrected version of user input if flawed",
  "explanationFa": "string or null - short Persian explanation of correction",
  "betterAlternatives": ["string", "string"],
  "vocabHighlights": [
    { "word": "string", "meaningFa": "string" }
  ]
}
`;

    // Construct conversation context
    let formattedPrompt = `Student Level: ${userLevel || "A2"}\n\n`;
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
    const { word, contextSentence } = req.body;
    if (!word) {
      return res.status(400).json({ error: "Word is required" });
    }

    const ai = getGeminiClient();

    const systemInstruction = `
You are a master English lexicographer for Persian learners. Provide a deep, insightful dictionary breakdown for the target English word or phrase: "${word}".
Context sentence if any: "${contextSentence || ""}"

Respond with JSON adhering strictly to:
{
  "word": "${word}",
  "phonetic": "string - IPA pronunciation e.g. /kəˈmjuːt/",
  "partOfSpeech": "string - noun, verb, adjective, adverb, idiom, phrase",
  "definitionEn": "string - simple clear English definition",
  "definitionFa": "string - comprehensive Persian meaning with nuances",
  "usageTipFa": "string - practical advice or common mistake to avoid in Persian",
  "collocations": ["string", "string", "string"],
  "synonyms": ["string", "string"],
  "antonyms": ["string", "string"],
  "extraExamples": [
    { "en": "string", "fa": "string" },
    { "en": "string", "fa": "string" },
    { "en": "string", "fa": "string" }
  ]
}
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: `Explain "${word}" in detail.`,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            word: { type: Type.STRING },
            phonetic: { type: Type.STRING },
            partOfSpeech: { type: Type.STRING },
            definitionEn: { type: Type.STRING },
            definitionFa: { type: Type.STRING },
            usageTipFa: { type: Type.STRING },
            collocations: { type: Type.ARRAY, items: { type: Type.STRING } },
            synonyms: { type: Type.ARRAY, items: { type: Type.STRING } },
            antonyms: { type: Type.ARRAY, items: { type: Type.STRING } },
            extraExamples: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  en: { type: Type.STRING },
                  fa: { type: Type.STRING },
                },
              },
            },
          },
          required: [
            "word",
            "phonetic",
            "partOfSpeech",
            "definitionEn",
            "definitionFa",
            "extraExamples",
          ],
        },
      },
    });

    const responseText = response.text || "{}";
    const data = JSON.parse(responseText);

    res.json({ success: true, data });
  } catch (error: any) {
    console.error("Error in /api/dictionary-explain:", error);
    res.status(500).json({
      error: error.message || "Failed to explain dictionary word.",
    });
  }
});

// AI Custom Drill Sentence Generator
app.post("/api/generate-sentences", async (req, res) => {
  try {
    const { category, level, topic, count = 3 } = req.body;
    const ai = getGeminiClient();

    const systemInstruction = `
Generate ${count} natural, highly practical English sentences with Persian translations for language learners.
Category: ${category || "daily_life"}
CEFR Level: ${level || "A2"}
Topic Focus: ${topic || "general conversational practice"}

Return JSON format:
{
  "sentences": [
    {
      "en": "string - English sentence",
      "fa": "string - Persian translation",
      "grammarPointFa": "string - brief grammar or usage note in Persian",
      "keyWord": "string - main target word in sentence"
    }
  ]
}
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: `Generate ${count} practical sentences for level ${level} in category ${category}.`,
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
