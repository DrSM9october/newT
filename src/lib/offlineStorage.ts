import { DictionaryWord } from '../types';

const BOOKMARKS_KEY = 'linguaai_bookmarks';
const NOTES_KEY = 'linguaai_word_notes';

export function getBookmarkedIds(): string[] {
  try {
    const raw = localStorage.getItem(BOOKMARKS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function toggleBookmarkId(id: string): string[] {
  const current = getBookmarkedIds();
  let updated: string[];
  if (current.includes(id)) {
    updated = current.filter((item) => item !== id);
  } else {
    updated = [...current, id];
  }
  try {
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(updated));
  } catch (e) {
    // ignore
  }
  return updated;
}

export function getStoredNotes(): Record<string, string> {
  try {
    const raw = localStorage.getItem(NOTES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

export function saveWordNote(wordId: string, noteText: string): Record<string, string> {
  const notes = getStoredNotes();
  notes[wordId] = noteText;
  try {
    localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
  } catch (e) {
    // ignore
  }
  return notes;
}
