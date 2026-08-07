import React, { useState, useEffect } from 'react';
import { X, Volume2, Save, Sparkles, BookOpen } from 'lucide-react';
import { DictionaryWord, DialectType } from '../types';
import { speakEnglishText } from '../lib/speech';
import { getStoredNotes, saveWordNote } from '../lib/offlineStorage';

interface WordDetailModalProps {
  word: DictionaryWord;
  activeDialect: DialectType;
  onClose: () => void;
}

export const WordDetailModal: React.FC<WordDetailModalProps> = ({
  word,
  activeDialect,
  onClose,
}) => {
  const [note, setNote] = useState('');

  useEffect(() => {
    const notes = getStoredNotes();
    if (notes[word.id]) {
      setNote(notes[word.id]);
    }
  }, [word.id]);

  const handleSaveNote = () => {
    saveWordNote(word.id, note);
    alert('یادداشت شما با موفقیت ذخیره شد!');
  };

  return (
    <div className="modal-overlay bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full space-y-5 text-slate-100 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-black text-white">{word.word}</h3>
            <span className="text-xs font-mono text-indigo-400 bg-indigo-950/60 border border-indigo-800 px-2 py-0.5 rounded-full">
              {word.phonetic}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <span className="text-xs font-bold text-slate-400">معنی فارسی:</span>
            <p className="text-base font-black text-indigo-200 mt-1">{word.meaningFa}</p>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-slate-400">نقش دستور زبان: <strong className="text-slate-200">{word.partOfSpeech}</strong></span>
            <button
              onClick={() => speakEnglishText(word.word, 1.0, activeDialect as any)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Volume2 className="w-4 h-4" />
              <span>پخش تلفظ</span>
            </button>
          </div>

          {word.examples && word.examples.length > 0 && (
            <div className="space-y-2 pt-3 border-t border-slate-800">
              <span className="text-xs font-black text-slate-300">مثال‌های کاربردی:</span>
              <div className="space-y-2">
                {word.examples.map((ex, idx) => (
                  <div key={idx} className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-1">
                    <p className="text-xs font-sans font-bold text-white" dir="ltr">"{ex.en}"</p>
                    <p className="text-[11px] text-slate-400">{ex.fa}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Personal Note Box */}
          <div className="space-y-2 pt-3 border-t border-slate-800">
            <span className="text-xs font-black text-slate-300">یادداشت شخصی شما:</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="نکته، مثال یا یادداشت خود را بنویسید..."
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-xs text-slate-200 focus:outline-none"
              rows={3}
            />
            <button
              onClick={handleSaveNote}
              className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>ذخیره یادداشت</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
