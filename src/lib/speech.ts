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

export function speakEnglishText(
  text: string,
  rate: number = 1.0,
  accent: SupportedAccent = 'en-US',
  pitch: number = 1.0
): Promise<void> {
  return new Promise((resolve) => {
    if (!text || !text.trim()) {
      resolve();
      return;
    }

    const cleanText = text.trim();
    let langCode: string = accent;
    if (accent === 'ar-IQ' || accent === 'ar-LB') {
      langCode = 'ar-SA';
    }

    if (activeAudioFallback) {
      try {
        activeAudioFallback.pause();
        activeAudioFallback = null;
      } catch (e) {
        // ignore
      }
    }

    const playAudioFallback = () => {
      try {
        const audioUrl = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${encodeURIComponent(
          langCode
        )}&q=${encodeURIComponent(cleanText)}`;
        const audio = new Audio(audioUrl);
        audio.playbackRate = rate;
        activeAudioFallback = audio;
        audio.onended = () => {
          activeAudioFallback = null;
          resolve();
        };
        audio.onerror = () => {
          activeAudioFallback = null;
          playAudioToneFallback();
          resolve();
        };
        audio.play().catch(() => {
          playAudioToneFallback();
          resolve();
        });
      } catch (err) {
        playAudioToneFallback();
        resolve();
      }
    };

    const playAudioToneFallback = () => {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;
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
      } catch (e) {
        // ignore
      }
    };

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();

        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }

        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = langCode;
        utterance.rate = rate;
        utterance.pitch = pitch;

        (window as any)._activeUtteranceRef = utterance;

        const voices = window.speechSynthesis.getVoices();
        const prefix = accent.slice(0, 2);
        const exactVoice = voices.find((v) => v.lang === accent || v.lang.replace('_', '-') === accent);
        const langVoice = voices.find((v) => v.lang.startsWith(prefix));

        if (exactVoice) {
          utterance.voice = exactVoice;
        } else if (langVoice) {
          utterance.voice = langVoice;
        }

        let hasResolved = false;
        const safeResolve = () => {
          if (!hasResolved) {
            hasResolved = true;
            (window as any)._activeUtteranceRef = null;
            resolve();
          }
        };

        const timeoutId = setTimeout(() => {
          if (!hasResolved) {
            window.speechSynthesis.cancel();
            playAudioFallback();
          }
        }, Math.max(2500, cleanText.length * 200));

        utterance.onend = () => {
          clearTimeout(timeoutId);
          safeResolve();
        };

        utterance.onerror = (evt) => {
          clearTimeout(timeoutId);
          playAudioFallback();
        };

        window.speechSynthesis.speak(utterance);

        if (window.speechSynthesis.speaking) {
          window.speechSynthesis.resume();
        }
        return;
      } catch (e) {
        playAudioFallback();
        return;
      }
    }

    playAudioFallback();
  });
}
