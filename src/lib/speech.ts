export type SupportedAccent =
  | 'fa'
  | 'fa-IR'
  | 'en-US'
  | 'en-GB'
  | 'ar-IQ'
  | 'ar-LB';

export type TtsProvider =
  | 'auto'
  | 'open-source'
  | 'native'
  | 'web'
  | 'google'
  | 'azure'
  | 'elevenlabs';

export interface AccentConfig {
  code: SupportedAccent;
  labelFa: string;
  labelEn: string;
  flag: string;
}

export const ACCENT_CONFIGS: AccentConfig[] = [
  {
    code: 'fa-IR',
    labelFa: 'فارسی',
    labelEn: 'Persian',
    flag: '🇮🇷',
  },
  {
    code: 'en-US',
    labelFa: 'آمریکایی (US)',
    labelEn: 'American Accent',
    flag: '🇺🇸',
  },
  {
    code: 'en-GB',
    labelFa: 'بریتانیایی (UK)',
    labelEn: 'British Accent',
    flag: '🇬🇧',
  },
  {
    code: 'ar-IQ',
    labelFa: 'عراقی (Iraqi)',
    labelEn: 'Iraqi Dialect',
    flag: '🇮🇶',
  },
  {
    code: 'ar-LB',
    labelFa: 'لبنانی (Lebanese)',
    labelEn: 'Lebanese Dialect',
    flag: '🇱🇧',
  },
];

let activeAudio: HTMLAudioElement | null = null;
let activeObjectUrl: string | null = null;

let cachedVoices: SpeechSynthesisVoice[] = [];

const STORAGE_KEY = 'linguaai-tts-provider';
const ONLINE_PROVIDER_KEY =
  'linguaai-online-tts-provider';

const DEFAULT_PROVIDER: TtsProvider = 'auto';

function getNativeBridge(): any {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return (window as any).AndroidTTS || null;
  } catch {
    return null;
  }
}

function getApiBaseUrl(): string {
  try {
    const configured =
      typeof import.meta !== 'undefined'
        ? (import.meta as any).env
            ?.VITE_API_BASE_URL
        : '';

    if (
      configured &&
      typeof configured === 'string'
    ) {
      return configured.replace(/\/+$/, '');
    }
  } catch {
    // ignore
  }

  return '';
}

export function getTtsProvider(): TtsProvider {
  if (typeof window === 'undefined') {
    return DEFAULT_PROVIDER;
  }

  try {
    const value =
      window.localStorage.getItem(
        STORAGE_KEY
      );

    if (
      value === 'auto' ||
      value === 'open-source' ||
      value === 'native' ||
      value === 'web' ||
      value === 'google' ||
      value === 'azure' ||
      value === 'elevenlabs'
    ) {
      return value;
    }
  } catch {
    // ignore
  }

  return DEFAULT_PROVIDER;
}

export function setTtsProvider(
  provider: TtsProvider
): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      provider
    );
  } catch {
    // ignore
  }
}

export function getTtsProviderLabel(
  provider: TtsProvider
): string {
  switch (provider) {
    case 'open-source':
      return 'Open Source TTS';

    case 'native':
      return 'Android Native';

    case 'web':
      return 'Web Speech';

    case 'google':
      return 'Google Cloud';

    case 'azure':
      return 'Microsoft Azure';

    case 'elevenlabs':
      return 'ElevenLabs';

    case 'auto':
    default:
      return 'خودکار (Open Source → Cloud → Native)';
  }
}

function cleanupAudio(): void {
  if (activeAudio) {
    try {
      activeAudio.pause();
      activeAudio.src = '';
    } catch {
      // ignore
    }

    activeAudio = null;
  }

  if (activeObjectUrl) {
    try {
      URL.revokeObjectURL(
        activeObjectUrl
      );
    } catch {
      // ignore
    }

    activeObjectUrl = null;
  }
}

