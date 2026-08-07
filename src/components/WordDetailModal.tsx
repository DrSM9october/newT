import React, { useState, useEffect } from 'react';
import { X, Volume2, Sparkles, BookOpen, Check, Bookmark, Globe } from 'lucide-react';
import { DictionaryWord, DialectType, GenderType } from '../types';
import { speakEnglishText, ACCENT_CONFIGS, SupportedAccent } from '../lib/speech';

interface WordDetailModalProps {
  wordObj: DictionaryWord | null;
  onClose: () => void;
  isBookmarked: boolean;
  isMastered: boolean;
  activeDialect?: DialectType;
  userGender?: GenderType;
  onToggleBookmark: (id: string) => void;
  onToggleMastered: (id: string) => void;
}

export const WordDetailModal: React.FC<WordDetailModalProps> = ({
  wordObj,
  onClose,
  isBookmarked,
  isMastered,
  activeDialect = 'en-US',
  userGender = 'masculine',
  onToggleBookmark,
  onToggleMastered,
}) => {
  const [aiData, setAiData] = useState<any | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [modalAccent, setModalAccent] = useState<SupportedAccent>(activeDialect);

  useEffect(() => {
    setModalAccent(activeDialect);
  }, [activeDialect]);

  useEffect(() => {
    if (wordObj) {
      setAiData(null);
      fetchAiExplanation(wordObj.word);
    }
  }, [wordObj, activeDialect, userGender]);

  const fetchAiExplanation = async (word: string) => {
    setLoadingAi(true);
    try {
      const res = await fetch('/api/dictionary-explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word, dialect: modalAccent, userGender }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setAiData(data.data);
      }
    } catch (e) {
      console.error('Failed to fetch AI explanation', e);
    } finally {
      setLoadingAi(false);
    }
  };

  if (!wordObj) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 left-5 p-2 text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-full bg-slate-100 dark:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Word Header & Accent Controls */}
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white font-sans">{wordObj.word}</h2>
              <span className="bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-xs font-bold px-2.5 py-0.5 rounded-full border border-indigo-300 dark:border-indigo-800">
                {wordObj.level}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                {wordObj.partOfSpeech}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-slate-500 dark:text-slate-400">
              <span>US: {wordObj.phonetic}</span>
              {wordObj.phoneticUk && <span>| UK: {wordObj.phoneticUk}</span>}
            </div>

            {/* Accent Selector Buttons */}
            <div className="flex items-center gap-1.5 pt-1">
              <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                <Globe className="w-3.5 h-3.5 text-indigo-500" /> لهجه:
              </span>
              {ACCENT_CONFIGS.map((acc) => (
                <button
                  key={acc.code}
                  onClick={() => {
                    setModalAccent(acc.code);
                    speakEnglishText(wordObj.word, 1.0, acc.code);
                  }}
                  className={`px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 border transition-all ${
                    modalAccent === acc.code
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <span>{acc.flag}</span>
                  <span>{acc.code.replace('en-', '')}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onToggleBookmark(wordObj.id)}
              className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all ${
                isBookmarked
                  ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}
            >
              <Bookmark className="w-4 h-4" />
              <span>{isBookmarked ? 'نشان شده' : 'نشان کردن'}</span>
            </button>

            <button
              onClick={() => onToggleMastered(wordObj.id)}
              className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all ${
                isMastered
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>{isMastered ? 'مسلط شده' : 'علامت مسلط'}</span>
            </button>
          </div>
        </div>

        {/* Persian Definition & Main Meaning */}
        <div className="my-5 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/80 rounded-2xl p-4">
          <span className="text-xs font-bold text-indigo-800 dark:text-indigo-300 block mb-1">معنی و معادل دقیق فارسی:</span>
          <p className="text-lg font-bold text-slate-900 dark:text-white">{wordObj.persianMeaning}</p>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 font-sans leading-relaxed">
            {wordObj.definitionEn}
          </p>
        </div>

        {/* Accent Difference Notes if present */}
        {wordObj.accentNotes && (
          <div className="my-4 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 space-y-2 text-xs">
            <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-indigo-500" />
              تفاوت کاربرد در لهجه‌های آمریکایی و بریتانیایی:
            </span>
            {wordObj.accentNotes.us && (
              <p className="text-slate-700 dark:text-slate-300">
                <strong className="text-indigo-600 dark:text-indigo-400">🇺🇸 آمریکایی (US):</strong> {wordObj.accentNotes.us}
              </p>
            )}
            {wordObj.accentNotes.uk && (
              <p className="text-slate-700 dark:text-slate-300">
                <strong className="text-indigo-600 dark:text-indigo-400">🇬🇧 بریتانیایی (UK):</strong> {wordObj.accentNotes.uk}
              </p>
            )}
          </div>
        )}

        {/* Example Sentences */}
        <div className="space-y-3 my-6">
          <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-indigo-500" />
            جملات نمونه واقعی در بافت کاربردی:
          </h3>
          <div className="space-y-2">
            {wordObj.examples.map((ex, idx) => (
              <div
                key={idx}
                className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs leading-relaxed"
              >
                <div className="flex items-center justify-between font-sans text-sm font-semibold text-slate-900 dark:text-white">
                  <span>"{ex.en}"</span>
                  <button
                    onClick={() => speakEnglishText(ex.en, 1.0, modalAccent)}
                    className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 p-1 flex items-center gap-1"
                    title={`پخش با لهجه ${modalAccent}`}
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-slate-500 dark:text-slate-400 mt-1 font-sans">{ex.fa}</p>
              </div>
            ))}
          </div>
        </div>

        {/* AI Deep Explanation Section */}
        <div className="border-t border-slate-100 dark:border-slate-800 pt-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              تحلیل هوشمند و هم‌آیندها (AI Deep Analysis)
            </h3>
            {loadingAi && (
              <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold animate-pulse">
                در حال دریافت تحلیل تخصصی...
              </span>
            )}
          </div>

          {aiData ? (
            <div className="bg-slate-50 dark:bg-slate-800/80 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 space-y-3 text-xs">
              {aiData.usageTipFa && (
                <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-3 rounded-xl text-amber-900 dark:text-amber-200">
                  <span className="font-bold block mb-1">💡 نکته کاربردی در زبان بومی:</span>
                  <p className="leading-relaxed">{aiData.usageTipFa}</p>
                </div>
              )}

              {aiData.collocations && aiData.collocations.length > 0 && (
                <div>
                  <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    ترکیبات هم‌آیند پرکاربرد (Collocations):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {aiData.collocations.map((c: string, i: number) => (
                      <span
                        key={i}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-indigo-700 dark:text-indigo-300 font-sans px-2.5 py-1 rounded-lg"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {aiData.extraExamples && aiData.extraExamples.length > 0 && (
                <div className="space-y-1.5 pt-2">
                  <span className="font-bold text-slate-700 dark:text-slate-300 block">
                    جملات کاربردی پیشنهادی هوش مصنوعی:
                  </span>
                  {aiData.extraExamples.map((item: any, i: number) => (
                    <div key={i} className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                      <p className="font-sans font-semibold text-slate-900 dark:text-white">"{item.en}"</p>
                      <p className="text-slate-500 text-[11px] mt-0.5">{item.fa}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-4 text-xs text-slate-400">
              در حال بارگذاری تحلیل تخصصی...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
