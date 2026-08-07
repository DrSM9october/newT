import React, { useState } from 'react';
import { Search, BookOpen, Volume2, Bookmark, BookmarkCheck, Sparkles, Plus } from 'lucide-react';
import { DictionaryWord, DialectType } from '../types';
import { DICTIONARY_WORDS } from '../data/dictionaryData';
import { speakEnglishText } from '../lib/speech';
import { WordDetailModal } from './WordDetailModal';
import { getBookmarkedIds, toggleBookmarkId } from '../lib/offlineStorage';

interface DictionaryViewProps {
  activeDialect: DialectType;
}

export const DictionaryView: React.FC<DictionaryViewProps> = ({ activeDialect }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [words, setWords] = useState<DictionaryWord[]>(DICTIONARY_WORDS);
  const [selectedWord, setSelectedWord] = useState<DictionaryWord | null>(null);
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>(getBookmarkedIds());
  const [aiLoading, setAiLoading] = useState(false);

  const filteredWords = words.filter(
    (w) =>
      w.word.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.meaningFa.includes(searchTerm)
  );

  const handleToggleBookmark = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = toggleBookmarkId(id);
    setBookmarkedIds(updated);
  };

  const handleAiLookup = async () => {
    if (!searchTerm.trim()) return;
    setAiLoading(true);

    try {
      const res = await fetch('/api/dictionary-explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchTerm.trim(), dialect: activeDialect }),
      });

      if (res.ok) {
        const data = await res.json();
        const payload = data.data || data;
        const newWord: DictionaryWord = {
          id: `w_ai_${Date.now()}`,
          word: payload.word || searchTerm,
          phonetic: payload.phonetic || '/.../',
          meaningFa: payload.meaningFa || 'تحلیل کلمه',
          partOfSpeech: payload.partOfSpeech || 'noun',
          level: payload.level || 'B1',
          examples: payload.examples || [],
          collocations: payload.collocations || [],
          synonyms: payload.synonyms || [],
        };

        setWords((prev) => [newWord, ...prev]);
        setSelectedWord(newWord);
      }
    } catch (e) {
      console.error('AI lookup error:', e);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
      {/* Search Header */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 space-y-4 shadow-xs">
        <div className="flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-indigo-600" />
          <h2 className="text-xl font-black text-slate-900">دیکشنری هوشمند و تحلیل ریشه‌ای واژگان</h2>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-5 h-5 text-slate-400 absolute right-4 top-3.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="جستجوی کلمه انگلیسی یا ترجمه فارسی..."
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl pr-12 pl-4 py-3 text-sm text-slate-800 focus:outline-none placeholder-slate-400"
            />
          </div>

          <button
            onClick={handleAiLookup}
            disabled={!searchTerm.trim() || aiLoading}
            className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold px-5 py-3 rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-indigo-600/20 whitespace-nowrap"
          >
            <Sparkles className="w-4 h-4" />
            <span>تحلیل هوشمند کلمه با جمینای</span>
          </button>
        </div>
      </div>

      {/* Words Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredWords.map((item) => {
          const isBookmarked = bookmarkedIds.includes(item.id);
          return (
            <div
              key={item.id}
              onClick={() => setSelectedWord(item)}
              className="bg-white border border-slate-200/80 hover:border-indigo-400 rounded-2xl p-4.5 transition-all cursor-pointer space-y-3 group flex flex-col justify-between shadow-xs hover:shadow-md"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-black text-slate-900 group-hover:text-indigo-600 transition-colors" dir="ltr" style={{ textAlign: 'left' }}>
                      {item.word}
                    </h3>
                    <p className="text-xs text-slate-500 font-mono mt-0.5" dir="ltr" style={{ textAlign: 'left' }}>{item.phonetic}</p>
                  </div>

                  <button
                    onClick={(e) => handleToggleBookmark(item.id, e)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 transition-colors"
                  >
                    {isBookmarked ? (
                      <BookmarkCheck className="w-5 h-5 text-amber-500 fill-amber-500/20" />
                    ) : (
                      <Bookmark className="w-5 h-5" />
                    )}
                  </button>
                </div>

                <p className="text-sm font-bold text-slate-800">{item.meaningFa}</p>
              </div>

              <div className="flex items-center justify-between pt-2.5 border-t border-slate-200 text-xs">
                <span className="text-indigo-700 font-bold bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">{item.partOfSpeech}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    speakEnglishText(item.word, 1.0, activeDialect as any);
                  }}
                  className="flex items-center gap-1 text-slate-600 hover:text-indigo-600 p-1 font-bold"
                >
                  <Volume2 className="w-4 h-4 text-indigo-600" />
                  <span>تلفظ</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Word Detail Modal */}
      {selectedWord && (
        <WordDetailModal
          word={selectedWord}
          activeDialect={activeDialect}
          onClose={() => setSelectedWord(null)}
        />
      )}
    </div>
  );
};