export function stopSpeech(): void {
  const native = getNativeBridge();

  if (
    native &&
    typeof native.stop === 'function'
  ) {
    try {
      native.stop();
    } catch {
      // ignore
    }
  }

  if (
    typeof window !== 'undefined' &&
    'speechSynthesis' in window
  ) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // ignore
    }
  }

  cleanupAudio();
}

function normalizeLanguage(
  accent: SupportedAccent
): string {
  if (accent === 'fa') {
    return 'fa-IR';
  }

  if (
    accent === 'ar-IQ' ||
    accent === 'ar-LB'
  ) {
    return 'ar';
  }

  return accent;
}

function getNativeLanguage(
  accent: SupportedAccent
): string {
  switch (accent) {
    case 'fa':
    case 'fa-IR':
      return 'fa-IR';

    case 'en-GB':
      return 'en-GB';

    case 'ar-IQ':
      return 'ar-IQ';

    case 'ar-LB':
      return 'ar-LB';

    case 'en-US':
    default:
      return 'en-US';
  }
}

function nativeSpeak(
  text: string,
  rate: number,
  accent: SupportedAccent,
  pitch: number
): Promise<void> {
  return new Promise(
    (resolve, reject) => {
      const native =
        getNativeBridge();

      if (
        !native ||
        typeof native.speak !== 'function'
      ) {
        reject(
          new Error(
            'native-tts-unavailable'
          )
        );
        return;
      }

      const requestId =
        `tts-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}`;

      let finished = false;

      let timeoutId:
        | ReturnType<typeof setTimeout>
        | null = null;

      const cleanupCallbacks =
        () => {
          try {
            delete (window as any)
              .__linguaNativeTtsStarted;
          } catch {
            // ignore
          }

          try {
            delete (window as any)
              .__linguaNativeTtsDone;
          } catch {
            // ignore
          }

          try {
            delete (window as any)
              .__linguaNativeTtsError;
          } catch {
            // ignore
          }

          if (timeoutId !== null) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }
        };

      const finish = () => {
        if (finished) return;

        finished = true;
        cleanupCallbacks();
        resolve();
      };

      const fail = (
        errorMessage =
          'native-tts-error'
      ) => {
        if (finished) return;

        finished = true;
        cleanupCallbacks();

        reject(
          new Error(errorMessage)
        );
      };

      if (
        typeof window !== 'undefined'
      ) {
        (window as any)
          .__linguaNativeTtsStarted =
          (id: string) => {
            if (id === requestId) {
              // Native playback started.
            }
          };

        (window as any)
          .__linguaNativeTtsDone =
          (id: string) => {
            if (id === requestId) {
              finish();
            }
          };

        (window as any)
          .__linguaNativeTtsError =
          (id: string) => {
            if (
              id === requestId ||
              id === 'native-tts-error'
            ) {
              fail();
            }
          };
      }

      try {
        native.speak(
          text,
          getNativeLanguage(accent),
          Math.min(
            Math.max(rate, 0.1),
            2.0
          ),
          Math.min(
            Math.max(pitch, 0.1),
            2.0
          ),
          requestId
        );
      } catch {
        fail();
        return;
      }

      timeoutId = setTimeout(
        () => {
          if (!finished) {
            fail(
              'native-tts-timeout'
            );
          }
        },
        Math.max(
          15000,
          text.length * 500
        )
      );
    }
  );
}

type OnlineTtsProvider =
  | 'google'
  | 'azure'
  | 'elevenlabs';

