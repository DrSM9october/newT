import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Volume2,
  Sparkles,
  CheckCircle2,
  Lightbulb,
  RefreshCw,
  Languages,
  User,
  Bot,
  Globe,
  Mic,
  MicOff,
  WifiOff
} from 'lucide-react';
import { ChatMessage, DifficultyLevel, PersonaOption, DialectType, GenderType } from '../types';
import {
  speakEnglishText,
  stopSpeaking,
  ACCENT_CONFIGS,
  SupportedAccent,
  startSpeechRecognition,
  generateOfflineReply
} from '../lib/speech';

interface AiChatStudioProps {
  userLevel: DifficultyLevel;
  activeDialect?: DialectType;
  userGender?: GenderType;
  onWordClick?: (word: string) => void;
}

const PERSONA_OPTIONS: PersonaOption[] = [
  {
    id: 'friendly_native',
    nameFa: 'دوست انگلیسی‌زبان صمیمی',
    nameEn: 'Sarah (Friendly Native Friend)',
    roleDescription: 'مکالمه دوستانه روزمره، گپ و گفت سبک، اصطلاحات عامیانه و حس صمیمیت',
    avatar: '👩‍🦰',
    systemInstruction:
      'You are Sarah, a warm, friendly native English speaker from Vancouver. Chat like a close friend, share stories, ask open-ended questions, and use natural everyday expressions.',
  },
  {
    id: 'strict_tutor',
    nameFa: 'استاد دلسوز و ریزبین گرامر',
    nameEn: 'Professor Arthur (English Tutor)',
    roleDescription: 'تمرکز بالا روی اصلاح دقیق گرامر، رفع اشتباهات رایج و پیشنهاد ساختارهای پیشرفته',
    avatar: '👨‍🏫',
    systemInstruction:
      'You are Professor Arthur, an encouraging English literature instructor. Focus on helping the student express themselves accurately, correct structural mistakes gently, and introduce better vocabulary.',
  },
  {
    id: 'business_mentor',
    nameFa: 'مشاور کاری و کسب‌ و کار',
    nameEn: 'David (Business & Career Coach)',
    roleDescription: 'مکالمات اداری، مصاحبه شغلی، مذاکره، ایمیل‌نگاری و زبان رسمی تجارت',
    avatar: '💼',
    systemInstruction:
      'You are David, an experienced executive career coach. Practice professional corporate English, interview preparation, email etiquette, and workplace negotiation.',
  },
  {
    id: 'slang_expert',
    nameFa: 'متخصص اصطلاحات زنده و خیابانی',
    nameEn: 'Jake (Street Slang & Idioms)',
    roleDescription: 'آموزش زبان واقعی مردم خیابان، فیلم‌ها، بازی‌ها و شبکه‌های اجتماعی',
    avatar: '🛹',
    systemInstruction:
      'You are Jake, a modern content creator from Los Angeles. Teach cool idioms, casual contractions, urban slang, and modern digital phrasing used in daily movies and social media.',
  },
];

