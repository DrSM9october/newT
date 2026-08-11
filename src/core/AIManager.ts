import {
  ChatMessage,
  DialectType,
  GenderType,
  DifficultyLevel,
} from '../types';

import { analyzeOfflineMessage } from '../lib/offlineAnalyzer';

import {
  getApiBaseUrl,
  fetchWithTimeout,
} from '../lib/api';

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
  public async sendChatMessage(
    req: ChatExplainRequest
  ): Promise<ChatExplainResponse> {
    const baseUrl = getApiBaseUrl();

    if (!baseUrl) {
      console.warn(
        '[AIManager] No API base URL configured'
      );

      return this.getOfflineFallback(
        req,
        'no-api-url'
      );
    }

    try {
      const url = `${baseUrl}/api/chat-explain`;

      console.log(
        `[AIManager] Sending request to: ${url}`
      );

      const response = await fetchWithTimeout(
        url,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userText: req.userText,
            history: req.history?.slice(-10) || [],
            personaId: req.personaId,
            dialect: req.dialect,
            userGender: req.gender,
            userLevel: req.level,
          }),
        },
        20000
      );

      if (!response.ok) {
        let errorType = 'http_error';
        let errorMessage = `HTTP ${response.status}`;

        try {
          const errorData = await response.json();

          if (errorData?.errorType) {
            errorType = errorData.errorType;
          }

          if (errorData?.error) {
            errorMessage = errorData.error;
          }
        } catch {
          // Ignore invalid error body.
        }

        if (response.status === 401) {
          errorType = 'auth';
        } else if (response.status === 429) {
          errorType = 'rate_limit';
        } else if (response.status >= 500) {
          errorType = 'server_error';
        }

        throw new Error(
          `${errorMessage} (${errorType})`
        );
      }

      const data = await response.json();
      const payload = data?.data || data;

      if (
        !payload ||
        typeof payload.replyEn !== 'string' ||
        !payload.replyEn.trim()
      ) {
        throw new Error(
          'Invalid response from Gemini'
        );
      }

      return {
        replyEn: payload.replyEn,
        replyFa: payload.replyFa || '',

        feedback: {
          grammarScore:
            typeof payload.grammarScore === 'number'
              ? payload.grammarScore
              : 0,

          correctedSentence:
            payload.correctedSentence,

          explanationFa:
            payload.explanationFa,

          genderNoteFa:
            payload.genderNoteFa,

          betterAlternatives:
            Array.isArray(
              payload.betterAlternatives
            )
              ? payload.betterAlternatives
              : [],

          vocabularyTips:
            Array.isArray(
              payload.vocabHighlights
            )
              ? payload.vocabHighlights.map(
                  (item: {
                    word?: string;
                    meaningFa?: string;
                  }) =>
                    `${item.word || ''}: ${
                      item.meaningFa || ''
                    }`
                )
              : [],

          persianTranslation:
            payload.replyFa || '',
        },

        providerUsed: 'gemini_cloud',
      };
    } catch (error: unknown) {
      console.error(
        '[AIManager] Gemini request failed:',
        error
      );

      return this.getOfflineFallback(
        req,
        error instanceof Error
          ? error.message
          : 'unknown_error'
      );
    }
  }

  private getOfflineFallback(
    req: ChatExplainRequest,
    reason?: string
  ): ChatExplainResponse {
    console.warn(
      `[AIManager] Offline fallback: ${
        reason || 'unknown'
      }`
    );

    const offlineRes =
      analyzeOfflineMessage(
        req.userText,
        req.personaId || 'alex_casual',
        req.dialect || 'en-US'
      );

    return {
      replyEn: offlineRes.replyEn,
      replyFa: offlineRes.replyFa || '',

      feedback: {
        grammarScore:
          offlineRes.grammarScore || 0,

        correctedSentence:
          offlineRes.correctedSentence,

        explanationFa:
          offlineRes.explanationFa,

        genderNoteFa:
          offlineRes.genderNoteFa,

        betterAlternatives:
          offlineRes.betterAlternatives || [],

        vocabularyTips:
          offlineRes.vocabularyTips || [],

        persianTranslation:
          offlineRes.replyFa || '',
      },

      providerUsed:
        `offline_nlp_engine${
          reason ? ` (${reason})` : ''
        }`,
    };
  }

  public async sendScenarioMessage(
    req: any
  ): Promise<any> {
    const baseUrl = getApiBaseUrl();

    if (!baseUrl) {
      return this.getScenarioOfflineFallback(
        req,
        'no-api-url'
      );
    }

    try {
      const response =
        await fetchWithTimeout(
          `${baseUrl}/api/scenario-chat`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userText: req.userText,
              history: req.history,
              persona: req.persona,
              dialect: req.dialect,
              userGender: req.gender,
              userLevel: req.level,
            }),
          },
          20000
        );

      if (!response.ok) {
        throw new Error(
          `HTTP ${response.status}`
        );
      }

      const data = await response.json();

      return {
        ...data.data,
        providerUsed: 'gemini_cloud',
      };
    } catch (error: unknown) {
      console.error(
        '[AIManager] Scenario request failed:',
        error
      );

      return this.getScenarioOfflineFallback(
        req,
        error instanceof Error
          ? error.message
          : String(error)
      );
    }
  }

  private getScenarioOfflineFallback(
    req: any,
    reason?: string
  ): any {
    const offlineRes =
      analyzeOfflineMessage(
        req.userText,
        req.persona?.id ||
          'alex_casual',
        req.dialect || 'en-US'
      );

    return {
      replyEn: offlineRes.replyEn,
      replyFa: offlineRes.replyFa || '',
      grammarScore:
        offlineRes.grammarScore || 0,

      correctedSentence:
        offlineRes.correctedSentence,

      explanationFa:
        offlineRes.explanationFa,

      betterAlternatives:
        offlineRes.betterAlternatives || [],

      providerUsed:
        `offline_nlp_engine${
          reason ? ` (${reason})` : ''
        }`,
    };
  }
}

export const aiManager = new AIManager();
