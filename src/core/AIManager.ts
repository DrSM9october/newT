import { ChatMessage, DialectType, GenderType, DifficultyLevel } from '../types';

export interface ChatExplainRequest {
  userText: string;
  history?: ChatMessage[];
  personaId?: string;
  dialect?: DialectType;
  gender?: GenderType;
  level?: DifficultyLevel;
}

export interface ChatExplainResponse {
  replyEn: string;
  replyFa: string;
  feedback: {
    grammarScore: number;
    correctedSentence?: string;
    explanationFa?: string;
    genderNoteFa?: string;
    betterAlternatives?: string[];
    vocabularyTips?: string[];
    persianTranslation?: string;
  };
  providerUsed: string;
}

export class AIManager {
  public async sendChatMessage(req: ChatExplainRequest): Promise<ChatExplainResponse> {
    try {
      const response = await fetch('/api/chat-explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userText: req.userText,
          history: req.history,
          personaId: req.personaId,
          dialect: req.dialect,
          userGender: req.gender,
          userLevel: req.level,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const data = await response.json();
      const payload = data.data || data;

      return {
        replyEn: payload.replyEn || '',
        replyFa: payload.replyFa || '',
        feedback: {
          grammarScore: payload.grammarScore ?? 90,
          correctedSentence: payload.correctedSentence || undefined,
          explanationFa: payload.explanationFa || undefined,
          genderNoteFa: payload.genderNoteFa || undefined,
          betterAlternatives: payload.betterAlternatives || [],
          vocabularyTips: payload.vocabHighlights
            ? payload.vocabHighlights.map((v: any) => `${v.word}: ${v.meaningFa}`)
            : [],
          persianTranslation: payload.replyFa || '',
        },
        providerUsed: 'gemini_cloud',
      };
    } catch (err: any) {
      console.warn('Fallback in AIManager chat:', err);
      return {
        replyEn: `I received: "${req.userText}". Keep up the great practice!`,
        replyFa: `پیام شما دریافت شد: "${req.userText}". به تمرین خوب ادامه دهید!`,
        feedback: {
          grammarScore: 90,
          correctedSentence: req.userText,
          explanationFa: 'جمله شما مفهوم و قابل قبول است.',
          betterAlternatives: [],
          persianTranslation: `پیام: ${req.userText}`,
        },
        providerUsed: 'offline_fallback',
      };
    }
  }

  public async sendScenarioMessage(req: {
    userText: string;
    history: any[];
    persona: any;
    dialect?: DialectType;
    gender?: GenderType;
    level?: DifficultyLevel;
  }) {
    try {
      const response = await fetch('/api/scenario-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userText: req.userText,
          history: req.history,
          persona: req.persona,
          dialect: req.dialect,
          userGender: req.gender,
          userLevel: req.level,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const data = await response.json();
      return data.data || data;
    } catch (err) {
      console.warn('Fallback in scenario chat:', err);
      return {
        replyEn: `[Roleplay Response]: Thanks for saying "${req.userText}". Let's continue!`,
        replyFa: `[پاسخ سناریو]: ممنون از شما. به مکالمه ادامه دهیم!`,
        grammarScore: 90,
        correctedSentence: req.userText,
        explanationFa: 'تمرین خوبی بود.',
      };
    }
  }
}

export const aiManager = new AIManager();
