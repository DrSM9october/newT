import { DifficultyLevel, DialectType, GenderType, ChatFeedback, ChatMessage } from '../types';
import { languagePipeline, LanguageAnalysisResult } from '../nlp/languagePipeline';
import { generateOfflineReply } from '../lib/speech';

export interface AnalysisRequest {
  text: string;
  dialect?: DialectType;
  gender?: GenderType;
}

export interface ChatRequest {
  text: string;
  history: ChatMessage[];
  personaId: string;
  dialect: DialectType;
  gender: GenderType;
  level: DifficultyLevel;
}

export interface ChatResponse {
  replyEn: string;
  replyFa: string;
  feedback?: ChatFeedback;
  providerUsed: 'gemini_cloud' | 'local_nlp_engine';
}

export interface LanguageAIProvider {
  analyzeText(req: AnalysisRequest): Promise<LanguageAnalysisResult>;
  chat(req: ChatRequest): Promise<ChatResponse>;
}

/**
 * Gemini 2.5 Cloud Provider
 */
export class GeminiProvider implements LanguageAIProvider {
  public async analyzeText(req: AnalysisRequest): Promise<LanguageAnalysisResult> {
    try {
      const response = await fetch('/api/dictionary-explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          word: req.text,
          dialect: req.dialect || 'en-US',
          userGender: req.gender || 'masculine',
        }),
      });

      const json = await response.json();
      if (json.success && json.data) {
        // Enhance local pipeline with server result
        const base = languagePipeline.analyze(req.text, req.dialect, req.gender);
        return {
          ...base,
          explanationFa: json.data.usageTipFa || base.explanationFa,
          betterAlternatives: json.data.collocations || base.betterAlternatives,
        };
      }
      throw new Error('Server response invalid');
    } catch (e) {
      console.warn('GeminiProvider failed, falling back to LocalAIProvider', e);
      return languagePipeline.analyze(req.text, req.dialect, req.gender);
    }
  }

  public async chat(req: ChatRequest): Promise<ChatResponse> {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: req.text,
        history: req.history,
        personaId: req.personaId,
        dialect: req.dialect,
        userGender: req.gender,
        userLevel: req.level,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Server error');
    }

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
  }
}

/**
 * Local NLP Offline Engine Provider
 */
export class LocalAIProvider implements LanguageAIProvider {
  public async analyzeText(req: AnalysisRequest): Promise<LanguageAnalysisResult> {
    return languagePipeline.analyze(req.text, req.dialect, req.gender);
  }

  public async chat(req: ChatRequest): Promise<ChatResponse> {
    const localAnalysis = languagePipeline.analyze(req.text, req.dialect, req.gender);
    const offlineReply = generateOfflineReply(req.text, req.dialect, req.gender);

    return {
      replyEn: offlineReply.replyEn,
      replyFa: offlineReply.replyFa,
      feedback: {
        grammarScore: localAnalysis.grammarScore,
        correctedSentence: localAnalysis.correctedText,
        explanationFa: localAnalysis.explanationFa,
        genderNoteFa: localAnalysis.genderNoteFa,
        betterAlternatives: localAnalysis.betterAlternatives,
        vocabularyTips: localAnalysis.keyKeywords.map((k) => `${k.word}: ${k.meaningFa}`),
        persianTranslation: localAnalysis.persianTranslation,
      },
      providerUsed: 'local_nlp_engine',
    };
  }
}

/**
 * Unified AI Manager with Automatic Network Switching
 */
export class AIManager {
  private geminiProvider = new GeminiProvider();
  private localProvider = new LocalAIProvider();

  public async chat(req: ChatRequest, forcedOffline: boolean = false): Promise<ChatResponse> {
    if (forcedOffline || typeof navigator !== 'undefined' && !navigator.onLine) {
      return this.localProvider.chat(req);
    }

    try {
      return await this.geminiProvider.chat(req);
    } catch (e) {
      console.warn('Gemini Cloud API call failed. Falling back smoothly to Local NLP Provider:', e);
      return this.localProvider.chat(req);
    }
  }

  public async analyzeText(req: AnalysisRequest, forcedOffline: boolean = false): Promise<LanguageAnalysisResult> {
    if (forcedOffline || typeof navigator !== 'undefined' && !navigator.onLine) {
      return this.localProvider.analyzeText(req);
    }

    try {
      return await this.geminiProvider.analyzeText(req);
    } catch (e) {
      return this.localProvider.analyzeText(req);
    }
  }
}

export const aiManager = new AIManager();
