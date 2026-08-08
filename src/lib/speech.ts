export type SupportedAccent = 'en-US' | 'en-GB' | 'en-AU' | 'ar-IQ' | 'ar-LB';

export interface AccentConfig {
  code: SupportedAccent;
  labelFa: string;
  labelEn: string;
  flag: string;
}

export const ACCENT_CONFIGS: AccentConfig[] = [
  { code: 'en-US', labelFa: 'آمریکایی (US)', labelEn: 'American Accent', flag: '🇺🇸' },
  { code: 'en-GB', labelFa: 'بریتانیایی (UK)', labelEn: 'British Accent', flag: '🇬🇧' },
  { code: 'en-AU', labelFa: 'استرالیایی (AU)', labelEn: 'Australian Accent', flag: '🇦🇺' },
  { code: 'ar-IQ', labelFa: 'عراقی (Iraqi)', labelEn: 'Iraqi Dialect', flag: '🇮🇶' },
  { code: 'ar-LB', labelFa: 'لبنانی (Lebanese)', labelEn: 'Lebanese Dialect', flag: '🇱🇧' },
];

let activeAudioFallback: HTMLAudioElement | null = null;

// Pre-load voices on browser startup
let cachedVoices: SpeechSynthesisVoice[] = [];

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  const loadVoices = () => {
    try {
      cachedVoices = window.speechSynthesis.getVoices();
    } catch (e) {
      // ignore
    }
  };
  loadVoices();
  if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }
}

export function stopSpeech(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch (e) {
      // ignore
    }
  }
  if (activeAudioFallback) {
    try {
      activeAudioFallback.pause();
      activeAudioFallback = null;
    } catch (e) {
      // ignore
    }
  }
}

export function speakEnglishText(
  text: string,
  rate: number = 1.0,
  accent: SupportedAccent = 'en-US',
  pitch: number = 1.0,
  gender: 'male' | 'female' = 'female'
): Promise<void> {
  return new Promise((resolve) => {
    if (!text || !text.trim()) {
      resolve();
      return;
    }

    stopSpeech();

    const cleanText = text.trim();
    let langCode: string = accent;
    if (accent === 'ar-IQ' || accent === 'ar-LB') {
      langCode = 'ar';
    }

    const playAudioToneFallback = () => {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(587.33, ctx.currentTime);
          gain.gain.setValueAtTime(0.15, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.3);
        }
      } catch (e) {
        // ignore
      }
      resolve();
    };

    // Method 2: Client Web Speech API (SpeechSynthesis) for Offline Mode
    const playWebSpeechFallback = () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
          if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
          }

          const utterance = new SpeechSynthesisUtterance(cleanText);
          utterance.lang = langCode;
          utterance.rate = Math.min(Math.max(rate, 0.6), 1.4);

          if (gender === 'male') {
            utterance.pitch = Math.max(0.7, Math.min(pitch * 0.85, 0.95));
          } else {
            utterance.pitch = Math.min(1.3, Math.max(pitch * 1.05, 1.0));
          }

          const voices = cachedVoices.length > 0 ? cachedVoices : window.speechSynthesis.getVoices();
          const prefix = langCode.slice(0, 2);

          const matchingLangVoices = voices.filter(
            (v) =>
              v.lang === langCode ||
              v.lang.replace('_', '-') === langCode ||
              v.lang.toLowerCase().startsWith(prefix.toLowerCase())
          );

          if (matchingLangVoices.length > 0) {
            utterance.voice = matchingLangVoices[0];
          }

          let done = false;
          utterance.onend = () => {
            if (!done) {
              done = true;
              resolve();
            }
          };

          utterance.onerror = () => {
            if (!done) {
              done = true;
              playAudioToneFallback();
            }
          };

          window.speechSynthesis.speak(utterance);

          // Safety timeout for web speech synthesis
          setTimeout(() => {
            if (!done) {
              done = true;
              resolve();
            }
          }, Math.max(3000, cleanText.length * 200));

          return;
        } catch (e) {
          playAudioToneFallback();
          return;
        }
      }
      playAudioToneFallback();
    };

    // Method 1: High-Quality Server-Side Audio Stream (/api/tts)
    try {
      const audioUrl = `/api/tts?text=${encodeURIComponent(cleanText)}&lang=${encodeURIComponent(langCode)}`;
      const audio = new Audio(audioUrl);
      audio.playbackRate = Math.min(Math.max(rate, 0.75), 1.25);
      activeAudioFallback = audio;

      audio.onended = () => {
        activeAudioFallback = null;
        resolve();
      };

      audio.onerror = () => {
        activeAudioFallback = null;
        playWebSpeechFallback();
      };

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          activeAudioFallback = null;
          playWebSpeechFallback();
        });
      }
    } catch (err) {
      playWebSpeechFallback();
    }
  });
}
