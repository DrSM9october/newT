import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, MicOff, Volume2, Sparkles, RefreshCw, CheckCircle2, User, Users, MessageSquare } from 'lucide-react';
import { ChatMessage, DialectType, GenderType, DifficultyLevel, Persona } from '../types';
import { CHAT_PERSONAS } from '../data/personasData';
import { aiManager } from '../core/AIManager';
import { speakEnglishText, ACCENT_CONFIGS, SupportedAccent } from '../lib/speech';

interface AiChatStudioProps {
  activeDialect: DialectType;
}

export const AiChatStudio: React.FC<AiChatStudioProps> = ({ activeDialect }) => {
  const [selectedPersona, setSelectedPersona] = useState<Persona>(CHAT_PERSONAS[0]);
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
        selectedPersona.speechPitch || 1.0
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
    <div className="flex flex-col h-[calc(100vh-80px)] max-w-5xl mx-auto p-3 md:p-6 space-y-4">
      {/* Persona Selector Carousel */}
      <div className="bg-slate-900 border border-slate-800 p-3 rounded-3xl space-y-3">
        <div className="flex items-center justify-between text-xs px-2">
          <span className="font-bold text-slate-300 flex items-center gap-1.5">
            <Users className="w-4 h-4 text-indigo-400" />
            انتخاب هم‌صحبت واقعی (آقا / خانم با لحن‌های مختلف):
          </span>
          <span className="text-slate-400 text-[11px] bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800">
            {selectedPersona.gender === 'male' ? '👨 مرد' : '👩 زن'} | {selectedPersona.titleFa}
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {CHAT_PERSONAS.map((p) => {
            const isSelected = p.id === selectedPersona.id;
            return (
              <button
                key={p.id}
                onClick={() => setSelectedPersona(p)}
                className={`flex items-center gap-2 px-3 py-2 rounded-2xl border text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/30'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <span className="text-lg">{p.avatar}</span>
                <div className="text-right">
                  <p>{p.name}</p>
                  <p className="text-[10px] opacity-80 font-normal">{p.roleFa}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Preferences Bar */}
      <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-bold flex items-center gap-1">
            <User className="w-3.5 h-3.5 text-indigo-400" />
            جنسیت شما:
          </span>
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setUserGender('masculine')}
              className={`px-2.5 py-0.5 rounded-lg font-bold transition-all cursor-pointer ${
                userGender === 'masculine' ? 'bg-indigo-600 text-white' : 'text-slate-400'
              }`}
            >
              آقا 👨
            </button>
            <button
              onClick={() => setUserGender('feminine')}
              className={`px-2.5 py-0.5 rounded-lg font-bold transition-all cursor-pointer ${
                userGender === 'feminine' ? 'bg-indigo-600 text-white' : 'text-slate-400'
              }`}
            >
              خانم 👩
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-bold">سطح:</span>
          <select
            value={userLevel}
            onChange={(e) => setUserLevel(e.target.value as DifficultyLevel)}
            className="bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-2 py-0.5 font-bold focus:outline-none cursor-pointer"
          >
            <option value="A1">A1 مبتدی</option>
            <option value="A2">A2 پیش‌مبتدی</option>
            <option value="B1">B1 متوسط</option>
            <option value="B2">B2 فرامتوسط</option>
            <option value="C1">C1 پیشرفته</option>
          </select>
        </div>

        <div className="flex items-center gap-1.5">
          {ACCENT_CONFIGS.map((acc) => (
            <button
              key={acc.code}
              onClick={() => setSelectedAccent(acc.code)}
              className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                selectedAccent === acc.code
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200'
              }`}
            >
              {acc.flag} {acc.code}
            </button>
          ))}
        </div>
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto bg-slate-900/60 border border-slate-800/80 rounded-3xl p-4 space-y-4">
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
                    ? 'bg-indigo-600 text-white rounded-br-none shadow-lg shadow-indigo-600/20'
                    : 'bg-slate-800 text-slate-100 rounded-bl-none border border-slate-700/60'
                }`}
              >
                {!isUser && (
                  <div className="flex items-center gap-2 pb-2 mb-2 border-b border-slate-700/50 text-xs font-bold text-indigo-300">
                    <span>{selectedPersona.avatar}</span>
                    <span>{selectedPersona.name}</span>
                    <span className="text-[10px] bg-slate-900 px-2 py-0.5 rounded-full text-slate-400">
                      {selectedPersona.titleFa}
                    </span>
                  </div>
                )}

                <p className="font-sans font-medium text-base leading-normal">{msg.text}</p>

                {msg.persianText && (
                  <p className="text-xs text-slate-300 pt-2 mt-2 border-t border-slate-700/50 font-sans">
                    {msg.persianText}
                  </p>
                )}

                {/* User Message Grammar Bar */}
                {isUser && msg.feedback && (
                  <div className="mt-3 pt-2.5 border-t border-indigo-400/40 flex items-center justify-between text-xs text-indigo-100">
                    <span className="font-bold flex items-center gap-1">
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
                <div className="max-w-[85%] md:max-w-[75%] bg-amber-950/80 border border-amber-600/40 rounded-2xl p-3.5 text-xs text-amber-100 space-y-2 font-sans">
                  <div className="flex items-center gap-1.5 font-bold text-amber-300">
                    <Sparkles className="w-4 h-4" />
                    <span>تحلیل گرامری و بهبود جمله:</span>
                  </div>
                  {msg.feedback.correctedSentence && (
                    <p>
                      <strong>اصلاح‌شده:</strong> "{msg.feedback.correctedSentence}"
                    </p>
                  )}
                  {msg.feedback.explanationFa && (
                    <p className="text-amber-200/90 leading-relaxed">
                      💡 {msg.feedback.explanationFa}
                    </p>
                  )}
                  {msg.feedback.betterAlternatives && msg.feedback.betterAlternatives.length > 0 && (
                    <div>
                      <strong>جایگزین نیتیو:</strong>
                      <ul className="list-disc list-inside mt-1 space-y-0.5 text-amber-100">
                        {msg.feedback.betterAlternatives.map((alt, i) => (
                          <li key={i}>"{alt}"</li>
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
                      selectedPersona.speechPitch || 1.0
                    )
                  }
                  className="flex items-center gap-1 text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-all p-1 cursor-pointer"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>پخش با صدای نیتیو {selectedPersona.name}</span>
                </button>
              )}
            </div>
          );
        })}

        {loading && (
          <div className="flex items-center gap-2 text-slate-400 text-xs p-3 bg-slate-900 rounded-2xl border border-slate-800">
            <RefreshCw className="w-4 h-4 animate-spin text-indigo-500" />
            <span>{selectedPersona.name} در حال نوشتن پاسخ و تحلیل گرامری...</span>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Input Box */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-2.5 flex items-center gap-2">
        <button
          onClick={toggleVoiceInput}
          className={`p-3 rounded-xl transition-all cursor-pointer ${
            isListening
              ? 'bg-red-600 text-white animate-pulse'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
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
          className="flex-1 bg-transparent text-slate-100 text-sm px-3 focus:outline-none placeholder-slate-500"
          dir="ltr"
        />

        <button
          onClick={() => handleSend()}
          disabled={!inputVal.trim() || loading}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold p-3 rounded-xl transition-all shadow-md shadow-indigo-600/30 cursor-pointer"
        >
          <Send className="w-5 h-5 rotate-180" />
        </button>
      </div>
    </div>
  );
};
