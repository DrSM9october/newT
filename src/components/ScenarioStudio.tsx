import React, { useState, useEffect } from 'react';
import { Theater, CheckCircle2, ArrowRight, Volume2, Mic, MicOff, Send, MessageSquare, Award, Sparkles, Navigation, Bed, Coffee, Briefcase } from 'lucide-react';
import { RoleplayScenario, ChatMessage, DialectType } from '../types';
import { PRACTICAL_SCENARIOS } from '../data/scenariosData';
import { aiManager } from '../core/AIManager';
import { speakEnglishText, stopSpeech, ACCENT_CONFIGS, SupportedAccent } from '../lib/speech';

interface ScenarioStudioProps {
  activeDialect: DialectType;
}

export const ScenarioStudio: React.FC<ScenarioStudioProps> = ({ activeDialect }) => {
  const [activeScenario, setActiveScenario] = useState<RoleplayScenario | null>(null);
  const [scenarioMessages, setScenarioMessages] = useState<ChatMessage[]>([]);
  const [inputVal, setInputVal] = useState('');
  const [loading, setLoading] = useState(false);
  const [completedObjectives, setCompletedObjectives] = useState<Record<string, boolean>>({});
  const [selectedAccent, setSelectedAccent] = useState<SupportedAccent>(activeDialect as SupportedAccent);
  const [filterDialect, setFilterDialect] = useState<'all' | 'english' | 'ar-IQ' | 'ar-LB'>('all');
  const [showFeedbackModalId, setShowFeedbackModalId] = useState<string | null>(null);

  useEffect(() => {
    if (activeScenario?.dialect) {
      setSelectedAccent(activeScenario.dialect as SupportedAccent);
    } else {
      setSelectedAccent(activeDialect as SupportedAccent);
    }
  }, [activeScenario, activeDialect]);

  // Handle hardware / browser back button for active scenario
  useEffect(() => {
    const handlePopState = () => {
      if (activeScenario) {
        stopSpeech();
        setActiveScenario(null);
      }
    };

    if (activeScenario) {
      window.history.pushState({ scenarioActive: true }, '');
      window.addEventListener('popstate', handlePopState);
    }

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [activeScenario]);

  const handleExitScenario = () => {
    stopSpeech();
    setActiveScenario(null);
    if (window.history.state && window.history.state.scenarioActive) {
      window.history.back();
    }
  };

  const filteredScenarios = PRACTICAL_SCENARIOS.filter((sc) => {
    if (filterDialect === 'all') return true;
    if (filterDialect === 'english') return !sc.dialect || sc.dialect.startsWith('en');
    return sc.dialect === filterDialect;
  });

  const handleStartScenario = (scenario: RoleplayScenario) => {
    setActiveScenario(scenario);
    setCompletedObjectives({});
    setShowFeedbackModalId(null);

    const initialMsg: ChatMessage = {
      id: `sc_ai_${Date.now()}`,
      sender: 'ai',
      text: scenario.starterMessage,
      timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
    };

    setScenarioMessages([initialMsg]);
    speakEnglishText(
      initialMsg.text,
      1.0,
      (scenario.dialect || activeDialect) as SupportedAccent,
      1.0,
      scenario.aiPersona.gender || 'male'
    );
  };

  const handleSendScenarioMsg = async (textOverride?: string) => {
    const textToSend = textOverride || inputVal;
    if (!textToSend.trim() || loading || !activeScenario) return;

    const userMsgId = `sc_usr_${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMsgId,
      sender: 'user',
      text: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
    };

    setScenarioMessages((prev) => [...prev, userMsg]);
    if (!textOverride) setInputVal('');
    setLoading(true);

    try {
      const resData = await aiManager.sendScenarioMessage({
        userText: textToSend.trim(),
        history: scenarioMessages.slice(-6),
        persona: activeScenario.aiPersona,
        dialect: (activeScenario.dialect || selectedAccent) as DialectType,
      });

      if (resData) {
        if (resData.grammarScore) {
          setScenarioMessages((prev) =>
            prev.map((m) =>
              m.id === userMsgId
                ? {
                    ...m,
                    feedback: {
                      grammarScore: resData.grammarScore,
                      correctedSentence: resData.correctedSentence,
                      explanationFa: resData.explanationFa,
                      betterAlternatives: resData.betterAlternatives,
                      persianTranslation: resData.replyFa,
                    },
                  }
                : m
            )
          );
        }

        const aiMsg: ChatMessage = {
          id: `sc_ai_${Date.now()}`,
          sender: 'ai',
          text: resData.replyEn || 'Very well!',
          persianText: resData.replyFa || 'بسیار عالی!',
          timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
        };

        setScenarioMessages((prev) => [...prev, aiMsg]);
        speakEnglishText(
          aiMsg.text,
          1.0,
          (activeScenario.dialect || selectedAccent) as SupportedAccent,
          1.0,
          activeScenario.aiPersona.gender || 'male'
        );

        // Auto objective completion check
        const nextObj = activeScenario.objectives.find((o) => !completedObjectives[o.id]);
        if (nextObj) {
          setCompletedObjectives((prev) => ({ ...prev, [nextObj.id]: true }));
        }
      }
    } catch (e) {
      console.error('Scenario msg error:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      {!activeScenario ? (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-700 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-md text-white">
            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/20 text-white backdrop-blur-sm">
                <Theater className="w-3.5 h-3.5" />
                تمرین تعاملی نقش‌آفرینی (Interactive Roleplay)
              </span>
              <h2 className="text-2xl font-black text-white">سناریوهای کاربردی انگلیسی و لهجه‌های محلی عربی</h2>
              <p className="text-xs md:text-sm text-indigo-100 leading-relaxed max-w-2xl font-medium">
                در موقعیت‌های واقعی قرار بگیرید! از سفارش کافه و فرودگاه تا خرید در بازار بغداد 🇮🇶، تاکسی عراقی و هتل بیروت 🇱🇧.
              </p>
            </div>
          </div>

          {/* Dialect Filter Tabs */}
          <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-2xl border border-slate-200/80 shadow-xs">
            <button
              onClick={() => setFilterDialect('all')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterDialect === 'all'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              همه سناریوها ({PRACTICAL_SCENARIOS.length})
            </button>
            <button
              onClick={() => setFilterDialect('english')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterDialect === 'english'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              🇺🇸 🇬🇧 انگلیسی
            </button>
            <button
              onClick={() => setFilterDialect('ar-IQ')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterDialect === 'ar-IQ'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              🇮🇶 لهجه محلی عراقی
            </button>
            <button
              onClick={() => setFilterDialect('ar-LB')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterDialect === 'ar-LB'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              🇱🇧 لهجه محلی لبنانی
            </button>
          </div>

          {/* Scenarios Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredScenarios.map((sc) => (
              <div
                key={sc.id}
                className="bg-white rounded-3xl p-6 border border-slate-200/80 hover:border-indigo-400 hover:shadow-md transition-all flex flex-col justify-between space-y-4 group shadow-xs"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-3xl p-3 bg-slate-50 rounded-2xl border border-slate-200">
                      {sc.aiPersona.avatar}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {sc.dialect === 'ar-IQ' && (
                        <span className="bg-emerald-50 text-emerald-700 text-[11px] font-bold px-2.5 py-1 rounded-full border border-emerald-200">
                          🇮🇶 عراقی
                        </span>
                      )}
                      {sc.dialect === 'ar-LB' && (
                        <span className="bg-red-50 text-red-700 text-[11px] font-bold px-2.5 py-1 rounded-full border border-red-200">
                          🇱🇧 لبنانی
                        </span>
                      )}
                      <span className="bg-slate-100 text-slate-700 text-xs font-bold px-2.5 py-1 rounded-full border border-slate-200">
                        سطح {sc.level}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
                      {sc.titleFa}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5 font-medium">{sc.titleEn}</p>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed font-medium">{sc.descriptionFa}</p>
                </div>

                <button
                  onClick={() => handleStartScenario(sc)}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>شروع مکالمه و نقش‌آفرینی</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Active Roleplay Session View */
        <div className="space-y-4">
          {/* Top Navigation Bar with Back Button */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 flex items-center justify-between shadow-xs">
            <button
              onClick={handleExitScenario}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2 px-4 rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-xs"
            >
              <ArrowRight className="w-4 h-4" />
              <span>بازگشت به لیست سناریوها</span>
            </button>

            <div className="flex items-center gap-2">
              <span className="text-2xl p-1 bg-slate-50 rounded-xl border border-slate-200">
                {activeScenario.aiPersona.avatar}
              </span>
              <div>
                <h3 className="text-xs md:text-sm font-black text-slate-900">{activeScenario.titleFa}</h3>
                <p className="text-[10px] text-slate-500 font-medium">{activeScenario.aiPersona.name} ({activeScenario.aiPersona.role})</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sidebar Info */}
            <div className="lg:col-span-1 space-y-4">
              <button
                onClick={handleExitScenario}
                className="w-full bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 font-bold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
              >
                <ArrowRight className="w-4 h-4" />
                <span>بازگشت به لیست سناریوها</span>
              </button>

            <div className="bg-white border border-slate-200/80 rounded-3xl p-5 space-y-4 shadow-xs">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-200">
                <span className="text-3xl p-2 bg-slate-100 rounded-2xl border border-slate-200">{activeScenario.aiPersona.avatar}</span>
                <div>
                  <h3 className="text-sm font-black text-slate-900">{activeScenario.aiPersona.name}</h3>
                  <p className="text-xs text-slate-500 font-medium">{activeScenario.aiPersona.role}</p>
                </div>
              </div>

              {/* Objectives List */}
              <div className="space-y-2">
                <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-indigo-600" />
                  <span>اهداف این سناریو:</span>
                </h4>
                <div className="space-y-1.5">
                  {activeScenario.objectives.map((obj) => (
                    <div
                      key={obj.id}
                      className={`p-2.5 rounded-xl border text-xs flex items-center gap-2 transition-all ${
                        completedObjectives[obj.id]
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-bold'
                          : 'bg-slate-50 border-slate-200 text-slate-600'
                      }`}
                    >
                      <CheckCircle2
                        className={`w-4 h-4 ${
                          completedObjectives[obj.id] ? 'text-emerald-600' : 'text-slate-400'
                        }`}
                      />
                      <span>{obj.titleFa}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Useful Phrases */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <h4 className="text-xs font-black text-slate-800">جملات پیشنهادی کلیدی:</h4>
                <div className="space-y-1.5">
                  {activeScenario.usefulPhrases.map((phrase, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendScenarioMsg(phrase.en)}
                      className="w-full text-right bg-slate-50 p-2.5 rounded-xl border border-slate-200 hover:border-indigo-400 text-xs transition-all text-slate-800 cursor-pointer"
                    >
                      <p className="font-sans font-bold text-slate-900" dir="ltr" style={{ textAlign: 'left' }}>"{phrase.en}"</p>
                      <p className="text-[11px] text-slate-500 mt-0.5 font-medium" dir="rtl">{phrase.fa}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Chat Window */}
          <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-3xl p-4 flex flex-col h-[600px] shadow-xs">
            <div className="flex-1 overflow-y-auto space-y-4 p-2">
              {scenarioMessages.map((msg) => {
                const isUser = msg.sender === 'user';
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col space-y-1.5 ${isUser ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[85%] p-4 rounded-3xl text-sm leading-relaxed ${
                        isUser
                          ? 'bg-indigo-600 text-white rounded-br-none shadow-xs'
                          : 'bg-slate-100 text-slate-900 rounded-bl-none border border-slate-200'
                      }`}
                    >
                      <p className="font-sans font-medium text-base" dir="ltr" style={{ textAlign: 'left' }}>{msg.text}</p>
                      {msg.persianText && (
                        <p className="text-xs text-slate-600 pt-2 mt-2 border-t border-slate-200" dir="rtl" style={{ textAlign: 'right' }}>
                          {msg.persianText}
                        </p>
                      )}

                      {/* Grammar Analysis Option */}
                      {isUser && msg.feedback && (
                        <div className="mt-2 pt-2 border-t border-indigo-400/30 flex items-center justify-between text-xs text-indigo-100" dir="rtl">
                          <span>امتیاز گرامری: {msg.feedback.grammarScore}٪</span>
                          <button
                            onClick={() =>
                              setShowFeedbackModalId(
                                showFeedbackModalId === msg.id ? null : msg.id
                              )
                            }
                            className="bg-white/20 hover:bg-white/30 text-white font-bold px-2 py-0.5 rounded text-[10px] cursor-pointer"
                          >
                            تحلیل
                          </button>
                        </div>
                      )}
                    </div>

                    {isUser && msg.feedback && showFeedbackModalId === msg.id && (
                      <div className="max-w-[85%] bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs space-y-1.5 text-amber-950 font-sans shadow-xs" dir="rtl">
                        {msg.feedback.correctedSentence && (
                          <p className="p-2 bg-white rounded-lg font-mono text-emerald-800 font-bold border border-amber-200" dir="ltr" style={{ textAlign: 'left' }}>
                            ✨ "{msg.feedback.correctedSentence}"
                          </p>
                        )}
                        {msg.feedback.explanationFa && (
                          <p className="text-amber-900 font-medium">💡 {msg.feedback.explanationFa}</p>
                        )}
                      </div>
                    )}

                    {!isUser && (
                      <button
                        onClick={() =>
                          speakEnglishText(
                            msg.text,
                            1.0,
                            (activeScenario.dialect || selectedAccent) as SupportedAccent,
                            1.0,
                            activeScenario.aiPersona.gender || 'male'
                          )
                        }
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 p-1 cursor-pointer"
                        dir="rtl"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>پخش صوت نیتیو ({activeScenario.aiPersona.gender === 'male' ? '👨 صدای مردانه' : '👩 صدای زنانه'})</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Input Box */}
            <div className="pt-3 border-t border-slate-200 flex items-center gap-2">
              <input
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendScenarioMsg()}
                placeholder="پاسخ خود را بنویسید..."
                className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-800 focus:outline-none placeholder-slate-400"
                dir="ltr"
              />
              <button
                onClick={() => handleSendScenarioMsg()}
                disabled={!inputVal.trim() || loading}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold p-3 rounded-2xl transition-all cursor-pointer shadow-xs"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
  </div>
);
};
