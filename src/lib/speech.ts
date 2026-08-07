export type SupportedAccent = 'en-US' | 'en-GB';

export const ACCENT_CONFIGS: { code: SupportedAccent; labelFa: string; labelEn: string; flag: string }[] = [
  { code: 'en-US', labelFa: 'آمریکایی (US)', labelEn: 'American', flag: '🇺🇸' },
  { code: 'en-GB', labelFa: 'بریتانیایی (UK)', labelEn: 'British', flag: '🇬🇧' },
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
    utterance.lang = accent;
    utterance.rate = rate;

    // Pick appropriate English voice matching accent code
    const voices = window.speechSynthesis.getVoices();
    const exactVoice = voices.find((v) => v.lang === accent || v.lang.replace('_', '-') === accent);
    const fallbackVoice = voices.find((v) => v.lang.startsWith(accent.slice(0, 2)) || v.lang.startsWith('en'));
    
    if (exactVoice) {
      utterance.voice = exactVoice;
    } else if (fallbackVoice) {
      utterance.voice = fallbackVoice;
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

