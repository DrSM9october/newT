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
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <Dumbbell className="w-6 h-6 text-indigo-600" />
          <div>
            <h2 className="text-xl font-black text-slate-900">مرکز تمرینات و کوییزهای هوشمند</h2>
            <p className="text-xs text-slate-500 font-medium">تست تثبیت لغات و گرامر انگلیسی و لهجه‌ها</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-2xl text-indigo-700 font-bold text-xs">
          <Award className="w-4 h-4 text-indigo-600" />
          <span>امتیاز: {score}</span>
        </div>
      </div>

      {/* Exercise Card */}
      {currentExercise && (
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 space-y-6 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>سوال {currentIndex + 1} از {PRACTICE_EXERCISES.length}</span>
            <span className="bg-slate-100 px-2.5 py-1 rounded-full text-indigo-700 font-bold border border-slate-200">
              سطح {currentExercise.level}
            </span>
          </div>

          <h3 className="text-base font-black text-slate-900 leading-relaxed">
            {currentExercise.questionFa}
          </h3>

          {/* Options List */}
          <div className="space-y-3">
            {currentExercise.options?.map((opt, idx) => {
              const isSelected = selectedOption === opt;
              const isCorrect = opt === currentExercise.correctAnswer;

              let style = 'bg-slate-50 border-slate-200 text-slate-800 hover:border-indigo-400';
              if (isSubmitted) {
                if (isCorrect) {
                  style = 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold';
                } else if (isSelected) {
                  style = 'bg-red-50 border-red-300 text-red-900 font-bold';
                }
              } else if (isSelected) {
                style = 'bg-indigo-50 border-indigo-500 text-indigo-900 font-bold';
              }

              return (
                <button
                  key={idx}
                  disabled={isSubmitted}
                  onClick={() => setSelectedOption(opt)}
                  className={`w-full p-4 rounded-2xl border text-sm text-right transition-all flex items-center justify-between cursor-pointer ${style}`}
                >
                  <span className="font-sans font-medium" dir="ltr">{opt}</span>
                  {isSubmitted && isCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                  {isSubmitted && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-red-600" />}
                </button>
              );
            })}
          </div>

          {/* Explanation Box */}
          {isSubmitted && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-700 space-y-1">
              <span className="font-bold text-indigo-700">💡 پاسخ و توضیح:</span>
              <p className="leading-relaxed font-medium">{currentExercise.explanationFa}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end">
            {!isSubmitted ? (
              <button
                onClick={handleSubmit}
                disabled={!selectedOption}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold px-6 py-3 rounded-2xl transition-all cursor-pointer shadow-xs"
              >
                بررسی پاسخ
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-3 rounded-2xl transition-all cursor-pointer shadow-xs"
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
