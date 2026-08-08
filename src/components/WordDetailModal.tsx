import React, { useState, useEffect } from 'react';
import { X, Volume2, Save, Sparkles, BookOpen, ArrowRight } from 'lucide-react';
import { DictionaryWord, DialectType } from '../types';
import { speakEnglishText, stopSpeech } from '../lib/speech';
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

  useEffect(() => {
    // Handle Escape key
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        stopSpeech();
        onClose();
      }
    };

    // Handle Popstate (browser / mobile back button)
    const handlePopState = () => {
      stopSpeech();
      onClose();
    };

    window.history.pushState({ wordModalOpen: true }, '');
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [onClose]);

  const handleSaveNote = () => {
    saveWordNote(word.id, note);
    alert('یادداشت شما با موفقیت ذخیره شد!');
  };

  const handleClose = () => {
    stopSpeech();
    onClose();
    if (window.history.state && window.history.state.wordModalOpen) {
      window.history.back();
    }
  };

  return (
    <div
      className="modal-overlay bg-slate-900/60 backdrop-blur-xs p-4 z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="bg-white border border-slate-200 rounded-3xl p-5 md:p-6 max-w-lg w-full space-y-5 text-slate-800 max-h-[90vh] overflow-y-auto shadow-2xl relative">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={handleClose}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border border-slate-200"
            >
              <ArrowRight className="w-4 h-4" />
              <span>برگشت</span>
            </button>
            <h3 className="text-lg md:text-xl font-black text-slate-900" dir="ltr">{word.word}</h3>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
            title="بستن"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <span className="text-xs font-bold text-slate-500">معنی فارسی:</span>
            <p className="text-base font-black text-indigo-700 mt-1">{word.meaningFa}</p>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-slate-500">نقش دستور زبان: <strong className="text-slate-800 font-bold">{word.partOfSpeech}</strong></span>
            <button
              onClick={() => speakEnglishText(word.word, 1.0, activeDialect as any)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
            >
              <Volume2 className="w-4 h-4" />
              <span>پخش تلفظ</span>
            </button>
          </div>

          {word.examples && word.examples.length > 0 && (
            <div className="space-y-2 pt-3 border-t border-slate-200">
              <span className="text-xs font-black text-slate-800">مثال‌های کاربردی:</span>
              <div className="space-y-2">
                {word.examples.map((ex, idx) => (
                  <div key={idx} className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-1">
                    <p className="text-xs font-sans font-bold text-slate-900" dir="ltr" style={{ textAlign: 'left' }}>"{ex.en}"</p>
                    <p className="text-[11px] text-slate-600 font-medium">{ex.fa}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Personal Note Box */}
          <div className="space-y-2 pt-3 border-t border-slate-200">
            <span className="text-xs font-black text-slate-800">یادداشت شخصی شما:</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="نکته، مثال یا یادداشت خود را بنویسید..."
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs text-slate-800 focus:outline-none placeholder-slate-400"
              rows={3}
            />
            <button
              onClick={handleSaveNote}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-slate-200"
            >
              <Save className="w-4 h-4 text-indigo-600" />
              <span>ذخیره یادداشت</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
