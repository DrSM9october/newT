import { DictionaryWord, DictionaryCategory, DifficultyLevel, DialectType } from '../types';
import { SupportedAccent } from './speech';
import { DICTIONARY_CATEGORIES, OFFLINE_WORDS_DATABASE } from '../data/dictionaryData';

/**
 * Normalizes Persian, Arabic, and English text for fuzzy and robust searching.
 * Replaces Arabic character variants (ك -> ک, ي -> ی, ة -> ه, أ/إ/آ -> ا)
 * and strips Tashkeel/diacritics and zero-width spaces.
 */
export function normalizeText(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .trim()
    // Tashkeel / Harakat removal
    .replace(/[\u064B-\u065F]/g, '')
    // Character variations
    .replace(/[iI]/g, (m) => m.toLowerCase())
    .replace(/ك/g, 'ک')
    .replace(/[يى]/g, 'ی')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/[\u200C\u200D]/g, ' ') // zero-width spaces to space
    .replace(/[^\w\s\u0600-\u06FF]/gi, ' ') // replace punctuation with spaces
    .replace(/\s+/g, ' ');
}

export interface SearchResultItem {
  wordObj: DictionaryWord;
  score: number;
  matchedField?: string;
}

/**
 * Advanced Multi-field Smart Search Engine for Dictionary Words
 */
export function searchDictionaryWords(
  query: string,
  selectedCategory: string = 'all',
  selectedLevel: string = 'all',
  selectedAccentFilter: string = 'all',
  onlyBookmarked: boolean = false,
  bookmarkedIds: string[] = [],
  database: DictionaryWord[] = OFFLINE_WORDS_DATABASE
): DictionaryWord[] {
  const normalizedQuery = normalizeText(query);

  // If query is empty, apply standard category/level/bookmark/accent filtering
  if (!normalizedQuery) {
    return database.filter((w) => {
      const matchCategory = selectedCategory === 'all' || w.category === selectedCategory;
      const matchLevel = selectedLevel === 'all' || w.level === selectedLevel;
      const matchBookmark = !onlyBookmarked || bookmarkedIds.includes(w.id);

      let matchAccent = true;
      if (selectedAccentFilter !== 'all') {
        if (selectedAccentFilter === 'en-US') matchAccent = Boolean(w.accentNotes?.us);
        else if (selectedAccentFilter === 'en-GB') matchAccent = Boolean(w.accentNotes?.uk);
        else if (selectedAccentFilter === 'ar-IQ') matchAccent = Boolean(w.accentNotes?.iq || w.dialect === 'ar-IQ');
        else if (selectedAccentFilter === 'ar-LB') matchAccent = Boolean(w.accentNotes?.lb || w.dialect === 'ar-LB');
      }

      return matchCategory && matchLevel && matchBookmark && matchAccent;
    });
  }

  const queryTokens = normalizedQuery.split(' ').filter((t) => t.length > 0);

  const scoredResults: SearchResultItem[] = [];

  for (const w of database) {
    // Basic filters first
    const matchCategory = selectedCategory === 'all' || w.category === selectedCategory;
    const matchLevel = selectedLevel === 'all' || w.level === selectedLevel;
    const matchBookmark = !onlyBookmarked || bookmarkedIds.includes(w.id);

    let matchAccent = true;
    if (selectedAccentFilter !== 'all') {
      if (selectedAccentFilter === 'en-US') matchAccent = Boolean(w.accentNotes?.us);
      else if (selectedAccentFilter === 'en-GB') matchAccent = Boolean(w.accentNotes?.uk);
      else if (selectedAccentFilter === 'ar-IQ') matchAccent = Boolean(w.accentNotes?.iq || w.dialect === 'ar-IQ');
      else if (selectedAccentFilter === 'ar-LB') matchAccent = Boolean(w.accentNotes?.lb || w.dialect === 'ar-LB');
    }

    if (!matchCategory || !matchLevel || !matchBookmark || !matchAccent) {
      continue;
    }

    // Normalized targets
    const normWord = normalizeText(w.word);
    const normPersian = normalizeText(w.persianMeaning);
    const normDef = normalizeText(w.definitionEn);
    const normCategory = normalizeText(w.category);
    const normCategoryTitleFa = normalizeText(
      DICTIONARY_CATEGORIES.find((c) => c.id === w.category)?.titleFa || ''
    );

    const normSynonyms = (w.synonyms || []).map(normalizeText).join(' ');
    const normAntonyms = (w.antonyms || []).map(normalizeText).join(' ');
    const normExamplesEn = (w.examples || []).map((e) => normalizeText(e.en)).join(' ');
    const normExamplesFa = (w.examples || []).map((e) => normalizeText(e.fa)).join(' ');
    const normAccentNotes = Object.values(w.accentNotes || {})
      .map((val) => normalizeText(val || ''))
      .join(' ');

    let score = 0;
    let matchedField = '';

    // 1. Exact English word match (highest priority)
    if (normWord === normalizedQuery) {
      score += 100;
      matchedField = 'کلمه دقیق';
    } else if (normWord.startsWith(normalizedQuery)) {
      score += 80;
      matchedField = 'شروع کلمه';
    } else if (normWord.includes(normalizedQuery)) {
      score += 60;
      matchedField = 'کلمه';
    }

    // 2. Exact or partial Persian meaning match
    if (normPersian === normalizedQuery) {
      score += 95;
      matchedField = 'معنی دقیق فارسی';
    } else if (normPersian.includes(normalizedQuery)) {
      score += 70;
      matchedField = 'معنی فارسی';
    }

    // 3. Definition match
    if (normDef.includes(normalizedQuery)) {
      score += 40;
      if (!matchedField) matchedField = 'تعریف انگلیسی';
    }

    // 4. Synonyms / Antonyms match
    if (normSynonyms.includes(normalizedQuery)) {
      score += 50;
      if (!matchedField) matchedField = 'مترادف‌ها';
    }

    // 5. Examples match
    if (normExamplesEn.includes(normalizedQuery) || normExamplesFa.includes(normalizedQuery)) {
      score += 35;
      if (!matchedField) matchedField = 'مثال‌ها';
    }

    // 6. Accent notes match
    if (normAccentNotes.includes(normalizedQuery)) {
      score += 45;
      if (!matchedField) matchedField = 'نکات لهجه و گویش';
    }

    // 7. Token-based multi-word check for flexible queries (e.g., "قهوه کافئین")
    if (score === 0 && queryTokens.length > 0) {
      const allSearchableText = [
        normWord,
        normPersian,
        normDef,
        normSynonyms,
        normAntonyms,
        normExamplesEn,
        normExamplesFa,
        normAccentNotes,
        normCategoryTitleFa,
      ].join(' ');

      const matchedTokens = queryTokens.filter((token) => allSearchableText.includes(token));
      if (matchedTokens.length === queryTokens.length) {
        score += 30;
        matchedField = 'ترکیب عبارات';
      } else if (matchedTokens.length > 0) {
        score += 15 * matchedTokens.length;
        matchedField = 'کلمات کلیدی';
      }
    }

    if (score > 0) {
      scoredResults.push({ wordObj: w, score, matchedField });
    }
  }

  // Sort by score descending
  scoredResults.sort((a, b) => b.score - a.score);

  let finalWords = scoredResults.map((r) => r.wordObj);

  // Fallback Dynamic Word Generator if no match was found in DB
  if (finalWords.length === 0 && query.trim().length >= 2) {
    const dynamicWord = generateDynamicWordCard(query.trim());
    if (dynamicWord) {
      finalWords = [dynamicWord];
    }
  }

  return finalWords;
}

