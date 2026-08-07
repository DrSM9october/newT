import React from 'react';
import { Bot, BookOpen, Theater, Dumbbell, BarChart3, Globe, Sparkles } from 'lucide-react';
import { DialectType } from '../types';

interface HeaderProps {
  activeTab: 'chat' | 'dictionary' | 'scenarios' | 'practice' | 'progress';
  setActiveTab: (tab: 'chat' | 'dictionary' | 'scenarios' | 'practice' | 'progress') => void;
  activeDialect: DialectType;
  setActiveDialect: (dialect: DialectType) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  activeDialect,
  setActiveDialect,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* App Branding */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white font-black text-xl">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h1 className="text-lg font-black text-white leading-tight flex items-center gap-1.5">
                <span>LinguaAI</span>
                <span className="text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full">
                  هوشمند
                </span>
              </h1>
              <p className="text-[11px] text-slate-400 font-medium">دستیار تخصصی مکالمه انگلیسی و لهجه‌های محلی عربی</p>
            </div>
          </div>

          {/* Accent Quick Selector on Mobile */}
          <div className="md:hidden flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700/60 text-xs">
            <Globe className="w-3.5 h-3.5 text-indigo-400" />
            <select
              value={activeDialect}
              onChange={(e) => setActiveDialect(e.target.value as DialectType)}
              className="bg-transparent text-slate-200 font-bold text-xs focus:outline-none cursor-pointer"
            >
              <option value="en-US">🇺🇸 انگلیسی US</option>
              <option value="en-GB">🇬🇧 انگلیسی UK</option>
              <option value="ar-IQ">🇮🇶 عراقی</option>
              <option value="ar-LB">🇱🇧 لبنانی</option>
            </select>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1.5 bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800 w-full md:w-auto overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'chat'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Bot className="w-4 h-4" />
            <span>مکالمه هوشمند</span>
          </button>

          <button
            onClick={() => setActiveTab('scenarios')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'scenarios'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Theater className="w-4 h-4" />
            <span>سناریوها (نقش‌آفرینی)</span>
          </button>

          <button
            onClick={() => setActiveTab('dictionary')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'dictionary'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>دیکشنری و تحلیل</span>
          </button>

          <button
            onClick={() => setActiveTab('practice')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'practice'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Dumbbell className="w-4 h-4" />
            <span>تمرین‌ها</span>
          </button>

          <button
            onClick={() => setActiveTab('progress')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'progress'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>پیشرفت من</span>
          </button>
        </nav>

        {/* Accent Quick Selector on Desktop */}
        <div className="hidden md:flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700/60 text-xs">
          <Globe className="w-4 h-4 text-indigo-400" />
          <span className="text-slate-400 font-medium text-[11px]">لهجه/زبان:</span>
          <select
            value={activeDialect}
            onChange={(e) => setActiveDialect(e.target.value as DialectType)}
            className="bg-transparent text-slate-100 font-bold text-xs focus:outline-none cursor-pointer"
          >
            <option value="en-US" className="bg-slate-900">🇺🇸 انگلیسی (آمریکایی)</option>
            <option value="en-GB" className="bg-slate-900">🇬🇧 انگلیسی (بریتانیایی)</option>
            <option value="ar-IQ" className="bg-slate-900">🇮🇶 عربی (لهجه عراقی)</option>
            <option value="ar-LB" className="bg-slate-900">🇱🇧 عربی (لهجه لبنانی)</option>
          </select>
        </div>
      </div>
    </header>
  );
};
