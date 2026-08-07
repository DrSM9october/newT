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

export function startSpeechRecognition(
  accent: SupportedAccent = 'en-US',
  onResult: (transcript: string, isFinal: boolean) => void,
  onError: (error: string) => void,
  onEnd: () => void
): { stop: () => void } | null {
  const SpeechRecognition =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  if (!SpeechRecognition) {
    onError('دستگاه یا مرورگر شما از قابلیت تبدیل گفتار به متن پشتیبانی نمی‌کند.');
    return null;
  }

  try {
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;

    let langCode: string = accent;
    if (accent === 'ar-IQ' || accent === 'ar-LB') {
      langCode = 'ar-SA'; // Standard Arabic for voice STT
    }
    recognition.lang = langCode;

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
        onResult(text, Boolean(finalTranscript));
      }
    };

    recognition.onerror = (event: any) => {
      console.warn('Speech recognition error:', event.error);
      onError(`خطای ضبط صدا: ${event.error}`);
    };

    recognition.onend = () => {
      onEnd();
    };

    recognition.start();

    return {
      stop: () => {
        try {
          recognition.stop();
        } catch (e) {
          // ignore stop errors
        }
      },
    };
  } catch (err: any) {
    onError('امکان فعال‌سازی میکروفون وجود ندارد.');
    return null;
  }
}

// Local Offline Fallback Translator & Responder Engine
export function generateOfflineReply(
  userText: string,
  dialect: SupportedAccent = 'en-US',
  gender: string = 'masculine'
): {
  replyEn: string;
  replyFa: string;
  explanationFa: string;
  genderNoteFa?: string;
} {
  const lower = userText.toLowerCase().trim();

  // Greetings
  if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey') || lower.includes('شلون') || lower.includes('كيف')) {
    if (dialect === 'ar-IQ') {
      const isFem = gender === 'feminine';
      return {
        replyEn: isFem ? 'هلا بيكِ عيني! شلونچ اليوم؟' : 'هلا بيك عيني! شلونك اليوم؟',
        replyFa: 'خوش آمدی عزیزم! امروز چطوری؟ (پاسخ موتور آفلاین)',
        explanationFa: 'تشخیص آفلاین: سلام و احوالپرسی محلی عراقی.',
        genderNoteFa: isFem ? 'در لهجه عراقی برای خانم‌ها "شلونچ" استفاده می‌شود.' : 'در لهجه عراقی برای آقایان "شلونك" استفاده می‌شود.',
      };
    }
    if (dialect === 'ar-LB') {
      const isFem = gender === 'feminine';
      return {
        replyEn: isFem ? 'اهلين وسهلين! كيفيك اليوم؟' : 'اهلين وسهلين! كيفك يا زلمة؟',
        replyFa: 'خوش آمدی! امروز چطوری؟ (پاسخ موتور آفلاین)',
        explanationFa: 'تشخیص آفلاین: احوالپرسی صمیمی لبنانی.',
        genderNoteFa: isFem ? 'برای بانوان "كيفيك" گفته می‌شود.' : 'برای آقایان "كيفك" گفته می‌شود.',
      };
    }
    return {
      replyEn: "Hello! I heard you clearly. Since you're offline, I am using the embedded local offline engine!",
      replyFa: 'سلام! صدای شما را واضح شنیدم. به دلیل عدم اتصال اینترنت، موتور آفلاین محلی در حال پاسخگویی است!',
      explanationFa: 'پردازش آفلاین: جمله شما با موفقیت به متن تبدیل و ترجمه شد.',
    };
  }

  // Food / Coffee / Market
  if (lower.includes('coffee') || lower.includes('tea') || lower.includes('قهوة') || lower.includes('چاي') || lower.includes('price')) {
    return {
      replyEn: dialect.startsWith('ar') ? 'تكرم عينك! هسا نحضرلك الطلب.' : 'Sure thing! Here is your order right away.',
      replyFa: 'به روی چشم! همین الان سفارشتان آماده می‌شود. (آفلاین)',
      explanationFa: 'تشخیص آفلاین عبارت‌های سفارشی و کافه.',
    };
  }

  // Generic offline fallback
  return {
    replyEn: `I received: "${userText}". How can I assist you further?`,
    replyFa: `پیام دریافت شده: "${userText}". چطور می‌توانم بیشتر کمکتان کنم؟ (موتور آفلاین)`,
    explanationFa: 'پردازش صدا و متن در حالت آفلاین محلی.',
  };
}

export function stopSpeaking(): void {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}


