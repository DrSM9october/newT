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
      langCode = 'ar-SA';
    }

    const playAudioFallback = () => {
      try {
        // Use client=gtx endpoint for reliable TTS playback
        const audioUrl = `https://translate.google.com/translate_tts?ie=UTF-8&client=gtx&tl=${encodeURIComponent(
          langCode
        )}&q=${encodeURIComponent(cleanText)}`;
        const audio = new Audio(audioUrl);
        audio.playbackRate = Math.min(Math.max(rate, 0.75), 1.25);
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
        if (!AudioCtx) {
          resolve();
          return;
        }
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
      resolve();
    };

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }

        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = langCode;
        utterance.rate = Math.min(Math.max(rate, 0.6), 1.4);

        // Adjust pitch according to gender preference
        if (gender === 'male') {
          utterance.pitch = Math.max(0.7, Math.min(pitch * 0.85, 0.95));
        } else {
          utterance.pitch = Math.min(1.3, Math.max(pitch * 1.05, 1.0));
        }

        (window as any)._activeUtteranceRef = utterance;

        const voices = cachedVoices.length > 0 ? cachedVoices : window.speechSynthesis.getVoices();
        const prefix = langCode.slice(0, 2);

        // Find matching voices for the language
        const matchingLangVoices = voices.filter(
          (v) =>
            v.lang === langCode ||
            v.lang.replace('_', '-') === langCode ||
            v.lang.toLowerCase().startsWith(prefix.toLowerCase())
        );

        const MALE_KEYWORDS = [
          'male', 'david', 'mark', 'george', 'daniel', 'james', 'richard',
          'alex', 'brian', 'ryan', 'guy', 'stefan', 'maged', 'naayf', 'shakir',
          'tarik', 'thomas', 'oliver', 'paul', 'rishi', 'fred', 'dylan', 'john',
          'mike', 'steven', 'tom', 'sam'
        ];

        const FEMALE_KEYWORDS = [
          'female', 'zira', 'samantha', 'victoria', 'karen', 'mona', 'salma',
          'laila', 'hazel', 'jenny', 'aria', 'sonia', 'emma', 'susan', 'fiona',
          'veena'
        ];

        let selectedVoice: SpeechSynthesisVoice | undefined;

        if (gender === 'male') {
          selectedVoice = matchingLangVoices.find((v) =>
            MALE_KEYWORDS.some((kw) => v.name.toLowerCase().includes(kw))
          );
        } else {
          selectedVoice = matchingLangVoices.find((v) =>
            FEMALE_KEYWORDS.some((kw) => v.name.toLowerCase().includes(kw))
          );
        }

        if (!selectedVoice && matchingLangVoices.length > 0) {
          selectedVoice = matchingLangVoices[0];
        }

        if (selectedVoice) {
          utterance.voice = selectedVoice;
        }

        let hasEnded = false;
        const safeResolve = () => {
          if (!hasEnded) {
            hasEnded = true;
            (window as any)._activeUtteranceRef = null;
            resolve();
          }
        };

        // Safety fallback after 15 seconds if utterance hangs
        const safetyTimeout = setTimeout(() => {
          if (!hasEnded) {
            hasEnded = true;
            try {
              window.speechSynthesis.cancel();
            } catch (e) {
              // ignore
            }
            resolve();
          }
        }, Math.max(10000, cleanText.length * 400));

        utterance.onend = () => {
          clearTimeout(safetyTimeout);
          safeResolve();
        };

        utterance.onerror = () => {
          clearTimeout(safetyTimeout);
          playAudioFallback();
        };

        window.speechSynthesis.speak(utterance);

        // Resume if browser suspended speechSynthesis
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

