import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, MicOff, Volume2, Sparkles, RefreshCw, CheckCircle2, User, Users, ChevronDown, ChevronUp, X } from 'lucide-react';
import { ChatMessage, DialectType, GenderType, DifficultyLevel, Persona } from '../types';
import { CHAT_PERSONAS } from '../data/personasData';
import { aiManager } from '../core/AIManager';
import { speakEnglishText, ACCENT_CONFIGS, SupportedAccent } from '../lib/speech';

interface AiChatStudioProps {
  activeDialect: DialectType;
}

export const AiChatStudio: React.FC<AiChatStudioProps> = ({ activeDialect }) => {
  const [selectedPersona, setSelectedPersona] = useState<Persona>(CHAT_PERSONAS[0]);
  const [isPersonaModalOpen, setIsPersonaModalOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const [inputVal, setInputVal] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [userGender, setUserGender] = useState<GenderType>('masculine');
  const [userLevel, setUserLevel] = useState<DifficultyLevel>('B1');
  const [selectedAccent, setSelectedAccent] = useState<SupportedAccent>(activeDialect as SupportedAccent);
  const [selectedMsgForAnalysis, setSelectedMsgForAnalysis] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Initialize chat when persona changes
  useEffect(() => {
    setMessages([
      {
        id: `init_${selectedPersona.id}_${Date.now()}`,
        sender: 'ai',
        text: selectedPersona.greetingEn,
        persianText: selectedPersona.greetingFa,
        timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
        personaId: selectedPersona.id,
      },
    ]);
    setSelectedAccent(selectedPersona.dialect as SupportedAccent);
  }, [selectedPersona]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (textOverride?: string) => {
    const textToSend = textOverride || inputVal;
    if (!textToSend.trim() || loading) return;

    const userMsgId = `usr_${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMsgId,
      sender: 'user',
      text: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textOverride) setInputVal('');
    setLoading(true);

    try {
      const result = await aiManager.sendChatMessage({
        userText: userMsg.text,
        history: messages.slice(-6),
        personaId: selectedPersona.id,
        dialect: selectedAccent,
        gender: userGender,
        level: userLevel,
      });

      if (result.feedback) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === userMsgId
              ? {
                  ...msg,
                  feedback: result.feedback,
                }
              : msg
          )
        );
      }

      const aiMsg: ChatMessage = {
        id: `ai_${Date.now()}`,
        sender: 'ai',
        text: result.replyEn || 'Great practice!',
        persianText: result.replyFa || 'تمرین عالی بود!',
        timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
        personaId: selectedPersona.id,
      };

      setMessages((prev) => [...prev, aiMsg]);
      speakEnglishText(
        aiMsg.text,
        selectedPersona.speechRate || 1.0,
        selectedAccent,
        selectedPersona.speechPitch || 1.0,
        selectedPersona.gender
      );
    } catch (err) {
      console.error('Chat error:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('مرورگر شما از تشخیص گفتار صوتی پشتیبانی نمی‌کند. لطفاً تایپ کنید.');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = selectedAccent;

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInputVal(transcript);
          handleSend(transcript);
        }
      };

      recognition.start();
    } catch (e) {
      setIsListening(false);
    }
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-80px)] max-w-5xl mx-auto p-3 md:p-6 space-y-4">
      {/* Persona Selection Header & Trigger Window */}
      <div className="bg-white border border-slate-200/80 p-3.5 md:p-4 rounded-3xl shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          {/* Active Persona Info */}
          <div className="flex items-center gap-3">
            <span className="text-3xl p-2 bg-indigo-50 border border-indigo-100 rounded-2xl shrink-0">
              {selectedPersona.avatar}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-slate-900 text-base">{selectedPersona.name}</h3>
                <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full">
                  {selectedPersona.gender === 'male' ? '👨 مرد' : '👩 خانم'} | {selectedPersona.titleFa}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">{selectedPersona.roleFa}</p>
            </div>
          </div>

          {/* Change Persona Button Dropdown Trigger */}
          <button
            onClick={() => setIsPersonaModalOpen(!isPersonaModalOpen)}
            className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2.5 rounded-2xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs shrink-0"
          >
            <Users className="w-4 h-4" />
            <span>تغییر هم‌صحبت (۶ شخصیت)</span>
            {isPersonaModalOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {/* Inline Collapsible Dropdown Drawer for Personas */}
        {isPersonaModalOpen && (
          <div className="pt-3 border-t border-slate-200 space-y-3 animate-in fade-in duration-200">
            <p className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span>هم‌صحبت مورد نظر خود را انتخاب کنید:</span>
              <button
                onClick={() => setIsPersonaModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-72 overflow-y-auto p-1">
              {CHAT_PERSONAS.map((p) => {
                const isSelected = p.id === selectedPersona.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSelectedPersona(p);
                      setIsPersonaModalOpen(false);
                    }}
                    className={`p-3 rounded-2xl border text-right transition-all cursor-pointer flex items-center gap-3 ${
                      isSelected
                        ? 'bg-indigo-50 border-indigo-500 ring-2 ring-indigo-500/20'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                    }`}
                  >
                    <span className="text-2xl p-2 bg-white rounded-xl border border-slate-200 shrink-0">
                      {p.avatar}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-black text-slate-900 text-xs truncate">{p.name}</span>
                        {isSelected && (
                          <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-1.5 py-0.2 rounded-md">
                            فعال
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">{p.roleFa}</p>
                      <p className="text-[10px] text-indigo-600 font-bold mt-1">
                        {p.gender === 'male' ? '👨 صدای واقعی آقایان' : '👩 صدای واقعی خانم‌ها'}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Preferences Bar */}
      <div className="bg-white border border-slate-200/80 p-3 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-600 font-bold flex items-center gap-1">
            <User className="w-3.5 h-3.5 text-indigo-600" />
            جنسیت شما:
          </span>
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setUserGender('masculine')}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                userGender === 'masculine' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              آقا 👨
            </button>
            <button
              onClick={() => setUserGender('feminine')}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                userGender === 'feminine' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              خانم 👩
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-600 font-bold">سطح شما:</span>
          <select
            value={userLevel}
            onChange={(e) => setUserLevel(e.target.value as DifficultyLevel)}
            className="bg-slate-100 border border-slate-200 text-slate-800 rounded-xl px-2.5 py-1 font-bold focus:outline-none cursor-pointer"
          >
            <option value="A1">A1 مبتدی</option>
            <option value="A2">A2 پیش‌مبتدی</option>
            <option value="B1">B1 متوسط</option>
            <option value="B2">B2 فرامتوسط</option>
            <option value="C1">C1 پیشرفته</option>
          </select>
        </div>

        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5">
          {ACCENT_CONFIGS.map((acc) => (
            <button
              key={acc.code}
              onClick={() => setSelectedAccent(acc.code)}
              className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                selectedAccent === acc.code
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {acc.flag} {acc.code}
            </button>
          ))}
        </div>
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto bg-white border border-slate-200/80 rounded-3xl p-4 md:p-5 space-y-4 min-h-[350px] shadow-xs">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <div
              key={msg.id}
              className={`flex flex-col space-y-1.5 ${isUser ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] md:max-w-[75%] p-4 rounded-3xl text-sm leading-relaxed ${
                  isUser
                    ? 'bg-indigo-600 text-white rounded-br-none shadow-md shadow-indigo-600/10'
                    : 'bg-slate-100 text-slate-900 rounded-bl-none border border-slate-200/80'
                }`}
              >
                {!isUser && (
                  <div className="flex items-center gap-2 pb-2 mb-2 border-b border-slate-200 text-xs font-bold text-indigo-700">
                    <span className="text-base">{selectedPersona.avatar}</span>
                    <span>{selectedPersona.name}</span>
                    <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full font-sans" dir="rtl">
                      {selectedPersona.titleFa}
                    </span>
                  </div>
                )}

                <p className="font-sans font-medium text-base leading-relaxed" dir="ltr" style={{ textAlign: 'left' }}>
                  {msg.text}
                </p>

                {msg.persianText && (
                  <p className="text-xs text-slate-600 pt-2 mt-2 border-t border-slate-200/80 font-sans" dir="rtl" style={{ textAlign: 'right' }}>
                    {msg.persianText}
                  </p>
                )}

                {/* User Message Grammar Bar */}
                {isUser && msg.feedback && (
                  <div className="mt-3 pt-2.5 border-t border-indigo-400/30 flex items-center justify-between text-xs text-indigo-100" dir="rtl">
                    <span className="font-bold flex items-center gap-1 text-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      امتیاز گرامر: {msg.feedback.grammarScore}٪
                    </span>
                    <button
                      onClick={() =>
                        setSelectedMsgForAnalysis(
                          selectedMsgForAnalysis === msg.id ? null : msg.id
                        )
                      }
                      className="bg-white/20 hover:bg-white/30 font-bold px-2.5 py-1 rounded-lg text-[11px] transition-all cursor-pointer"
                    >
                      تحلیل و پیشنهاد
                    </button>
                  </div>
                )}
              </div>

              {/* Analysis Drawer */}
              {isUser && msg.feedback && selectedMsgForAnalysis === msg.id && (
                <div className="max-w-[85%] md:max-w-[75%] bg-amber-50 border border-amber-200/90 rounded-2xl p-4 text-xs text-amber-950 space-y-2.5 font-sans shadow-xs" dir="rtl">
                  <div className="flex items-center gap-1.5 font-bold text-amber-900 border-b border-amber-200 pb-1.5">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <span>تحلیل گرامری و پیشنهاد جمله به زبان فارسی:</span>
                  </div>
                  {msg.feedback.correctedSentence && (
                    <div className="p-2.5 bg-white border border-amber-200 rounded-xl font-mono text-[13px] text-emerald-800 font-bold" dir="ltr" style={{ textAlign: 'left' }}>
                      ✨ {msg.feedback.correctedSentence}
                    </div>
                  )}
                  {msg.feedback.explanationFa && (
                    <p className="text-amber-900 leading-relaxed text-xs">
                      💡 {msg.feedback.explanationFa}
                    </p>
                  )}
                  {msg.feedback.betterAlternatives && msg.feedback.betterAlternatives.length > 0 && (
                    <div className="space-y-1">
                      <strong className="text-amber-900">جایگزین‌های نیتیو (Native Alternatives):</strong>
                      <ul className="space-y-1 mt-1 font-sans" dir="ltr" style={{ textAlign: 'left' }}>
                        {msg.feedback.betterAlternatives.map((alt, i) => (
                          <li key={i} className="bg-white p-2 rounded-lg border border-amber-200 text-slate-800 font-medium text-[12px]">
                            • "{alt}"
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Native Voice Audio Button */}
              {!isUser && (
                <button
                  onClick={() =>
                    speakEnglishText(
                      msg.text,
                      selectedPersona.speechRate || 1.0,
                      selectedAccent,
                      selectedPersona.speechPitch || 1.0,
                      selectedPersona.gender
                    )
                  }
                  className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-all px-2 py-1 rounded-lg hover:bg-slate-100 cursor-pointer"
                  dir="rtl"
                >
                  <Volume2 className="w-4 h-4 text-indigo-600" />
                  <span>پخش با صدای نیتیو {selectedPersona.name} ({selectedPersona.gender === 'male' ? '👨 صدای مردانه' : '👩 صدای زنانه'})</span>
                </button>
              )}
            </div>
          );
        })}

        {loading && (
          <div className="flex items-center gap-2 text-slate-600 text-xs p-3.5 bg-slate-100 rounded-2xl border border-slate-200" dir="rtl">
            <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
            <span>{selectedPersona.name} در حال نگارش پاسخ و تحلیل گرامری...</span>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Input Box */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-2.5 flex items-center gap-2 shadow-xs">
        <button
          onClick={toggleVoiceInput}
          className={`p-3 rounded-xl transition-all cursor-pointer ${
            isListening
              ? 'bg-red-600 text-white animate-pulse'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
          }`}
          title="ورودی صوتی"
        >
          {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>

        <input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder={`پیام خود را به ${selectedPersona.name} بنویسید یا بگویید...`}
          className="flex-1 bg-transparent text-slate-800 text-sm px-3 focus:outline-none placeholder-slate-400"
          dir="ltr"
        />

        <button
          onClick={() => handleSend()}
          disabled={!inputVal.trim() || loading}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold p-3 rounded-xl transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
