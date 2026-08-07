import { DialectType, GenderType } from '../types';
import { speakEnglishText, SupportedAccent } from '../lib/speech';

export interface SpeechRecognitionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
  engineUsed: 'web_speech_api' | 'vosk_offline_worker';
}

export class SpeechManager {
  private isListening: boolean = false;

  public async speak(text: string, accent: SupportedAccent = 'en-US'): Promise<void> {
    speakEnglishText(text, accent);
  }

  public isSpeechRecognitionSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
  }

  public startRecognition(
    onResult: (result: SpeechRecognitionResult) => void,
    onError?: (err: any) => void,
    accent: SupportedAccent = 'en-US'
  ): void {
    if (!this.isSpeechRecognitionSupported()) {
      if (onError) onError(new Error('مرورگر شما از تشخیص گفتار صوتی پشتیبانی نمی‌کند.'));
      return;
    }

    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognitionClass();

    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = accent;

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      const text = finalTranscript || interimTranscript;
      if (text) {
        onResult({
          transcript: text,
          confidence: 0.9,
          isFinal: Boolean(finalTranscript),
          engineUsed: 'web_speech_api',
        });
      }
    };

    recognition.onerror = (event: any) => {
      if (onError) onError(event);
    };

    recognition.start();
  }
}

export const speechManager = new SpeechManager();