async function serverSpeak(
  provider: OnlineTtsProvider,
  text: string,
  rate: number,
  accent: SupportedAccent,
  pitch: number,
  gender: 'male' | 'female' = 'female'
): Promise<void> {
  const baseUrl =
    getApiBaseUrl();

  if (!baseUrl) {
    throw new Error(
      'cloud-tts-not-configured'
    );
  }

  const endpoint =
    `${baseUrl}/api/tts`;

  const response =
    await fetch(endpoint, {
      method: 'POST',

      headers: {
        'Content-Type':
          'application/json',
      },

      body: JSON.stringify({
        provider,
        text,
        lang: accent,
        rate,
        pitch,
        gender,
      }),
    });

  if (!response.ok) {
    let message =
      `tts-http-${response.status}`;

    try {
      const data =
        await response.json();

      if (data?.error) {
        message = data.error;
      }
    } catch {
      // ignore
    }

    throw new Error(message);
  }

  const contentType =
    response.headers.get(
      'content-type'
    ) || '';

  if (
    !contentType.includes('audio')
  ) {
    throw new Error(
      'tts-invalid-audio-response'
    );
  }

  const blob =
    await response.blob();

  if (!blob.size) {
    throw new Error(
      'tts-empty-audio'
    );
  }

  cleanupAudio();

  const objectUrl =
    URL.createObjectURL(blob);

  activeObjectUrl =
    objectUrl;

  const audio =
    new Audio(objectUrl);

  activeAudio =
    audio;

  audio.playbackRate =
    Math.min(
      Math.max(rate, 0.5),
      2.0
    );

  await new Promise<void>(
    (resolve, reject) => {
      let done = false;

      const finish = () => {
        if (done) return;

        done = true;
        cleanupAudio();
        resolve();
      };

      const fail = () => {
        if (done) return;

        done = true;
        cleanupAudio();

        reject(
          new Error(
            'tts-audio-playback-failed'
          )
        );
      };

      audio.onended =
        finish;

      audio.onerror =
        fail;

      audio
        .play()
        .catch(fail);
    }
  );
}

async function openSourceSpeak(
  text: string,
  rate: number,
  accent: SupportedAccent,
  pitch: number,
  gender: 'male' | 'female'
): Promise<void> {
  const baseUrl =
    getApiBaseUrl();

  if (!baseUrl) {
    throw new Error(
      'open-source-tts-not-configured'
    );
  }

  const response =
    await fetch(
      `${baseUrl}/api/tts`,
      {
        method: 'POST',

        headers: {
          'Content-Type':
            'application/json',
        },

        body: JSON.stringify({
          provider:
            'open-source',
          text,
          lang: accent,
          rate,
          pitch,
          gender,
        }),
      }
    );

  if (!response.ok) {
    let message =
      `open-source-tts-http-${response.status}`;

    try {
      const data =
        await response.json();

      if (data?.error) {
        message = data.error;
      }
    } catch {
      // ignore
    }

    throw new Error(message);
  }

  const contentType =
    response.headers.get(
      'content-type'
    ) || '';

  if (
    !contentType.includes('audio')
  ) {
    throw new Error(
      'open-source-invalid-audio'
    );
  }

  const blob =
    await response.blob();

  if (!blob.size) {
    throw new Error(
      'open-source-empty-audio'
    );
  }

  cleanupAudio();

  const objectUrl =
    URL.createObjectURL(blob);

  activeObjectUrl =
    objectUrl;

  const audio =
    new Audio(objectUrl);

  activeAudio =
    audio;

  audio.playbackRate =
    Math.min(
      Math.max(rate, 0.5),
      2.0
    );

  await new Promise<void>(
    (resolve, reject) => {
      let finished = false;

      const finish = () => {
        if (finished) return;

        finished = true;
        cleanupAudio();
        resolve();
      };

      const fail = () => {
        if (finished) return;

        finished = true;
        cleanupAudio();

        reject(
          new Error(
            'open-source-audio-playback-failed'
          )
        );
      };

      audio.onended =
        finish;

      audio.onerror =
        fail;

      audio
        .play()
        .catch(fail);
    }
  );
}

