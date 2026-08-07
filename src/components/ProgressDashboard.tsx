import React from 'react';
import {
  BarChart3,
  Flame,
  BookMarked,
  CheckCircle2,
  Clock,
  TrendingUp,
} from 'lucide-react';
import { DifficultyLevel, UserProgress } from '../types';
import { TOTAL_DICTIONARY_STATS } from '../data/dictionaryData';

interface ProgressDashboardProps {
  progress: UserProgress;
  userLevel: DifficultyLevel;
}

export const ProgressDashboard: React.FC<ProgressDashboardProps> = ({ progress }) => {
  const totalMastered = progress.masteredWordIds.length;
  const wordMasteryPercentage = Math.round((totalMastered / TOTAL_DICTIONARY_STATS.totalWords) * 100);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 text-white rounded-3xl p-6 md:p-8 border border-indigo-800/40 shadow-lg flex flex-wrap items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl">
          <span className="bg-indigo-500/20 text-indigo-300 text-xs font-bold px-3 py-1 rounded-full border border-indigo-500/30 inline-flex items-center gap-1">
            <BarChart3 className="w-3.5 h-3.5 text-indigo-400" />
            داشبورد پیشرفت و تحلیل آماری
          </span>
          <h2 className="text-2xl md:text-3xl font-black">گزارش عملکرد یادگیری شما</h2>
          <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
            روند یادگیری روزانه، کلمات تسلط‌یافته، تمرین‌های انجام‌شده و امتیازات به دست آمده را به‌صورت زنده رصد کنید.
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-md p-5 rounded-2xl border border-white/10 text-center min-w-[200px]">
          <span className="text-3xl font-black text-amber-400 block font-sans">{progress.xpPoints}</span>
          <span className="text-xs font-bold text-slate-200 mt-1 block">امتیاز تجربه (XP)</span>
        </div>
      </div>

      {/* Main Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950 text-amber-600 flex items-center justify-center shrink-0">
            <Flame className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <span className="text-2xl font-black text-slate-900 dark:text-white block font-sans">
              {progress.dailyStreak} روز
            </span>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">زنجیره مطالعه مداوم</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
          </div>
          <div>
            <span className="text-2xl font-black text-slate-900 dark:text-white block font-sans">
              {totalMastered} کلمه
            </span>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">تسلط کامل در دیکشنری</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center shrink-0">
            <BookMarked className="w-6 h-6 text-indigo-500" />
          </div>
          <div>
            <span className="text-2xl font-black text-slate-900 dark:text-white block font-sans">
              {progress.bookmarkedWordIds.length} کلمه
            </span>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">نشان‌شده در لیست مطالعه</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6 text-indigo-500" />
          </div>
          <div>
            <span className="text-2xl font-black text-slate-900 dark:text-white block font-sans">
              {progress.totalPracticeMinutes} دقیقه
            </span>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">زمان تمرین مفید</span>
          </div>
        </div>
      </div>

      {/* Progress Bars */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-indigo-500" />
          <span>میزان پیشرفت در بانک کلمات انگلیسی ({TOTAL_DICTIONARY_STATS.totalWords.toLocaleString('fa-IR')} کلمه)</span>
        </h3>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
            <span>درصد تسلط بر دیتابیس کلمات</span>
            <span className="font-mono text-indigo-600 dark:text-indigo-400">{wordMasteryPercentage}٪</span>
          </div>
          <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-600 transition-all duration-500 rounded-full"
              style={{ width: `${Math.max(wordMasteryPercentage, 4)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