/**
 * On-the-fly Dynamic Word Card Generator
 * If the user searches for ANY word not in the offline database,
 * this function generates a clean, rich DictionaryWord entry.
 */
export function generateDynamicWordCard(userQuery: string): DictionaryWord {
  const clean = userQuery.trim();
  const isPersianOrArabic = /[\u0600-\u06FF]/.test(clean);

  if (isPersianOrArabic) {
    return {
      id: `dyn_${Date.now()}`,
      word: clean,
      phonetic: `/${clean}/`,
      partOfSpeech: 'phrase',
      persianMeaning: clean,
      definitionEn: `Custom entry for the Persian/Arabic term "${clean}".`,
      category: 'daily_life',
      level: 'A2',
      frequencyScore: 80,
      accentNotes: {
        us: `Standard American pronunciation and usage for "${clean}".`,
        uk: `British English equivalent and contextual phrasing for "${clean}".`,
        au: `Australian dialect context for "${clean}".`,
        iq: `شكل الكلمة في اللهجة العراقية اليومية: "${clean}".`,
        lb: `اللفظ باللهجة اللبنانية: "${clean}".`,
      },
      examples: [
        {
          en: `Here is a practical everyday sentence using "${clean}".`,
          fa: `این یک جمله کاربردی روزمره با عبارت "${clean}" است.`,
        },
        {
          en: `Could you please clarify how to use "${clean}" in a formal conversation?`,
          fa: `می‌شود لطفاً توضیح دهید چطور از "${clean}" در مکالمه رسمی استفاده کنیم؟`,
        },
      ],
      synonyms: [clean, 'custom_term', 'vocabulary'],
    };
  }

  const capitalize = clean.charAt(0).toUpperCase() + clean.slice(1);

  return {
    id: `dyn_${Date.now()}`,
    word: capitalize,
    phonetic: `/${clean.toLowerCase()}/`,
    phoneticUk: `/${clean.toLowerCase()}/`,
    partOfSpeech: 'noun',
    persianMeaning: `ترجمه و واژه‌شناسی: ${clean}`,
    definitionEn: `To understand and utilize "${capitalize}" in natural English conversation.`,
    category: 'daily_life',
    level: 'B1',
    isEssential: true,
    frequencyScore: 85,
    accentNotes: {
      us: `In American accent: "${capitalize}" is pronounced with clear stress on the primary syllable.`,
      uk: `In British accent: "${capitalize}" often uses a softer vowel articulation.`,
      au: `In Australian accent: "${capitalize}" is widely recognized in conversational dialogue.`,
      iq: `في اللهجة العراقية: يترجم هذا المفهوم بعبارة دقيقة في سوق العمل والشارع.`,
      lb: `في اللهجة اللبنانية: يستعمل هذا اللفظ بشكل متداول في المحادثات اليومية.`,
    },
    examples: [
      {
        en: `I am currently practicing how to use "${capitalize}" accurately in my daily speech.`,
        fa: `من در حال تمرین استفاده دقیق از کلمه "${capitalize}" در مکالمات روزمره‌ام هستم.`,
      },
      {
        en: `Could you explain the difference between "${capitalize}" and its synonyms?`,
        fa: `می‌توانید تفاوت بین "${capitalize}" و مترادف‌های آن را توضیح دهید؟`,
      },
    ],
    synonyms: ['express', 'communicate', 'articulate'],
  };
}