export const AiChatStudio: React.FC<AiChatStudioProps> = ({
  userLevel,
  activeDialect = 'en-US',
  userGender = 'masculine',
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome_msg',
      sender: 'ai',
      text: `Hello there! 👋 I am Sarah, your AI conversation partner. We can chat in English, local Arabic dialects, or Persian for fluent practice!`,
      persianText: `سلام! 👋 من سارا هستم، هم‌صحبت هوشمند شما. می‌توانیم به انگلیسی، لهجه‌های عراقی/لبنانی یا فارسی مکالمه روان تمرین کنیم!`,
      timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState<PersonaOption>(PERSONA_OPTIONS[0]);
  const [showTranslations, setShowTranslations] = useState<Record<string, boolean>>({ welcome_msg: true });
  const [speechSpeed, setSpeechSpeed] = useState<number>(1.0);
  const [selectedAccent, setSelectedAccent] = useState<SupportedAccent>(activeDialect);
  const [currentlySpeakingId, setCurrentlySpeakingId] = useState<string | null>(null);
  const [showFeedbackModalId, setShowFeedbackModalId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSelectedAccent(activeDialect);
  }, [activeDialect]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const [isListening, setIsListening] = useState(false);
  const recognizerRef = useRef<{ stop: () => void } | null>(null);

  useEffect(() => {
    return () => {
      if (recognizerRef.current) {
        recognizerRef.current.stop();
      }
    };
  }, []);

  const toggleListening = () => {
    if (isListening) {
      if (recognizerRef.current) {
        recognizerRef.current.stop();
        recognizerRef.current = null;
      }
      setIsListening(false);
    } else {
      setIsListening(true);
      const rec = startSpeechRecognition(
        selectedAccent,
        (transcript, isFinal) => {
          setInput(transcript);
        },
        (errorMsg) => {
          console.warn('Speech error:', errorMsg);
          setIsListening(false);
        },
        () => {
          setIsListening(false);
        }
      );
      recognizerRef.current = rec;
    }
  };

  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || input.trim();
    if (!textToSend || loading) return;

    if (isListening && recognizerRef.current) {
      recognizerRef.current.stop();
      setIsListening(false);
    }

    const userMsgId = `user_${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMsgId,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customText) setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          history: messages.slice(-8).map((m) => ({ sender: m.sender, text: m.text })),
          personaPrompt: selectedPersona.systemInstruction,
          userLevel,
          dialect: selectedAccent,
          userGender,
        }),
      });

      const resData = await response.json();

      if (resData.success && resData.data) {
        const aiData = resData.data;

        // Update user message with feedback if present
        if (aiData.grammarScore !== undefined) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === userMsgId
                ? {
                    ...m,
                    feedback: {
                      grammarScore: aiData.grammarScore,
                      correctedSentence: aiData.correctedSentence || undefined,
                      explanationFa: aiData.explanationFa || undefined,
                      genderNoteFa: aiData.genderNoteFa || undefined,
                      betterAlternatives: aiData.betterAlternatives || [],
                      vocabularyTips: aiData.vocabHighlights?.map((v: any) => `${v.word}: ${v.meaningFa}`) || [],
                      persianTranslation: '',
                    },
                  }
                : m
            )
          );
        }

        const aiMsgId = `ai_${Date.now()}`;
        const aiMsg: ChatMessage = {
          id: aiMsgId,
          sender: 'ai',
          text: aiData.replyEn || 'I am listening!',
          persianText: aiData.replyFa,
          timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
        };

        setMessages((prev) => [...prev, aiMsg]);

        // Auto read aloud AI response
        speakText(aiMsg.id, aiMsg.text);
      } else {
        throw new Error(resData.error || 'خطا در ارتباط آنلاین');
      }
    } catch (err: any) {
      console.warn('Network or API issue, triggering Offline Fallback Engine:', err);
      // Fallback Engine for Offline / Disconnected Mode
      const offlineResult = generateOfflineReply(textToSend, selectedAccent, userGender);
      
      setMessages((prev) =>
        prev.map((m) =>
          m.id === userMsgId
            ? {
                ...m,
                feedback: {
                  grammarScore: 90,
                  explanationFa: offlineResult.explanationFa,
                  genderNoteFa: offlineResult.genderNoteFa,
                  betterAlternatives: [],
                  vocabularyTips: [],
                  persianTranslation: offlineResult.replyFa,
                },
              }
            : m
        )
      );

      const aiMsgId = `ai_offline_${Date.now()}`;
      const aiMsg: ChatMessage = {
        id: aiMsgId,
        sender: 'ai',
        text: offlineResult.replyEn,
        persianText: offlineResult.replyFa,
        timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMsg]);
      speakText(aiMsg.id, aiMsg.text);
    } finally {
      setLoading(false);
    }
  };

  const speakText = async (msgId: string, text: string) => {
    if (currentlySpeakingId === msgId) {
      stopSpeaking();
      setCurrentlySpeakingId(null);
      return;
    }
    setCurrentlySpeakingId(msgId);
    await speakEnglishText(text, speechSpeed, selectedAccent);
    setCurrentlySpeakingId(null);
  };

  const toggleTranslation = (id: string) => {
    setShowTranslations((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: Personas & Settings Panel */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
              <Bot className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-sm">شخصیت هم‌صحبت هوشمند</h2>
            </div>

            <div className="space-y-2">
              {PERSONA_OPTIONS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPersona(p)}
                  className={`w-full text-right p-3 rounded-xl border transition-all flex items-start gap-3 ${
                    selectedPersona.id === p.id
                      ? 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-500 text-indigo-900 dark:text-indigo-100 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <span className="text-2xl p-1 bg-white dark:bg-slate-900 rounded-lg shadow-xs">{p.avatar}</span>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white">{p.nameFa}</h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {p.roleDescription}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            {/* Accent Selector for AI Voice */}
            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-indigo-500" />
                  لهجه صدای گوینده:
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl">
                {ACCENT_CONFIGS.map((acc) => (
                  <button
                    key={acc.code}
                    onClick={() => setSelectedAccent(acc.code)}
                    className={`py-1 px-1 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-all ${
                      selectedAccent === acc.code
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    <span>{acc.flag}</span>
                    <span>{acc.code.replace('en-', '')}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Speech Speed Settings */}
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Volume2 className="w-4 h-4 text-indigo-500" />
                  سرعت خواندن صوتی:
                </span>
                <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-indigo-600 dark:text-indigo-400 font-mono">
                  {speechSpeed}x
                </span>
              </div>
              <div className="flex items-center justify-between gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                {[0.8, 1.0, 1.2].map((spd) => (
                  <button
                    key={spd}
                    onClick={() => setSpeechSpeed(spd)}
                    className={`flex-1 py-1 rounded-lg text-xs font-bold transition-all ${
                      speechSpeed === spd
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    {spd === 0.8 ? 'آرام' : spd === 1.0 ? 'عادی' : 'تند'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Educational Quick Prompts */}
          <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 text-white rounded-2xl p-5 border border-indigo-800 shadow-md">
            <div className="flex items-center gap-2 font-bold text-xs mb-3 text-indigo-300">
              <Sparkles className="w-4 h-4" />
              <span>پیشنهاد موضوع برای شروع مکالمه</span>
            </div>
            <div className="space-y-2">
              {[
                "Tell me about your favorite travel memory.",
                "How do you prepare for a job interview?",
                "What's a common idiom in native English?",
                "Can we practice ordering coffee at a cafe?",
              ].map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(prompt)}
                  className="w-full text-left font-sans text-xs bg-white/10 hover:bg-white/20 p-2.5 rounded-xl border border-white/10 transition-all text-slate-200 line-clamp-2"
                >
                  "{prompt}"
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Chat Canvas */}
        <div className="lg:col-span-3 flex flex-col h-[720px] bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          {/* Active Chat Header */}
          <div className="bg-slate-50 dark:bg-slate-800/80 px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-2xl p-2 bg-indigo-100 dark:bg-indigo-950 rounded-xl">{selectedPersona.avatar}</div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>{selectedPersona.nameEn}</span>
                  <span className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                    آنلاین
                  </span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{selectedPersona.nameFa}</p>
              </div>
            </div>

            <button
              onClick={() =>
                setMessages([
                  {
                    id: 'welcome_reset',
                    sender: 'ai',
                    text: `Conversation restarted! What would you like to chat about now?`,
                    persianText: `گفتگو از نو شروع شد! دوست داری الان درباره چی صحبت کنیم؟`,
                    timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
                  },
                ])
              }
              className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-all"
              title="پاکسازی تاریخچه گفتگو"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.map((msg) => {
              const isUser = msg.sender === 'user';
              const isSystem = msg.sender === 'system';

              if (isSystem) {
                return (
                  <div key={msg.id} className="flex justify-center my-2">
                    <span className="bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-xs px-4 py-2 rounded-xl border border-rose-200 dark:border-rose-800">
                      {msg.text}
                    </span>
                  </div>
                );
              }

              return (
                <div key={msg.id} className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold shadow-xs ${
                      isUser
                        ? 'bg-slate-800 text-white'
                        : 'bg-indigo-600 text-white'
                    }`}
                  >
                    {isUser ? <User className="w-5 h-5" /> : selectedPersona.avatar}
                  </div>

                  <div className={`max-w-[82%] space-y-2 ${isUser ? 'items-end' : 'items-start'}`}>
                    {/* Message Bubble */}
                    <div
                      className={`p-4 rounded-2xl border text-sm leading-relaxed shadow-xs transition-all ${
                        isUser
                          ? 'bg-indigo-600 text-white border-indigo-500 rounded-tr-none'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-slate-200 dark:border-slate-700 rounded-tl-none'
                      }`}
                    >
                      <div className="font-sans text-base leading-relaxed tracking-wide select-text">
                        {msg.text}
                      </div>

                      {/* AI Response Persian Translation */}
                      {!isUser && msg.persianText && showTranslations[msg.id] && (
                        <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 font-sans leading-relaxed bg-indigo-500/10 p-2.5 rounded-lg">
                          <span className="font-bold text-indigo-700 dark:text-indigo-300 ml-1">ترجمه فارسی:</span>
                          {msg.persianText}
                        </div>
                      )}

                      {/* Action Bar for AI Message */}
                      {!isUser && (
                        <div className="mt-3 flex items-center gap-3 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-xs">
                          <button
                            onClick={() => speakText(msg.id, msg.text)}
                            className={`flex items-center gap-1 font-bold px-2 py-1 rounded-lg transition-all ${
                              currentlySpeakingId === msg.id
                                ? 'bg-amber-500 text-white animate-pulse'
                                : 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-950/60'
                            }`}
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                            <span>{currentlySpeakingId === msg.id ? 'در حال پخش...' : 'تلفظ صوتی'}</span>
                          </button>

                          {msg.persianText && (
                            <button
                              onClick={() => toggleTranslation(msg.id)}
                              className="flex items-center gap-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 px-2 py-1 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-all"
                            >
                              <Languages className="w-3.5 h-3.5" />
                              <span>{showTranslations[msg.id] ? 'مخفی ترجمه' : 'مشاهده ترجمه'}</span>
                            </button>
                          )}
                        </div>
                      )}

                      {/* User Grammar Feedback Badge */}
                      {isUser && msg.feedback && (
                        <div className="mt-2.5 pt-2 border-t border-indigo-400/40 flex items-center justify-between text-xs text-indigo-100">
                          <div className="flex items-center gap-1.5 font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                            <span>امتیاز گرامری: {msg.feedback.grammarScore}٪</span>
                          </div>

                          <button
                            onClick={() =>
                              setShowFeedbackModalId(showFeedbackModalId === msg.id ? null : msg.id)
                            }
                            className="bg-white/20 hover:bg-white/30 text-white font-bold px-2.5 py-1 rounded-lg text-[11px] transition-all flex items-center gap-1"
                          >
                            <Lightbulb className="w-3.5 h-3.5 text-amber-300" />
                            <span>تحلیل و پیشنهادات</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Detailed Grammar Feedback Panel for User Message */}
                    {isUser && msg.feedback && showFeedbackModalId === msg.id && (
                      <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-xl p-4 text-xs space-y-3 text-slate-800 dark:text-slate-200 shadow-sm animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-center justify-between font-bold text-amber-900 dark:text-amber-200 pb-2 border-b border-amber-200/60 dark:border-amber-800/60">
                          <span className="flex items-center gap-1.5">
                            <Sparkles className="w-4 h-4 text-amber-500" />
                            تحلیل گرامری و پیشنهاد بومی (Native Suggestions)
                          </span>
                          <span className="bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-100 px-2 py-0.5 rounded-full font-bold">
                            {msg.feedback.grammarScore} / ۱۰۰
                          </span>
                        </div>

                        {msg.feedback.correctedSentence && (
                          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-amber-200 dark:border-amber-800">
                            <span className="font-bold text-rose-600 dark:text-rose-400 block mb-1">شکل اصلاح‌شده:</span>
                            <p className="font-sans font-semibold text-slate-900 dark:text-white">
                              "{msg.feedback.correctedSentence}"
                            </p>
                            {msg.feedback.explanationFa && (
                              <p className="text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                                💡 {msg.feedback.explanationFa}
                              </p>
                            )}
                            {msg.feedback.genderNoteFa && (
                              <p className="text-pink-700 dark:text-pink-300 font-bold mt-1.5 p-1.5 bg-pink-50 dark:bg-pink-950/60 rounded border border-pink-200 dark:border-pink-800 leading-relaxed">
                                🚻 نکته جنسیت: {msg.feedback.genderNoteFa}
                              </p>
                            )}
                          </div>
                        )}

                        {msg.feedback.betterAlternatives && msg.feedback.betterAlternatives.length > 0 && (
                          <div>
                            <span className="font-bold text-indigo-700 dark:text-indigo-300 block mb-1">
                              جایگزین‌های طبیعی‌تر (Native Alternatives):
                            </span>
                            <ul className="list-disc list-inside space-y-1 font-sans text-slate-700 dark:text-slate-300">
                              {msg.feedback.betterAlternatives.map((alt, i) => (
                                <li key={i} className="bg-white/60 dark:bg-slate-900/60 p-1.5 rounded border border-slate-200 dark:border-slate-800">
                                  "{alt}"
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="text-[10px] text-slate-400 px-1">{msg.timestamp}</div>
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-sm">
                  {selectedPersona.avatar}
                </div>
                <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-2xl rounded-tl-none border border-slate-200 dark:border-slate-700 flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs">
                  <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" />
                  <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.2s]" />
                  <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.4s]" />
                  <span className="font-bold mr-2">{selectedPersona.nameEn} در حال پاسخ‌گویی...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Box */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700">
            {isListening && (
              <div className="mb-2.5 px-3 py-1.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-xl flex items-center justify-between text-xs text-rose-700 dark:text-rose-300 font-bold animate-pulse">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                  <span>موتور گفتار به متن فعال است... صحبت کنید (پشتیبانی آفلاین و آنلاین)</span>
                </div>
                <span className="text-[10px] dir-ltr font-mono bg-white/80 dark:bg-slate-900/80 px-2 py-0.5 rounded">
                  {selectedAccent}
                </span>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <button
                type="button"
                onClick={toggleListening}
                title={isListening ? 'توقف ضبط صدا' : 'ضبط و تبدیل صدا به متن (STT)'}
                className={`p-3 rounded-xl font-bold text-xs flex items-center justify-center transition-all cursor-pointer shrink-0 border ${
                  isListening
                    ? 'bg-rose-600 hover:bg-rose-700 text-white border-rose-500 shadow-lg shadow-rose-600/30 animate-pulse'
                    : 'bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700'
                }`}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
              </button>

              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  isListening
                    ? 'در حال شنیدن و تبدیل گفتار شما به متن...'
                    : 'متن انگلیسی یا عربی خود را بنویسید یا دکمه میکروفون را بزنید...'
                }
                disabled={loading}
                className="flex-1 font-sans bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 dir-ltr text-left transition-all"
              />

              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-5 py-3 rounded-xl font-bold text-xs flex items-center gap-2 shadow-md shadow-indigo-600/20 transition-all shrink-0 cursor-pointer"
              >
                <Send className="w-4 h-4 rotate-180" />
                <span className="hidden sm:inline">ارسال</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
