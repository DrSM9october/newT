import { DialectType } from '../types';

export type SupportedAccent = DialectType;

export const ACCENT_CONFIGS: { code: SupportedAccent; labelFa: string; labelEn: string; flag: string }[] = [
  { code: 'en-US', labelFa: 'آمریکایی (US)', labelEn: 'American', flag: '🇺🇸' },
  { code: 'en-GB', labelFa: 'بریتانیایی (UK)', labelEn: 'British', flag: '🇬🇧' },
  { code: 'ar-IQ', labelFa: 'عراقی (Iraqi)', labelEn: 'Iraqi Dialect', flag: '🇮🇶' },
  { code: 'ar-LB', labelFa: 'لبنانی (Lebanese)', labelEn: 'Lebanese Dialect', flag: '🇱🇧' },
];

export function speakEnglishText(
  text: string,
  rate: number = 1.0,
  accent: SupportedAccent = 'en-US'
): Promise<void> {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) {
      console.warn('Speech synthesis not supported in this browser environment.');
      resolve();
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Set appropriate lang code
    let langCode: string = accent;
    if (accent === 'ar-IQ' || accent === 'ar-LB') {
      langCode = 'ar-SA'; // Standard Arabic TTS voice fallback for Arabic dialects
    }
    utterance.lang = langCode;
    utterance.rate = rate;

    // Pick appropriate voice matching accent code or language prefix
    const voices = window.speechSynthesis.getVoices();
    const prefix = accent.slice(0, 2); // 'en' or 'ar'
    const exactVoice = voices.find((v) => v.lang === accent || v.lang.replace('_', '-') === accent);
    const langVoice = voices.find((v) => v.lang.startsWith(prefix));
    
    if (exactVoice) {
      utterance.voice = exactVoice;
    } else if (langVoice) {
      utterance.voice = langVoice;
    }

    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();

    window.speechSynthesis.speak(utterance);
  });
}

export function stopSpeaking(): void {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}


