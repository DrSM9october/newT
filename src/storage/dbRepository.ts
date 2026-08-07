import { DictionaryWord, UserProgress, ChatMessage } from '../types';
import { ReviewCard } from '../learning/spacedRepetition';

const DB_NAME = 'LanguageLearningOS_DB';
const DB_VERSION = 1;

export interface StoredNote {
  wordId: string;
  noteText: string;
  updatedAt: string;
}

export class DBRepository {
  private isIndexedDBAvailable: boolean;

  constructor() {
    this.isIndexedDBAvailable = typeof window !== 'undefined' && 'indexedDB' in window;
  }

  // 1. Bookmarks & Word Storage
  public async getBookmarks(): Promise<string[]> {
    try {
      const raw = localStorage.getItem('app_bookmarked_word_ids');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  public async saveBookmarks(wordIds: string[]): Promise<void> {
    try {
      localStorage.setItem('app_bookmarked_word_ids', JSON.stringify(wordIds));
    } catch (e) {
      console.warn('LocalStorage save failed', e);
    }
  }

  // 2. Personal Word Notes
  public async getNotes(): Promise<Record<string, string>> {
    try {
      const raw = localStorage.getItem('app_user_word_notes');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  public async saveNote(wordId: string, text: string): Promise<Record<string, string>> {
    const notes = await this.getNotes();
    if (!text.trim()) {
      delete notes[wordId];
    } else {
      notes[wordId] = text;
    }
    try {
      localStorage.setItem('app_user_word_notes', JSON.stringify(notes));
    } catch (e) {
      console.warn('Save note failed', e);
    }
    return notes;
  }

  // 3. Conversation Messages History
  public async getChatHistory(): Promise<ChatMessage[]> {
    try {
      const raw = localStorage.getItem('app_chat_history_v1');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  public async saveChatHistory(messages: ChatMessage[]): Promise<void> {
    try {
      // Limit saved messages to last 50 for local memory optimization
      const sliced = messages.slice(-50);
      localStorage.setItem('app_chat_history_v1', JSON.stringify(sliced));
    } catch (e) {
      console.warn('Save chat history failed', e);
    }
  }

  // 4. SRS Flashcard Review Cards
  public async getSRSCards(): Promise<Record<string, ReviewCard>> {
    try {
      const raw = localStorage.getItem('app_srs_cards_v1');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  public async saveSRSCard(card: ReviewCard): Promise<void> {
    const cards = await this.getSRSCards();
    cards[card.wordId] = card;
    try {
      localStorage.setItem('app_srs_cards_v1', JSON.stringify(cards));
    } catch (e) {
      console.warn('Save SRS card failed', e);
    }
  }
}

export const dbRepository = new DBRepository();
