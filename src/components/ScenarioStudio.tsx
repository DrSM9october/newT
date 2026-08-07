import React, { useState, useEffect } from 'react';
import {
  Theater,
  CheckCircle2,
  Circle,
  Send,
  Volume2,
  ArrowRight,
  HelpCircle,
  User,
  Globe
} from 'lucide-react';
import { PRACTICAL_SCENARIOS } from '../data/scenariosData';
import { ChatMessage, DifficultyLevel, RoleplayScenario, DialectType, GenderType } from '../types';
import { speakEnglishText, ACCENT_CONFIGS, SupportedAccent } from '../lib/speech';

interface ScenarioStudioProps {
  userLevel: DifficultyLevel;
  activeDialect?: DialectType;
  userGender?: GenderType;
  onCompleteScenario: (id: string) => void;
}

export const ScenarioStudio: React.FC<ScenarioStudioProps> = ({
  userLevel,
  activeDialect = 'en-US',
  userGender = 'masculine',
  onCompleteScenario,
}) => {
  const [activeScenario, setActiveScenario] = useState<RoleplayScenario | null>(null);
  const [scenarioMessages, setScenarioMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [completedObjectives, setCompletedObjectives] = useState<Record<string, boolean>>({});
  const [selectedAccent, setSelectedAccent] = useState<SupportedAccent>(activeDialect);

  useEffect(() => {
    if (activeScenario?.dialect) {
      setSelectedAccent(activeScenario.dialect);
    } else {
      setSelectedAccent(activeDialect);
    }
  }, [activeScenario, activeDialect]);

  const startScenario = (sc: RoleplayScenario) => {
    setActiveScenario(sc);
    setCompletedObjectives({});
    if (sc.dialect) {
      setSelectedAccent(sc.dialect);
    }
    setScenarioMessages([
      {
        id: 'sc_start',
        sender: 'ai',
        text: sc.starterMessage,
        timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  const handleSendScenarioMsg = async (customText?: string) => {
    if (!activeScenario || loading) return;
    const textToSend = customText || input.trim();
    if (!textToSend) return;

    const userMsg: ChatMessage = {
      id: `sc_user_${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
    };

    setScenarioMessages((prev) => [...prev, userMsg]);
    if (!customText) setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          history: scenarioMessages.slice(-6).map((m) => ({ sender: m.sender, text: m.text })),
          personaPrompt: activeScenario.aiPersona.systemPrompt,
          userLevel,
          dialect: activeScenario.dialect || selectedAccent,
          userGender,
        }),
      });

      const resData = await res.json();
      if (resData.success && resData.data) {
        const aiData = resData.data;
        const aiMsg: ChatMessage = {
          id: `sc_ai_${Date.now()}`,
          sender: 'ai',
          text: aiData.replyEn,
          persianText: aiData.replyFa,
          timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
        };

        setScenarioMessages((prev) => [...prev, aiMsg]);
        speakEnglishText(aiMsg.text, 1.0, selectedAccent);

        // Check objectives auto-completion simulation
        if (activeScenario.objectives.length > Object.keys(completedObjectives).length) {
          const nextObj = activeScenario.objectives.find((o) => !completedObjectives[o.id]);
          if (nextObj) {
            setCompletedObjectives((prev) => ({ ...prev, [nextObj.id]: true }));
          }
        }
      }
    } catch (e) {
      console.error('Scenario chat failed', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {!activeScenario ? (
        /* Scenario Selection Screen */
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 text-white rounded-3xl p-6 md:p-8 border border-indigo-800/40 shadow-md">
            <div className="max-w-2xl space-y-2">
              <span className="bg-indigo-500/20 text-indigo-300 text-xs font-bold px-3 py-1 rounded-full border border-indigo-500/30 inline-flex items-center gap-1">
                <Theater className="w-3.5 h-3.5" />
                تمرین تعاملی نقش‌آفرینی (Interactive Roleplay)
              </span>
              <h2 className="text-2xl font-black">سناریوهای روزمره و واقعی زبان انگلیسی</h2>
              <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
                در شرایط واقعی قرار بگیرید! از سفارش قهوه تا مصاحبه کاری و کنترل پاسپورت فرودگاه. با هم‌صحبت هوشمند مکالمه کنید و اهداف تعیین‌شده را کامل کنید.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {PRACTICAL_SCENARIOS.map((sc) => (
              <div
                key={sc.id}
                className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-indigo-500 transition-all flex flex-col justify-between group"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-3xl p-3 bg-indigo-50 dark:bg-indigo-950 rounded-2xl border border-indigo-100 dark:border-indigo-900">
                      {sc.aiPersona.avatar}
                    </span>
                    <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold px-2.5 py-1 rounded-full">
                      سطح {sc.level}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">
                      {sc.titleFa}
                    </h3>
                    <p className="text-xs font-sans text-slate-400 font-semibold">{sc.titleEn}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                      {sc.descriptionFa}
                    </p>
                  </div>

                  <div className="space-y-1.5 pt-2">
                    <span className="text-[11px] font-bold text-slate-400 block">اهداف سناریو:</span>
                    {sc.objectives.map((obj) => (
                      <div key={obj.id} className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                        <Circle className="w-3 h-3 text-indigo-500 shrink-0" />
                        <span>{obj.titleFa}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => startScenario(sc)}
                  className="mt-6 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-3 rounded-2xl flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
                >
                  <span>شروع سناریو</span>
                  <ArrowRight className="w-4 h-4 rotate-180" />
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Active Roleplay Canvas */
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Column: Objectives & Hints */}
          <div className="lg:col-span-1 space-y-4">
            <button
              onClick={() => setActiveScenario(null)}
              className="w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all"
            >
              <ArrowRight className="w-4 h-4" />
              <span>بازگشت به لیست سناریوها</span>
            </button>

            {/* Accent Selector */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-indigo-500" />
                لهجه صدا در سناریو:
              </span>
              <div className="grid grid-cols-3 gap-1">
                {ACCENT_CONFIGS.map((acc) => (
                  <button
                    key={acc.code}
                    onClick={() => setSelectedAccent(acc.code)}
                    className={`py-1 rounded-lg text-[11px] font-bold transition-all ${
                      selectedAccent === acc.code
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {acc.flag} {acc.code.replace('en-', '')}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold border-b border-slate-100 dark:border-slate-800 pb-3">
                <CheckCircle2 className="w-5 h-5 text-indigo-500" />
                <h3 className="text-xs">چک‌لیست اهداف مکالمه</h3>
              </div>

              <div className="space-y-2.5">
                {activeScenario.objectives.map((obj) => {
                  const done = completedObjectives[obj.id];
                  return (
                    <div
                      key={obj.id}
                      className={`p-3 rounded-xl border text-xs transition-all flex items-start gap-2.5 ${
                        done
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-900 dark:text-emerald-200'
                          : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {done ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      ) : (
                        <Circle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <span className="font-bold block">{obj.titleFa}</span>
                        <span className="text-[10px] font-sans opacity-80 block">{obj.titleEn}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Useful Phrases Box */}
            <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 space-y-3">
              <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-amber-500" />
                جملات راهنما برای پاسخ سریع:
              </span>
              <div className="space-y-2">
                {activeScenario.usefulPhrases.map((phrase, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendScenarioMsg(phrase.en)}
                    className="w-full text-left bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-500 text-xs transition-all text-slate-800 dark:text-slate-200"
                  >
                    <p className="font-sans font-bold">"{phrase.en}"</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{phrase.fa}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Scenario Roleplay Chat Window */}
          <div className="lg:col-span-3 flex flex-col h-[650px] bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="bg-slate-50 dark:bg-slate-800/80 px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{activeScenario.aiPersona.avatar}</span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {activeScenario.aiPersona.name} ({activeScenario.aiPersona.role})
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{activeScenario.titleFa}</p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {scenarioMessages.map((msg) => {
                const isUser = msg.sender === 'user';
                return (
                  <div key={msg.id} className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-sm font-bold shrink-0">
                      {isUser ? <User className="w-4 h-4" /> : activeScenario.aiPersona.avatar}
                    </div>

                    <div className={`max-w-[80%] space-y-1 ${isUser ? 'items-end' : 'items-start'}`}>
                      <div
                        className={`p-4 rounded-2xl text-sm leading-relaxed ${
                          isUser
                            ? 'bg-indigo-600 text-white rounded-tr-none'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-tl-none'
                        }`}
                      >
                        <p className="font-sans">{msg.text}</p>
                        {msg.persianText && !isUser && (
                          <p className="text-xs text-indigo-700 dark:text-indigo-300 mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                            {msg.persianText}
                          </p>
                        )}
                      </div>

                      {!isUser && (
                        <button
                          onClick={() => speakEnglishText(msg.text, 1.0, selectedAccent)}
                          className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 p-1"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                          <span>پخش صوت</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {loading && (
                <div className="text-xs text-slate-400 animate-pulse flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-indigo-500" />
                  <span>{activeScenario.aiPersona.name} در حال تایپ پاسخ...</span>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendScenarioMsg();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="پاسخ خود را به انگلیسی بنویسید..."
                  disabled={loading}
                  className="flex-1 font-sans bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 dir-ltr text-left"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || loading}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-3 rounded-xl flex items-center gap-2 cursor-pointer"
                >
                  <Send className="w-4 h-4 rotate-180" />
                  <span>ارسال</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
