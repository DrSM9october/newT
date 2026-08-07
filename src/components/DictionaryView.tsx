import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Volume2,
  Bookmark,
  CheckCircle2,
  Sparkles,
  BookOpen,
  ChevronLeft,
  Globe,
  SlidersHorizontal,
  Layers,
  X
} from 'lucide-react';
import {
  DICTIONARY_CATEGORIES,
  OFFLINE_WORDS_DATABASE,
  TOTAL_DICTIONARY_STATS,
  EVERYDAY_PRACTICE_SENTENCES
} from '../data/dictionaryData';
import { CategoryType, DictionaryWord, DifficultyLevel, DialectType, GenderType } from '../types';
import { speakEnglishText, ACCENT_CONFIGS, SupportedAccent } from '../lib/speech';
import { searchDictionaryWords, normalizeText } from '../lib/searchEngine';
import { WordDetailModal } from './WordDetailModal';

interface DictionaryViewProps {
  userLevel: DifficultyLevel;
  activeDialect?: DialectType;
  userGender?: GenderType;
  masteredIds: string[];
  bookmarkedIds: string[];
  onToggleBookmark: (id: string) => void;
  onToggleMastered: (id: string) => void;
}

export const DictionaryView: React.FC<DictionaryViewProps> = ({
  userLevel,
  activeDialect = 'en-US',
  userGender = 'masculine',
  masteredIds,
  bookmarkedIds,
  onToggleBookmark,
  onToggleMastered,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryType | 'all'>('all');
  const [selectedLevel, setSelectedLevel] = useState<DifficultyLevel | 'all'>('all');
  const [selectedAccentFilter, setSelectedAccentFilter] = useState<string>('all');
  const [onlyBookmarked, setOnlyBookmarked] = useState(false);
  const [selectedWordObj, setSelectedWordObj] = useState<DictionaryWord | null>(null);
  const [activeTabMode, setActiveTabMode] = useState<'words' | 'sentences'>('words');
  const [selectedAccent, setSelectedAccent] = useState<SupportedAccent>(activeDialect);

  // High Quality Multi-field Search across all words and accents
  const filteredWords = useMemo(() => {
    return searchDictionaryWords(
      searchQuery,
      selectedCategory,
      selectedLevel,
      selectedAccentFilter,
      onlyBookmarked,
      bookmarkedIds,
      OFFLINE_WORDS_DATABASE
    );
  }, [
    searchQuery,
    selectedCategory,
    selectedLevel,
    selectedAccentFilter,
    onlyBookmarked,
    bookmarkedIds,
  ]);

  // Normalized Search for practice sentences
  const filteredSentences = useMemo(() => {
    const normQ = normalizeText(searchQuery);
    return EVERYDAY_PRACTICE_SENTENCES.filter((s) => {
      const matchSearch =
        !normQ ||
        normalizeText(s.en).includes(normQ) ||
        normalizeText(s.fa).includes(normQ) ||
        (s.dialect && normalizeText(s.dialect).includes(normQ));

      const matchCategory = selectedCategory === 'all' || s.category === selectedCategory;
      const matchLevel = selectedLevel === 'all' || s.level === selectedLevel;
      const matchAccent =
        selectedAccentFilter === 'all' || (s.dialect && s.dialect === selectedAccentFilter);

      return matchSearch && matchCategory && matchLevel && matchAccent;
    });
  }, [searchQuery, selectedCategory, selectedLevel, selectedAccentFilter]);

  const QUICK_SEARCH_CHIPS = [
    { label: '☕ قهوه و کافه', term: 'coffee' },
    { label: '✈️ فرودگاه و پرواز', term: 'airport' },
    { label: '🇮🇶 شلونك (عراقی)', term: 'شلونك' },
    { label: '🇱🇧 كيفك (لبنانی)', term: 'كيفك' },
    { label: '🏷️ تخفیف و خرید', term: 'discount' },
    { label: '🍽️ سفارش غذا', term: 'order' },
    { label: '💼 مصاحبه کاری', term: 'interview' },
    { label: '💡 اصطلاحات (Slang)', term: 'idiom' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Sleek Statistics & Accent Banner */}
      <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 text-white rounded-3xl p-6 md:p-8 border border-indigo-800/40 shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-4xl space-y-4">
          <div className="inline-flex items-center gap-2 bg-indigo-500/20 text-indigo-300 text-xs font-bold px-3.5 py-1.5 rounded-full border border-indigo-500/30">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span>بانک دیتابیس هوشمند کلمات، اصطلاحات اصیل و لهجه‌های بین‌المللی</span>
          </div>

          <h2 className="text-2xl md:text-3xl font-black tracking-tight">
            دیکشنری و بانک جملات واقعی مکالمه با لهجه‌های مختلف
          </h2>

          <p className="text-xs md:text-sm text-slate-300 leading-relaxed max-w-2xl">
            دسته‌بندی جامع کلمات و اصطلاحات روزمره، تفاوت تلفظ‌ها در لهجه‌های آمریکایی (US)، بریتانیایی (UK)، استرالیایی (AU)، کانادایی (CA) و هندی (IN) با تلفظ صوتی باکیفیت و آنالیز گرامری.
          </p>

          {/* Accent Switcher Bar in Header */}
          <div className="pt-2">
            <div className="flex items-center gap-2 mb-2 text-xs font-bold text-slate-300">
              <Globe className="w-4 h-4 text-indigo-400" />
              <span>لهجه فعال پخش تلفظ صوتی:</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {ACCENT_CONFIGS.map((acc) => (
                <button
                  key={acc.code}
                  onClick={() => setSelectedAccent(acc.code)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                    selectedAccent === acc.code
                      ? 'bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-900/50'
                      : 'bg-white/10 text-slate-300 hover:bg-white/20 border-white/10'
                  }`}
                >
                  <span className="text-sm">{acc.flag}</span>
                  <span>{acc.labelFa}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Real Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-white/10">
            <div className="bg-white/5 backdrop-blur-md p-3.5 rounded-2xl border border-white/10">
              <span className="text-2xl font-black text-indigo-300 font-sans block">
                {TOTAL_DICTIONARY_STATS.totalWords.toLocaleString('fa-IR')}+
              </span>
              <span className="text-xs text-slate-300 font-bold mt-1 block">کلمه و اصطلاح آفلاین</span>
            </div>

            <div className="bg-white/5 backdrop-blur-md p-3.5 rounded-2xl border border-white/10">
              <span className="text-2xl font-black text-violet-300 font-sans block">
                {TOTAL_DICTIONARY_STATS.totalSentences.toLocaleString('fa-IR')}+
              </span>
              <span className="text-xs text-slate-300 font-bold mt-1 block">جمله و مکالمه واقعی</span>
            </div>

            <div className="bg-white/5 backdrop-blur-md p-3.5 rounded-2xl border border-white/10">
              <span className="text-2xl font-black text-amber-300 font-sans block">
                {TOTAL_DICTIONARY_STATS.totalCategories.toLocaleString('fa-IR')}
              </span>
              <span className="text-xs text-slate-300 font-bold mt-1 block">دسته‌بندی موضوعی</span>
            </div>

            <div className="bg-white/5 backdrop-blur-md p-3.5 rounded-2xl border border-white/10">
              <span className="text-2xl font-black text-emerald-400 font-sans block">
                {masteredIds.length.toLocaleString('fa-IR')}
              </span>
              <span className="text-xs text-slate-300 font-bold mt-1 block">کلمات مسلط شده</span>
            </div>
          </div>
        </div>
      </div>

      {/* Control Bar: Mode Toggle, Bookmarked Filter, Search & Level */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          {/* Tab Switcher */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setActiveTabMode('words')}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTabMode === 'words'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>بانک کلمات و اصطلاحات ({OFFLINE_WORDS_DATABASE.length})</span>
            </button>

            <button
              onClick={() => setActiveTabMode('sentences')}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTabMode === 'sentences'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>جملات و مکالمات کاربردی ({EVERYDAY_PRACTICE_SENTENCES.length})</span>
            </button>
          </div>

          {/* Bookmarked Filter */}
          <button
            onClick={() => setOnlyBookmarked((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
              onlyBookmarked
                ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
            }`}
          >
            <Bookmark className="w-4 h-4" />
            <span>نشان‌شده‌ها ({bookmarkedIds.length})</span>
          </button>
        </div>

        {/* Search Input, Accent Filter & Level Filter */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="relative md:col-span-6">
            <Search className="w-5 h-5 absolute right-4 top-3.5 text-indigo-500 dark:text-indigo-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجوی کلمه انگلیسی، معنی فارسی، اصطلاحات یا لهجه‌ها (عراقی، لبنانی، آمریکایی)..."
              className="w-full bg-slate-50 dark:bg-slate-800/90 border border-indigo-200 dark:border-indigo-900/50 rounded-xl pr-12 pl-10 py-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner transition-all font-sans"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-3 top-3.5 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-full bg-slate-200/50 dark:bg-slate-700/50"
                title="پاک‌کردن جستجو"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="md:col-span-3 flex items-center gap-2">
            <Globe className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedAccentFilter}
              onChange={(e) => setSelectedAccentFilter(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-3 text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">همه لهجه‌ها و گویش‌ها</option>
              <option value="en-US">🇺🇸 لهجه آمریکایی (US)</option>
              <option value="en-GB">🇬🇧 لهجه بریتانیایی (UK)</option>
              <option value="ar-IQ">🇮🇶 لهجه عراقی (IQ)</option>
              <option value="ar-LB">🇱🇧 لهجه لبنانی (LB)</option>
            </select>
          </div>

          <div className="md:col-span-3 flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value as DifficultyLevel | 'all')}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-3 text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">همه سطوح (A1 تا C1)</option>
              <option value="A1">سطح A1 (مقدماتی)</option>
              <option value="A2">سطح A2 (پیش‌مقدماتی)</option>
              <option value="B1">سطح B1 (متوسط)</option>
              <option value="B2">سطح B2 (فوق‌متوسط)</option>
              <option value="C1">سطح C1 (پیشرفته)</option>
            </select>
          </div>
        </div>

        {/* Quick Search Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 scrollbar-none text-xs">
          <span className="text-[11px] font-bold text-slate-400 shrink-0">جستجوی سریع:</span>
          {QUICK_SEARCH_CHIPS.map((chip, i) => (
            <button
              key={i}
              onClick={() => setSearchQuery(chip.term)}
              className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 font-bold whitespace-nowrap transition-all border border-indigo-100 dark:border-indigo-900/50"
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* Search Stats & Match Counter Bar */}
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 font-bold">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            <span>
              {activeTabMode === 'words'
                ? `تعداد نتایج کلمات: ${filteredWords.length.toLocaleString('fa-IR')} مورد`
                : `تعداد نتایج جملات: ${filteredSentences.length.toLocaleString('fa-IR')} جمله`}
            </span>
            {searchQuery && (
              <span className="bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-md font-sans">
                جستجوی: "{searchQuery}"
              </span>
            )}
          </div>

          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
                setSelectedLevel('all');
                setSelectedAccentFilter('all');
              }}
              className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
            >
              بازنشانی فیلترها
            </button>
          )}
        </div>

        {/* Categories Pills */}
        <div className="space-y-2 pt-1">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block">دسته‌بندی‌های موضوعی:</span>
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                selectedCategory === 'all'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
              }`}
            >
              همه دسته‌ها
            </button>
            {DICTIONARY_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                  selectedCategory === cat.id
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>{cat.titleFa}</span>
                <span className="bg-black/10 dark:bg-white/10 text-[10px] px-1.5 py-0.2 rounded-full font-mono">
                  {cat.wordCount}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Words Grid View */}
      {activeTabMode === 'words' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredWords.length > 0 ? (
            filteredWords.map((wordObj) => {
              const isBookmarked = bookmarkedIds.includes(wordObj.id);
              const isMastered = masteredIds.includes(wordObj.id);

              return (
                <div
                  key={wordObj.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-indigo-500 dark:hover:border-indigo-500/80 transition-all flex flex-col justify-between group"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3
                            onClick={() => setSelectedWordObj(wordObj)}
                            className="text-lg font-black text-slate-900 dark:text-white font-sans cursor-pointer hover:text-indigo-600 transition-colors"
                          >
                            {wordObj.word}
                          </h3>
                          <span className="bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800">
                            {wordObj.level}
                          </span>
                          <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                            {wordObj.partOfSpeech}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-xs text-slate-400 font-mono">{wordObj.phonetic}</p>
                          {wordObj.phoneticUk && (
                            <span className="text-[10px] text-slate-400 font-mono">
                              UK: {wordObj.phoneticUk}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => speakEnglishText(wordObj.word, 1.0, selectedAccent)}
                          className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 rounded-xl transition-all"
                          title={`پخش صوتی با لهجه ${selectedAccent}`}
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onToggleBookmark(wordObj.id)}
                          className={`p-2 rounded-xl transition-all ${
                            isBookmarked
                              ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/40'
                              : 'text-slate-400 hover:text-amber-500 hover:bg-slate-100'
                          }`}
                        >
                          <Bookmark className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                      <span className="text-xs font-bold text-slate-900 dark:text-white block">
                        {wordObj.persianMeaning}
                      </span>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-sans mt-1 line-clamp-2">
                        {wordObj.definitionEn}
                      </p>
                    </div>

                    {wordObj.accentNotes?.us && (
                      <div className="text-[11px] bg-indigo-50/50 dark:bg-indigo-950/30 p-2 rounded-lg border border-indigo-100 dark:border-indigo-900/50 text-indigo-900 dark:text-indigo-200">
                        <span className="font-bold">نکته لهجه:</span> {wordObj.accentNotes.us}
                      </div>
                    )}

                    {wordObj.examples && wordObj.examples[0] && (
                      <div className="text-xs border-r-2 border-indigo-500 pr-2.5 py-0.5 text-slate-600 dark:text-slate-300">
                        <p className="font-sans font-semibold text-slate-800 dark:text-slate-200">
                          "{wordObj.examples[0].en}"
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{wordObj.examples[0].fa}</p>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <button
                      onClick={() => onToggleMastered(wordObj.id)}
                      className={`text-xs font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
                        isMastered
                          ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-600'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{isMastered ? 'مسلط شدید' : 'علامت مسلط'}</span>
                    </button>

                    <button
                      onClick={() => setSelectedWordObj(wordObj)}
                      className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                    >
                      <span>تحلیل کامل</span>
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-500">
              کلمه‌ای با مشخصات فیلتر شده یافت نشد.
            </div>
          )}
        </div>
      )}

      {/* Everyday Practice Sentences View */}
      {activeTabMode === 'sentences' && (
        <div className="space-y-3">
          {filteredSentences.map((s, idx) => (
            <div
              key={idx}
              className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-4 hover:border-indigo-300 transition-all"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold px-2 py-0.5 rounded-md font-sans">
                    {s.level}
                  </span>
                  <p className="font-sans font-bold text-base text-slate-900 dark:text-white">"{s.en}"</p>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-sans">{s.fa}</p>
              </div>

              <button
                onClick={() => speakEnglishText(s.en, 1.0, selectedAccent)}
                className="bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0"
              >
                <Volume2 className="w-4 h-4" />
                <span>پخش با لهجه ({selectedAccent.replace('en-', '')})</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Word Detail Modal */}
      <WordDetailModal
        wordObj={selectedWordObj}
        onClose={() => setSelectedWordObj(null)}
        isBookmarked={selectedWordObj ? bookmarkedIds.includes(selectedWordObj.id) : false}
        isMastered={selectedWordObj ? masteredIds.includes(selectedWordObj.id) : false}
        activeDialect={activeDialect}
        userGender={userGender}
        onToggleBookmark={onToggleBookmark}
        onToggleMastered={onToggleMastered}
      />
    </div>
  );
};
