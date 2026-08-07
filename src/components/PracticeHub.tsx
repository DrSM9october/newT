import React, { useState } from 'react';
import { Dumbbell, CheckCircle2, XCircle, Award, RefreshCw, Volume2 } from 'lucide-react';
import { PRACTICE_EXERCISES } from '../data/exercisesData';
import { speakEnglishText } from '../lib/speech';
import { DialectType } from '../types';

interface PracticeHubProps {
  activeDialect: DialectType;
}

export const PracticeHub: React.FC<PracticeHubProps> = ({ activeDialect }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  const currentExercise = PRACTICE_EXERCISES[currentIndex];

  const handleSubmit = () => {
    if (!selectedOption || !currentExercise) return;
    setIsSubmitted(true);
    if (selectedOption === currentExercise.correctAnswer) {
      setScore((prev) => prev + 10);
    }
  };

  const handleNext = () => {
    setSelectedOption(null);
    setIsSubmitted(false);
    if (currentIndex < PRACTICE_EXERCISES.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      alert(`تمرین‌ها تمام شد! امتیاز کل شما: ${score + (selectedOption === currentExercise?.correctAnswer ? 10 : 0)}`);
      setCurrentIndex(0);
      setScore(0);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Dumbbell className="w-6 h-6 text-indigo-400" />
          <div>
            <h2 className="text-xl font-black text-white">مرکز تمرینات و کوییزهای هوشمند</h2>
            <p className="text-xs text-slate-400">تست تثبیت لغات و گرامر انگلیسی و لهجه‌ها</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-indigo-950 border border-indigo-800 px-3 py-1.5 rounded-2xl text-indigo-300 font-bold text-xs">
          <Award className="w-4 h-4" />
          <span>امتیاز: {score}</span>
        </div>
      </div>

      {/* Exercise Card */}
      {currentExercise && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400">
            <span>سوال {currentIndex + 1} از {PRACTICE_EXERCISES.length}</span>
            <span className="bg-slate-800 px-2.5 py-1 rounded-full text-indigo-300">
              سطح {currentExercise.level}
            </span>
          </div>

          <h3 className="text-base font-black text-white leading-relaxed">
            {currentExercise.questionFa}
          </h3>

          {/* Options List */}
          <div className="space-y-3">
            {currentExercise.options?.map((opt, idx) => {
              const isSelected = selectedOption === opt;
              const isCorrect = opt === currentExercise.correctAnswer;

              let style = 'bg-slate-950 border-slate-800 text-slate-200 hover:border-indigo-500/50';
              if (isSubmitted) {
                if (isCorrect) {
                  style = 'bg-emerald-950/60 border-emerald-600 text-emerald-200 font-bold';
                } else if (isSelected) {
                  style = 'bg-red-950/60 border-red-600 text-red-200';
                }
              } else if (isSelected) {
                style = 'bg-indigo-600/20 border-indigo-500 text-indigo-200 font-bold';
              }

              return (
                <button
                  key={idx}
                  disabled={isSubmitted}
                  onClick={() => setSelectedOption(opt)}
                  className={`w-full p-4 rounded-2xl border text-sm text-right transition-all flex items-center justify-between cursor-pointer ${style}`}
                >
                  <span className="font-sans">{opt}</span>
                  {isSubmitted && isCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                  {isSubmitted && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-red-400" />}
                </button>
              );
            })}
          </div>

          {/* Explanation Box */}
          {isSubmitted && (
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs text-slate-300 space-y-1">
              <span className="font-bold text-indigo-300">💡 پاسخ و توضیح:</span>
              <p className="leading-relaxed">{currentExercise.explanationFa}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end">
            {!isSubmitted ? (
              <button
                onClick={handleSubmit}
                disabled={!selectedOption}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold px-6 py-3 rounded-2xl transition-all cursor-pointer"
              >
                بررسی پاسخ
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-3 rounded-2xl transition-all cursor-pointer"
              >
                سوال بعدی
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