function webSpeechSpeak(
  text: string,
  rate: number,
  accent: SupportedAccent,
  pitch: number,
  gender: 'male' | 'female'
): Promise<void> {
  return new Promise(
    (
      resolve,
      reject
    ) => {
      if (
        typeof window ===
          'undefined' ||
        !(
          'speechSynthesis' in
          window
        )
      ) {
        reject(
          new Error(
            'web-speech-unavailable'
          )
        );

        return;
      }

      try {
        const langCode =
          normalizeLanguage(
            accent
          );

        if (
          window.speechSynthesis
            .paused
        ) {
          window.speechSynthesis
            .resume();
        }

        const utterance =
          new SpeechSynthesisUtterance(
            text
          );

        utterance.lang =
          langCode;

        utterance.rate =
          Math.min(
            Math.max(rate, 0.6),
            1.4
          );

        utterance.pitch =
          gender === 'male'
            ? Math.max(
                0.7,
                Math.min(
                  pitch * 0.85,
                  0.95
                )
              )
            : Math.min(
                1.3,
                Math.max(
                  pitch * 1.05,
                  1.0
                )
              );

        const voices =
          cachedVoices.length > 0
            ? cachedVoices
            : window.speechSynthesis
                .getVoices();

        const prefix =
          langCode
            .slice(0, 2)
            .toLowerCase();

        const matchingVoices =
          voices.filter(
            (voice) => {
              const voiceLang =
                voice.lang
                  .replace(
                    '_',
                    '-'
                  )
                  .toLowerCase();

              return (
                voiceLang ===
                  langCode.toLowerCase() ||
                voiceLang.startsWith(
                  prefix
                )
              );
            }
          );

        if (
          matchingVoices.length > 0
        ) {
          utterance.voice =
            matchingVoices[0];
        }

        let finished = false;

        const finish = () => {
          if (finished) return;

          finished = true;
          resolve();
        };

        const fail = () => {
          if (finished) return;

          finished = true;

          reject(
            new Error(
              'web-speech-error'
            )
          );
        };

        utterance.onend =
          finish;

        utterance.onerror =
          fail;

        window.speechSynthesis
          .cancel();

        window.speechSynthesis
          .speak(
            utterance
          );

        setTimeout(
          () => {
            if (!finished) {
              finish();
            }
          },
          Math.max(
            5000,
            text.length * 250
          )
        );
      } catch (error) {
        reject(error);
      }
    }
  );
}

async function tryCloudProviders(
  text: string,
  rate: number,
  accent: SupportedAccent,
  pitch: number,
  gender: 'male' | 'female'
): Promise<void> {
  const providers:
    OnlineTtsProvider[] = [
      'google',
      'azure',
      'elevenlabs',
    ];

  let preferred:
    OnlineTtsProvider =
      'google';

  try {
    if (
      typeof window !==
      'undefined'
    ) {
      const saved =
        window.localStorage.getItem(
          ONLINE_PROVIDER_KEY
        );

      if (
        saved === 'google' ||
        saved === 'azure' ||
        saved === 'elevenlabs'
      ) {
        preferred = saved;
      }
    }
  } catch {
    // ignore
  }

  const ordered =
    [
      preferred,
      ...providers.filter(
        (provider) =>
          provider !==
          preferred
      ),
    ];

  let lastError:
    | unknown = null;

  for (
    const provider of ordered
  ) {
    try {
      await serverSpeak(
        provider,
        text,
        rate,
        accent,
        pitch,
        gender
      );

      return;
    } catch (error) {
      lastError = error;

      console.warn(
        `[LinguaAI TTS] ${provider} failed:`,
        error
      );
    }
  }

  throw (
    lastError ||
    new Error(
      'all-cloud-tts-providers-failed'
    )
  );
}

