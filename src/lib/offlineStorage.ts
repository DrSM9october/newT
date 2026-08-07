import { DictionaryWord } from '../types';

const BOOKMARKS_KEY = 'app_bookmarked_word_ids';
const NOTES_KEY = 'app_user_word_notes';
const OFFLINE_SEARCH_CACHE_KEY = 'app_offline_search_cache';
const STUDY_STATS_KEY = 'app_study_statistics';

export interface UserNote {
  wordId: string;
  noteText: string;
  updatedAt: string;
}

export interface StudyStats {
  learnedCount: number;
  streakDays: number;
  lastStudyDate: string;
  quizScoreTotal: number;
}

// 1. Bookmarks Management
export function getStoredBookmarks(): string[] {
  try {
    const raw = localStorage.getItem(BOOKMARKS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function toggleStoredBookmark(wordId: string): string[] {
  const current = getStoredBookmarks();
  let updated: string[];
  if (current.includes(wordId)) {
    updated = current.filter((id) => id !== wordId);
  } else {
    updated = [...current, wordId];
  }
  try {
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('LocalStorage save failed:', e);
  }
  return updated;
}

// 2. User Notes Management
export function getStoredNotes(): Record<string, string> {
  try {
    const raw = localStorage.getItem(NOTES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

export function saveWordNote(wordId: string, noteText: string): Record<string, string> {
  const current = getStoredNotes();
  if (!noteText.trim()) {
    delete current[wordId];
  } else {
    current[wordId] = noteText;
  }
  try {
    localStorage.setItem(NOTES_KEY, JSON.stringify(current));
  } catch (e) {
    console.warn('LocalStorage save notes failed:', e);
  }
  return current;
}

// 3. Study Stats Management
export function getStoredStudyStats(): StudyStats {
  try {
    const raw = localStorage.getItem(STUDY_STATS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return {
    learnedCount: 24,
    streakDays: 5,
    lastStudyDate: new Date().toISOString().split('T')[0],
    quizScoreTotal: 120,
  };
}

export function updateStudyStats(partial: Partial<StudyStats>): StudyStats {
  const current = getStoredStudyStats();
  const updated = { ...current, ...partial };
  try {
    localStorage.setItem(STUDY_STATS_KEY, JSON.stringify(updated));
  } catch (e) {}
  return updated;
}

// 4. Export Offline Backup Data as JSON File
export function exportOfflineDataAsJSON(customWords: DictionaryWord[] = []) {
  const backupData = {
    exportDate: new Date().toISOString(),
    appName: 'English-Arabic Dialects Dictionary & Tutor',
    version: '2.0-offline',
    bookmarks: getStoredBookmarks(),
    userNotes: getStoredNotes(),
    studyStats: getStoredStudyStats(),
    customVocabulary: customWords,
  };

  const jsonStr = JSON.stringify(backupData, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `dictionary_offline_backup_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// 5. Export Dictionary Bookmarks as CSV File
export function exportBookmarksAsCSV(bookmarkedWords: DictionaryWord[]) {
  if (bookmarkedWords.length === 0) {
    alert('هیچ کلمه‌ای در نشان‌شده‌ها وجود ندارد.');
    return;
  }

  let csvContent = '\uFEFF'; // UTF-8 BOM for Excel compatibility
  csvContent += 'English Word,Phonetic,Part of Speech,Persian Meaning,Level,Category,US Accent Note,Iraqi Accent Note,Lebanese Accent Note\n';

  bookmarkedWords.forEach((w) => {
    const word = `"${w.word.replace(/"/g, '""')}"`;
    const phonetic = `"${(w.phonetic || '').replace(/"/g, '""')}"`;
    const pos = `"${(w.partOfSpeech || '').replace(/"/g, '""')}"`;
    const fa = `"${(w.persianMeaning || '').replace(/"/g, '""')}"`;
    const lvl = `"${w.level || ''}"`;
    const cat = `"${w.category || ''}"`;
    const us = `"${(w.accentNotes?.us || '').replace(/"/g, '""')}"`;
    const iq = `"${(w.accentNotes?.iq || '').replace(/"/g, '""')}"`;
    const lb = `"${(w.accentNotes?.lb || '').replace(/"/g, '""')}"`;

    csvContent += `${word},${phonetic},${pos},${fa},${lvl},${cat},${us},${iq},${lb}\n`;
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `my_bookmarked_words_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
