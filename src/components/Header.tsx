import React from 'react';
import {
  Bot,
  BookOpen,
  Theater,
  Dumbbell,
  BarChart3,
  Globe,
  Sparkles,
  Volume2,
} from 'lucide-react';
import { DialectType } from '../types';
import {
  TtsProvider,
  getTtsProvider,
  setTtsProvider,
} from '../lib/speech';

interface HeaderProps {
  activeTab:
    | 'chat'
    | 'dictionary'
    | 'scenarios'
    | 'practice'
    | 'progress';

  setActiveTab: (
    tab:
      | 'chat'
      | 'dictionary'
      | 'scenarios'
      | 'practice'
      | 'progress'
  ) => void;

  activeDialect: DialectType;
  setActiveDialect: (
    dialect: DialectType
  ) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  activeDialect,
  setActiveDialect,
}) => {
  const [ttsProvider, setProviderState] =
    React.useState<TtsProvider>(
      getTtsProvider()
    );

  const handleTtsProviderChange = (
    provider: TtsProvider
  ) => {
    setTtsProvider(provider);
    setProviderState(provider);
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200/90 px-3 md:px-6 py-2.5 shadow-xs">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2.5">

        {/* Branding */}
        <div className="flex items-center justify-between w-full md:w-auto gap-2">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-600/20 text-white font-black text-lg">
              <Sparkles className="w-4 h-4" />
            </div>

            <div>
              <h1 className="text-base font-black text-slate-900 leading-tight flex items-center gap-1.5">
                <span>LinguaAI</span>

                <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.2 rounded-full">
                  هوشمند
                </span>
              </h1>

              <p className="text-[10px] text-slate-500 font-medium">
                دستیار تخصصی زبان و لهجه‌ها
              </p>
            </div>
          </div>

          {/* Mobile selectors */}
          <div className="md:hidden flex flex-col items-end gap-1">

            <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-xl border border-slate-200 text-xs">
              <Globe className="w-3.5 h-3.5 text-indigo-600 shrink-0" />

              <select
                value={activeDialect}
                onChange={(e) =>
                  setActiveDialect(
                    e.target.value as DialectType
                  )
                }
                className="bg-transparent text-slate-800 font-bold text-xs focus:outline-none cursor-pointer"
              >
                <option value="en-US">
                  🇺🇸 انگلیسی US
                </option>
                <option value="en-GB">
                  🇬🇧 انگلیسی UK
                </option>
                <option value="ar-IQ">
                  🇮🇶 عراقی
                </option>
                <option value="ar-LB">
                  🇱🇧 لبنانی
                </option>
              </select>
            </div>

            <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-xl border border-slate-200 text-xs">
              <Volume2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />

              <select
                value={ttsProvider}
                onChange={(e) =>
                  handleTtsProviderChange(
                    e.target.value as TtsProvider
                  )
                }
                className="bg-transparent text-slate-800 font-bold text-xs focus:outline-none cursor-pointer"
              >
                <option value="auto">
                  🔄 خودکار
                </option>

                <option value="native">
                  📱 Android Native
                </option>

                <option value="google">
                  🌐 Google Cloud
                </option>

                <option value="azure">
                  ☁️ Microsoft Azure
                </option>

                <option value="elevenlabs">
                  🎙️ ElevenLabs
                </option>
              </select>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200/80 w-full md:w-auto overflow-x-auto scrollbar-none">

          <button
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
              activeTab === 'chat'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>مکالمه هوشمند</span>
          </button>

          <button
            onClick={() => setActiveTab('scenarios')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
              activeTab === 'scenarios'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Theater className="w-3.5 h-3.5" />
            <span>سناریوها</span>
          </button>

          <button
            onClick={() => setActiveTab('dictionary')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
              activeTab === 'dictionary'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>دیکشنری</span>
          </button>

          <button
            onClick={() => setActiveTab('practice')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
              activeTab === 'practice'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Dumbbell className="w-3.5 h-3.5" />
            <span>تمرین‌ها</span>
          </button>

          <button
            onClick={() => setActiveTab('progress')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
              activeTab === 'progress'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>پیشرفت من</span>
          </button>
        </nav>

        {/* Desktop selectors */}
        <div className="hidden md:flex items-center gap-2">

          <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
            <Globe className="w-4 h-4 text-indigo-600" />

            <span className="text-slate-500 font-medium text-[11px]">
              لهجه/زبان:
            </span>

            <select
              value={activeDialect}
              onChange={(e) =>
                setActiveDialect(
                  e.target.value as DialectType
                )
              }
              className="bg-transparent text-slate-800 font-bold text-xs focus:outline-none cursor-pointer"
            >
              <option value="en-US">
                🇺🇸 انگلیسی (آمریکایی)
              </option>

              <option value="en-GB">
                🇬🇧 انگلیسی (بریتانیایی)
              </option>

              <option value="ar-IQ">
                🇮🇶 عربی (لهجه عراقی)
              </option>

              <option value="ar-LB">
                🇱🇧 عربی (لهجه لبنانی)
              </option>
            </select>
          </div>

          <div className="flex items-center gap-2 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-200 text-xs">
            <Volume2 className="w-4 h-4 text-indigo-600" />

            <span className="text-indigo-700 font-bold text-[11px]">
              موتور صدا:
            </span>

            <select
              value={ttsProvider}
              onChange={(e) =>
                handleTtsProviderChange(
                  e.target.value as TtsProvider
                )
              }
              className="bg-transparent text-indigo-900 font-bold text-xs focus:outline-none cursor-pointer"
            >
              <option value="auto">
                🔄 خودکار
              </option>

              <option value="native">
                📱 Android Native
              </option>

              <option value="google">
                🌐 Google Cloud
              </option>

              <option value="azure">
                ☁️ Microsoft Azure
              </option>

              <option value="elevenlabs">
                🎙️ ElevenLabs
              </option>
            </select>
          </div>

        </div>
      </div>
    </header>
  );
};
