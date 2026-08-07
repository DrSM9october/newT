import React, { useState } from 'react';
import {
  Dumbbell,
  Volume2,
  CheckCircle2,
  XCircle,
  Globe
} from 'lucide-react';
import { EDUCATIONAL_DRILL_EXERCISES } from '../data/exercisesData';
import { DifficultyLevel } from '../types';
import { speakEnglishText, ACCENT_CONFIGS, SupportedAccent } from '../lib/speech';

interface PracticeHubProps {
  userLevel: DifficultyLevel;
  onIncrementXp: (amount: number) => void;
}

export const PracticeHub: React.FC<PracticeHubProps> = ({ onIncrementXp }) => {
  const [drillMode, setDrillMode] = useState<'unscramble' | 'fill_blank' | 'listening' | 'flashcard'>('unscramble');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAccent, setSelectedAccent] = useState<SupportedAccent>('en-US');

  // Unscramble state
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [remainingWords, setRemainingWords] = useState<string[]>([]);
  const [isChecked, setIsChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  // Fill in blank state
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  // Listening state
  const [typedInput, setTypedInput] = useState('');

  // Flashcard state
  const [isFlipped, setIsFlipped] = useState(false);

  // Get filtered drills
  const currentDrills = EDUCATIONAL_DRILL_EXERCISES.filter((ex) => {
    if (drillMode === 'unscramble') return ex.type === 'unscramble';
    if (drillMode === 'fill_blank') return ex.type === 'fill_blank';
    if (drillMode === 'listening') return ex.type === 'listening';
    return true; // for flashcards
  });

  const currentExercise = currentDrills[currentIndex] || currentDrills[0];

  // Initialize exercise when index changes
  React.useEffect(() => {
    if (currentExercise) {
      if (currentExercise.type === 'unscramble' && currentExercise.scrambledWords) {
        setRemainingWords([...currentExercise.scrambledWords].sort(() => Math.random() - 0.5));
        setSelectedWords([]);
      }
      setSelectedOption(null);
      setTypedInput('');
      setIsChecked(false);
      setIsCorrect(false);
      setIsFlipped(false);
    }
  }, [currentIndex, drillMode]);

  const handleAddWordToSentence = (word: string, index: number) => {
    if (isChecked) return;
    setSelectedWords((prev) => [...prev, word]);
    setRemainingWords((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRemoveWordFromSentence = (word: string, index: number) => {
    if (isChecked) return;
    setSelectedWords((prev) => prev.filter((_, i) => i !== index));
    setRemainingWords((prev) => [...prev, word]);
  };

  const checkUnscrambleAnswer = () => {
    if (!currentExercise) return;
    const constructed = selectedWords.join(' ').trim();
    const correct = constructed.replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '').toLowerCase() ===
      currentExercise.sentenceEn.replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '').toLowerCase();

    setIsCorrect(correct);
    setIsChecked(true);
    if (correct) {
      onIncrementXp(15);
      speakEnglishText(currentExercise.sentenceEn, 1.0, selectedAccent);
    }
  };

  const checkFillBlankAnswer = () => {
    if (!currentExercise) return;
    const correct = selectedOption === currentExercise.targetWord;
    setIsCorrect(correct);
    setIsChecked(true);
    if (correct) {
      onIncrementXp(15);
      speakEnglishText(currentExercise.sentenceEn, 1.0, selectedAccent);
    }
  };

  const checkListeningAnswer = () => {
    if (!currentExercise) return;
    const cleanTyped = typedInput.trim().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '').toLowerCase();
    const cleanCorrect = currentExercise.sentenceEn.replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '').toLowerCase();
    const correct = cleanTyped === cleanCorrect;

    setIsCorrect(correct);
    setIsChecked(true);
    if (correct) {
      onIncrementXp(20);
    }
  };

  const handleNext = () => {
    if (currentIndex < currentDrills.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setCurrentIndex(0);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 text-white rounded-3xl p-6 border border-indigo-800/40 shadow-md space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="bg-indigo-500/20 text-indigo-300 text-xs font-bold px-3 py-1 rounded-full border border-indigo-500/30 inline-flex items-center gap-1">
              <Dumbbell className="w-3.5 h-3.5" />
              مرکز تمرینات و کارگاه مکالمه و جمله‌سازی
            </span>
            <h2 className="text-2xl font-black">تمرین‌های ساختارشناسی و لهجه‌ها</h2>
          </div>

          {/* Accent Switcher */}
          <div className="flex items-center gap-1 bg-white/10 p-1.5 rounded-2xl border border-white/10 text-xs">
            <Globe className="w-4 h-4 text-indigo-300 mx-1" />
            {ACCENT_CONFIGS.map((acc) => (
              <button
                key={acc.code}
                onClick={() => setSelectedAccent(acc.code)}
                className={`px-2 py-1 rounded-lg font-bold transition-all ${
                  selectedAccent === acc.code ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'
                }`}
              >
                {acc.flag} {acc.code.replace('en-', '')}
              </button>
            ))}
          </div>
        </div>

        {/* Drill Mode Tabs */}
        <div className="flex flex-wrap items-center bg-white/10 backdrop-blur-md p-1 rounded-2xl border border-white/10">
          <button
            onClick={() => {
              setDrillMode('unscramble');
              setCurrentIndex(0);
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              drillMode === 'unscramble' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'
            }`}
          >
            چیدمان کلمات
          </button>
          <button
            onClick={() => {
              setDrillMode('fill_blank');
              setCurrentIndex(0);
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              drillMode === 'fill_blank' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'
            }`}
          >
            جای خالی
          </button>
          <button
            onClick={() => {
              setDrillMode('listening');
              setCurrentIndex(0);
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              drillMode === 'listening' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'
            }`}
          >
            شنیداری و دیکته
          </button>
          <button
            onClick={() => {
              setDrillMode('flashcard');
              setCurrentIndex(0);
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              drillMode === 'flashcard' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'
            }`}
          >
            کارت‌های مرور (Flashcard)
          </button>
        </div>
      </div>

      {currentExercise && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          {/* Progress Indicator */}
          <div className="flex items-center justify-between text-xs text-slate-500 font-bold pb-4 border-b border-slate-100 dark:border-slate-800">
            <span>
              تمرین شماره {currentIndex + 1} از {currentDrills.length}
            </span>
            <span className="bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-2.5 py-0.5 rounded-full font-mono">
              سطح {currentExercise.level}
            </span>
          </div>

          {/* Mode 1: Sentence Unscramble Builder */}
          {drillMode === 'unscramble' && (
            <div className="space-y-6">
              <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                <span className="text-xs font-bold text-slate-400 block mb-1">معنی جمله به فارسی:</span>
                <p className="text-base font-bold text-slate-900 dark:text-white">{currentExercise.sentenceFa}</p>
              </div>

              {/* User Drop Area */}
              <div className="min-h-[70px] bg-slate-100 dark:bg-slate-800 p-4 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 flex flex-wrap gap-2 items-center">
                {selectedWords.length > 0 ? (
                  selectedWords.map((word, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleRemoveWordFromSentence(word, idx)}
                      className="bg-indigo-600 text-white font-sans font-bold px-3 py-2 rounded-xl text-sm shadow-sm hover:bg-rose-600 transition-all cursor-pointer"
                    >
                      {word}
                    </button>
                  ))
                ) : (
                  <span className="text-xs text-slate-400">کلمات را از کادر پایین انتخاب کنید تا جمله ساخته شود...</span>
                )}
              </div>

              {/* Scrambled Word Pool */}
              <div className="flex flex-wrap gap-2 pt-2">
                {remainingWords.map((word, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleAddWordToSentence(word, idx)}
                    className="bg-slate-100 dark:bg-slate-800 hover:bg-indigo-100 dark:hover:bg-indigo-950 text-slate-900 dark:text-white font-sans font-bold px-3.5 py-2 rounded-xl text-sm border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
                  >
                    {word}
                  </button>
                ))}
              </div>

              {/* Check & Result */}
              {!isChecked ? (
                <button
                  onClick={checkUnscrambleAnswer}
                  disabled={selectedWords.length === 0}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-3.5 rounded-2xl text-xs transition-all cursor-pointer"
                >
                  بررسی پاسخ
                </button>
              ) : (
                <div
                  className={`p-5 rounded-2xl border space-y-3 ${
                    isCorrect
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-900 dark:text-emerald-200'
                      : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 text-rose-900 dark:text-rose-200'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-sm">
                    {isCorrect ? (
                      <>
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        <span>آفرین! پاسخ کاملاً درست است. (۱۵+ امتیاز XP)</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-5 h-5 text-rose-600" />
                        <span>پاسخ صحیح: "{currentExercise.sentenceEn}"</span>
                      </>
                    )}
                  </div>

                  {currentExercise.grammarNoteFa && (
                    <p className="text-xs leading-relaxed opacity-90">
                      💡 <strong>نکته گرامری:</strong> {currentExercise.grammarNoteFa}
                    </p>
                  )}

                  <button
                    onClick={handleNext}
                    className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold py-3 rounded-xl text-xs transition-all mt-2 cursor-pointer"
                  >
                    تمرین بعدی
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Mode 2: Fill in the Blank */}
          {drillMode === 'fill_blank' && (
            <div className="space-y-6">
              <div className="bg-slate-50 dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                <span className="text-xs font-bold text-slate-400 block">جمله انگلیسی:</span>
                <p className="font-sans font-bold text-lg text-slate-900 dark:text-white">
                  "{currentExercise.sentenceEn.replace('____', '_______')}"
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-sans mt-2">
                  معنی فارسی: {currentExercise.sentenceFa}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {currentExercise.options?.map((opt, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedOption(opt)}
                    className={`p-4 rounded-2xl border font-sans font-bold text-sm transition-all ${
                      selectedOption === opt
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>

              {!isChecked ? (
                <button
                  onClick={checkFillBlankAnswer}
                  disabled={!selectedOption}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-3.5 rounded-2xl text-xs transition-all cursor-pointer"
                >
                  تایید انتخاب
                </button>
              ) : (
                <div
                  className={`p-5 rounded-2xl border space-y-3 ${
                    isCorrect
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-900 dark:text-emerald-200'
                      : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 text-rose-900 dark:text-rose-200'
                  }`}
                >
                  <p className="font-bold text-sm">
                    {isCorrect ? 'پاسخ صحیح است! 🎉' : `کلمه درست: ${currentExercise.targetWord}`}
                  </p>
                  <button
                    onClick={handleNext}
                    className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold py-3 rounded-xl text-xs mt-2"
                  >
                    تمرین بعدی
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Mode 3: Listening & Dictation */}
          {drillMode === 'listening' && (
            <div className="space-y-6 text-center">
              <button
                onClick={() => speakEnglishText(currentExercise.sentenceEn, 1.0, selectedAccent)}
                className="mx-auto w-20 h-20 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full flex items-center justify-center shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
              >
                <Volume2 className="w-8 h-8" />
              </button>
              <p className="text-xs text-slate-500 font-bold">روی دکمه بالا کلیک کنید تا جمله با لهجه انتخابی خوانده شود.</p>

              <input
                type="text"
                value={typedInput}
                onChange={(e) => setTypedInput(e.target.value)}
                placeholder="جمله شنیده شده را اینجا تایپ کنید..."
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl p-4 text-center text-base font-sans font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />

              {!isChecked ? (
                <button
                  onClick={checkListeningAnswer}
                  disabled={!typedInput.trim()}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-3.5 rounded-2xl text-xs"
                >
                  بررسی دیکته
                </button>
              ) : (
                <div className="p-5 rounded-2xl bg-slate-100 dark:bg-slate-800 space-y-3">
                  <p className="font-bold text-sm text-slate-900 dark:text-white">جمله درست: "{currentExercise.sentenceEn}"</p>
                  <button
                    onClick={handleNext}
                    className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl text-xs"
                  >
                    جمله بعدی
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Mode 4: Leitner SRS Flashcards */}
          {drillMode === 'flashcard' && (
            <div className="space-y-6">
              <div
                onClick={() => setIsFlipped((prev) => !prev)}
                className="min-h-[220px] bg-gradient-to-br from-slate-100 via-white to-indigo-50 dark:from-slate-800 dark:to-slate-900 border-2 border-indigo-500/30 rounded-3xl p-8 flex flex-col items-center justify-center text-center cursor-pointer shadow-md hover:border-indigo-500 transition-all"
              >
                {!isFlipped ? (
                  <div className="space-y-3">
                    <h3 className="text-2xl font-black font-sans text-slate-900 dark:text-white">
                      {currentExercise.sentenceEn}
                    </h3>
                    <p className="text-xs text-indigo-600 font-bold">برای چرخش کارت و مشاهده ترجمه کلیک کنید 🔄</p>
                  </div>
                ) : (
                  <div className="space-y-3 animate-in fade-in">
                    <h3 className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
                      {currentExercise.sentenceFa}
                    </h3>
                    {currentExercise.grammarNoteFa && (
                      <p className="text-xs text-slate-500 max-w-md">{currentExercise.grammarNoteFa}</p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleNext}
                  className="flex-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-900 dark:text-white font-bold py-3 rounded-2xl text-xs"
                >
                  کارت بعدی
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