async function speakWithProvider(
  provider: TtsProvider,
  text: string,
  rate: number,
  accent: SupportedAccent,
  pitch: number,
  gender: 'male' | 'female'
): Promise<void> {
  if (
    provider ===
    'open-source'
  ) {
    await openSourceSpeak(
      text,
      rate,
      accent,
      pitch,
      gender
    );

    return;
  }

  if (
    provider === 'native'
  ) {
    await nativeSpeak(
      text,
      rate,
      accent,
      pitch
    );

    return;
  }

  if (
    provider === 'web'
  ) {
    await webSpeechSpeak(
      text,
      rate,
      accent,
      pitch,
      gender
    );

    return;
  }

  if (
    provider === 'google' ||
    provider === 'azure' ||
    provider === 'elevenlabs'
  ) {
    await serverSpeak(
      provider,
      text,
      rate,
      accent,
      pitch,
      gender
    );

    return;
  }

  if (
    provider === 'auto'
  ) {
    /*
     * اولویت اصلی:
     * Open Source TTS
     */
    try {
      await openSourceSpeak(
        text,
        rate,
        accent,
        pitch,
        gender
      );

      return;
    } catch (error) {
      console.warn(
        '[LinguaAI TTS] Open Source failed:',
        error
      );
    }

    /*
     * مرحله دوم:
     * Cloud TTS
     */
    try {
      await tryCloudProviders(
        text,
        rate,
        accent,
        pitch,
        gender
      );

      return;
    } catch (error) {
      console.warn(
        '[LinguaAI TTS] Cloud failed:',
        error
      );
    }

    /*
     * مرحله سوم:
     * Android Native
     */
    try {
      await nativeSpeak(
        text,
        rate,
        accent,
        pitch
      );

      return;
    } catch (error) {
      console.warn(
        '[LinguaAI TTS] Native failed:',
        error
      );
    }

    /*
     * مرحله چهارم:
     * Web Speech
     */
    try {
      await webSpeechSpeak(
        text,
        rate,
        accent,
        pitch,
        gender
      );

      return;
    } catch (error) {
      console.warn(
        '[LinguaAI TTS] Web Speech failed:',
        error
      );
    }

    throw new Error(
      'all-tts-providers-failed'
    );
  }

  throw new Error(
    'unsupported-tts-provider'
  );
}

export function speakEnglishText(
  text: string,
  rate: number = 1.0,
  accent: SupportedAccent =
    'en-US',
  pitch: number = 1.0,
  gender:
    | 'male'
    | 'female' = 'female'
): Promise<void> {
  return new Promise(
    async (
      resolve,
      reject
    ) => {
      const cleanText =
        text?.trim();

      if (!cleanText) {
        resolve();
        return;
      }

      stopSpeech();

      const provider =
        getTtsProvider();

      try {
        await speakWithProvider(
          provider,
          cleanText,
          rate,
          accent,
          pitch,
          gender
        );

        resolve();
      } catch (error) {
        console.error(
          '[LinguaAI TTS] Speech failed:',
          error
        );

        /*
         * هرگز صدای بوق مصنوعی
         * پخش نکن.
         */
        reject(error);
      }
    }
  );
}

export function isNativeTtsAvailable(): boolean {
  const native =
    getNativeBridge();

  try {
    return !!(
      native &&
      typeof native.isAvailable ===
        'function' &&
      native.isAvailable()
    );
  } catch {
    return false;
  }
}

export function getAvailableTtsProviders():
  TtsProvider[] {
  return [
    'auto',
    'open-source',
    'google',
    'azure',
    'elevenlabs',
    'native',
    'web',
  ];
}

/*
 * Pre-load browser voices.
 */
if (
  typeof window !==
    'undefined' &&
  'speechSynthesis' in
    window
) {
  const loadVoices =
    () => {
      try {
        cachedVoices =
          window.speechSynthesis
            .getVoices();
      } catch {
        // ignore
      }
    };

  loadVoices();

  if (
    window.speechSynthesis
      .onvoiceschanged !==
    undefined
  ) {
    window.speechSynthesis
      .onvoiceschanged =
      loadVoices;
  }
}
