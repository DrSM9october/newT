import React from 'react';
import {
  MessageSquareText,
  BookOpen,
  Theater,
  Dumbbell,
  BarChart3,
  Flame,
  Sparkles,
  BookMarked,
  Sun,
  Moon,
  Globe,
  UserCheck
} from 'lucide-react';
import { DifficultyLevel, DialectType, GenderType } from '../types';
import { TOTAL_DICTIONARY_STATS } from '../data/dictionaryData';
import { ACCENT_CONFIGS } from '../lib/speech';

interface HeaderProps {
  activeTab: 'chat' | 'dictionary' | 'scenarios' | 'drills' | 'progress';
  setActiveTab: (tab: 'chat' | 'dictionary' | 'scenarios' | 'drills' | 'progress') => void;
  userLevel: DifficultyLevel;
  setUserLevel: (level: DifficultyLevel) => void;
  activeDialect: DialectType;
  setActiveDialect: (dialect: DialectType) => void;
  userGender: GenderType;
  setUserGender: (gender: GenderType) => void;
  streak: number;
  masteredCount: number;
  darkMode: boolean;
  setDarkMode: (val: boolean | ((prev: boolean) => boolean)) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  userLevel,
  setUserLevel,
  activeDialect,
  setActiveDialect,
  userGender,
  setUserGender,
  streak,
  masteredCount,
  darkMode,
  setDarkMode,
}) => {
  const levels: DifficultyLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1'];

  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      {/* Top Stat Banner */}
      <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 text-white py-1.5 px-4 text-xs md:text-sm border-b border-indigo-900/50">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 font-medium">
            <span className="bg-indigo-500/20 px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-indigo-400/30 text-indigo-300 text-xs">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              لهجه و جنسیت مکالمه
            </span>
            
            {/* Dialect Selector */}
            <div className="flex items-center gap-1 bg-slate-800/80 px-2 py-0.5 rounded-lg border border-slate-700">
              <Globe className="w-3.5 h-3.5 text-indigo-400" />
              <select
                value={activeDialect}
                onChange={(e) => setActiveDialect(e.target.value as DialectType)}
                className="bg-transparent text-white text-xs font-bold focus:outline-none cursor-pointer"
              >
                {ACCENT_CONFIGS.map((acc) => (
                  <option key={acc.code} value={acc.code} className="bg-slate-900 text-white">
                    {acc.flag} {acc.labelFa}
                  </option>
                ))}
              </select>
            </div>

            {/* Gender Selector */}
            <div className="flex items-center gap-1 bg-slate-800/80 px-2 py-0.5 rounded-lg border border-slate-700">
              <UserCheck className="w-3.5 h-3.5 text-pink-400" />
              <button
                onClick={() => setUserGender(userGender === 'masculine' ? 'feminine' : 'masculine')}
                className="text-xs font-bold text-slate-200 hover:text-white transition-colors"
              >
                جنسیت: {userGender === 'masculine' ? '♂️ آقایان (مذکر)' : '♀️ بانوان (مؤنث)'}
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-4 space-x-reverse">
            <div className="flex items-center gap-1 bg-amber-500/20 border border-amber-500/30 px-2.5 py-0.5 rounded-full text-amber-200 font-bold">
              <Flame className="w-4 h-4 text-amber-400 animate-pulse" />
              <span>{streak} روز زنجیره</span>
            </div>
            <div className="hidden md:flex items-center gap-1 text-indigo-200">
              <BookMarked className="w-3.5 h-3.5 text-indigo-400" />
              <span>{masteredCount} کلمه مسلط</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Logo & Branding */}
          <div className="flex items-center space-x-3 space-x-reverse cursor-pointer" onClick={() => setActiveTab('chat')}>
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/30">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">LinguaAI</h1>
                <span className="bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold px-1.5 py-0.5 rounded border border-indigo-300 dark:border-indigo-800">
                  چندلهجه‌ای
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">آموزش مکالمه روان به فارسی و لهجه‌های بومی</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden lg:flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
            <button
              id="nav-tab-chat"
              onClick={() => setActiveTab('chat')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'chat'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <MessageSquareText className="w-4 h-4" />
              <span>هوش مصنوعی و مکالمه</span>
            </button>

            <button
              id="nav-tab-dictionary"
              onClick={() => setActiveTab('dictionary')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'dictionary'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>دیکشنری و اصطلاحات</span>
            </button>

            <button
              id="nav-tab-scenarios"
              onClick={() => setActiveTab('scenarios')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'scenarios'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Theater className="w-4 h-4" />
              <span>سناریوهای روزمره</span>
            </button>

            <button
              id="nav-tab-drills"
              onClick={() => setActiveTab('drills')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'drills'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Dumbbell className="w-4 h-4" />
              <span>تمرینات و جمله‌سازی</span>
            </button>

            <button
              id="nav-tab-progress"
              onClick={() => setActiveTab('progress')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'progress'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>آمار پیشرفت</span>
            </button>
          </nav>

          {/* Level Switcher & Theme Toggle */}
          <div className="flex items-center space-x-2 space-x-reverse">
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-xs text-slate-500 dark:text-slate-400 px-2 font-bold hidden sm:inline">سطح:</span>
              <div className="flex items-center gap-0.5">
                {levels.map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => setUserLevel(lvl)}
                    className={`px-2 py-1 rounded-lg text-xs font-bold transition-all ${
                      userLevel === lvl
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            <button
              id="theme-toggle-btn"
              onClick={() => setDarkMode((prev) => !prev)}
              className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors"
              title="تغییر حالت شب/روز"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>
          </div>
        </div>

        {/* Mobile Sub-Navigation Bar */}
        <div className="flex lg:hidden overflow-x-auto items-center gap-1 mt-3 pt-2 border-t border-slate-200 dark:border-slate-800 scrollbar-none">
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap ${
              activeTab === 'chat'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            <MessageSquareText className="w-3.5 h-3.5" />
            <span>مکالمه هوشمند</span>
          </button>
          <button
            onClick={() => setActiveTab('dictionary')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap ${
              activeTab === 'dictionary'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>دیکشنری</span>
          </button>
          <button
            onClick={() => setActiveTab('scenarios')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap ${
              activeTab === 'scenarios'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            <Theater className="w-3.5 h-3.5" />
            <span>سناریوها</span>
          </button>
          <button
            onClick={() => setActiveTab('drills')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap ${
              activeTab === 'drills'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            <Dumbbell className="w-3.5 h-3.5" />
            <span>تمرینات</span>
          </button>
          <button
            onClick={() => setActiveTab('progress')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap ${
              activeTab === 'progress'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>پیشرفت</span>
          </button>
        </div>
      </div>
    </header>
  );
};
