export type DifficultyLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1';

export type DialectType = 'en-US' | 'en-GB' | 'ar-IQ' | 'ar-LB';
export type GenderType = 'masculine' | 'feminine' | 'unisex';

export type CategoryType =
  | 'daily_life'
  | 'cafe_food'
  | 'travel_airport'
  | 'business_office'
  | 'shopping'
  | 'emergency_health'
  | 'tech_digital'
  | 'emotions_feelings'
  | 'idioms_slang'
  | 'hotel_stay'
  | 'directions_transport'
  | 'family_social'
  | 'education_learning'
  | 'weather_nature'
  | 'hobbies_sports'
  | 'job_interview';

export interface DictionaryWord {
  id: string;
  word: string;
  phonetic: string;
  phoneticUk?: string;
  partOfSpeech: 'noun' | 'verb' | 'adjective' | 'adverb' | 'phrase' | 'idiom';
  persianMeaning: string;
  definitionEn: string;
  category: CategoryType;
  level: DifficultyLevel;
  dialect?: DialectType;
  gender?: GenderType;
  examples: {
    en: string;
    fa: string;
    gender?: GenderType;
  }[];
  synonyms?: string[];
  antonyms?: string[];
  accentNotes?: {
    us?: string;
    uk?: string;
    au?: string;
    ca?: string;
    iq?: string;
    lb?: string;
  };
  isEssential?: boolean;
  frequencyScore: number; // 1-100
}

export interface DictionaryCategory {
  id: CategoryType;
  titleFa: string;
  titleEn: string;
  iconName: string;
  descriptionFa: string;
  wordCount: number;
  sentenceCount: number;
}

export interface ScenarioObjective {
  id: string;
  titleFa: string;
  titleEn: string;
  completed: boolean;
}

export interface RoleplayScenario {
  id: string;
  titleFa: string;
  titleEn: string;
  descriptionFa: string;
  category: CategoryType;
  level: DifficultyLevel;
  dialect?: DialectType;
  gender?: GenderType;
  icon: string;
  aiPersona: {
    name: string;
    role: string;
    systemPrompt: string;
    avatar: string;
  };
  objectives: ScenarioObjective[];
  starterMessage: string;
  usefulPhrases: { en: string; fa: string; gender?: GenderType }[];
  keyVocab: string[];
}

export interface ChatFeedback {
  grammarScore: number; // 0-100
  correctedSentence?: string;
  explanationFa?: string;
  betterAlternatives?: string[];
  vocabularyTips?: string[];
  persianTranslation: string;
  genderNoteFa?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai' | 'system';
  text: string;
  persianText?: string;
  timestamp: string;
  feedback?: ChatFeedback;
  audioAvailable?: boolean;
  dialect?: DialectType;
  gender?: GenderType;
}

export interface SentenceExercise {
  id: string;
  category: CategoryType;
  level: DifficultyLevel;
  dialect?: DialectType;
  gender?: GenderType;
  type: 'unscramble' | 'fill_blank' | 'listening' | 'translation' | 'multiple_choice';
  sentenceEn: string;
  sentenceFa: string;
  targetWord?: string;
  options?: string[]; // For multiple choice or extra scrambled words
  scrambledWords?: string[];
  blankIndex?: number;
  grammarNoteFa?: string;
  audioText?: string;
}

export interface UserProgress {
  masteredWordIds: string[];
  bookmarkedWordIds: string[];
  completedScenarioIds: string[];
  dailyStreak: number;
  totalPracticeMinutes: number;
  completedExercisesCount: number;
  xpPoints: number;
  level: DifficultyLevel;
  userGender?: GenderType;
  preferredDialect?: DialectType;
}

export interface PersonaOption {
  id: string;
  nameFa: string;
  nameEn: string;
  roleDescription: string;
  avatar: string;
  systemInstruction: string;
  dialect?: DialectType;
}
