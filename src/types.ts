export type DialectType = 'en-US' | 'en-GB' | 'en-AU' | 'ar-IQ' | 'ar-LB';
export type GenderType = 'masculine' | 'feminine';
export type DifficultyLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  persianText?: string;
  timestamp: string;
  audioUrl?: string;
  feedback?: {
    grammarScore: number;
    correctedSentence?: string;
    explanationFa?: string;
    genderNoteFa?: string;
    betterAlternatives?: string[];
    vocabularyTips?: string[];
    persianTranslation?: string;
  };
}

export interface DictionaryWord {
  id: string;
  word: string;
  phonetic: string;
  phoneticUk?: string;
  meaningFa: string;
  partOfSpeech: string;
  level: DifficultyLevel;
  examples: { en: string; fa: string; gender?: 'masculine' | 'feminine' | 'unisex' }[];
  collocations?: string[];
  synonyms?: string[];
  antonyms?: string[];
  bookmarked?: boolean;
}

export interface PracticalScenarioObjective {
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
  category: 'restaurant_cafe' | 'travel_airport' | 'shopping_market' | 'job_interview' | 'social_chat' | 'directions_transport' | 'hotel_stay';
  level: DifficultyLevel;
  dialect?: DialectType;
  icon: string;
  aiPersona: {
    name: string;
    role: string;
    avatar: string;
    systemPrompt: string;
  };
  objectives: PracticalScenarioObjective[];
  starterMessage: string;
  usefulPhrases: { en: string; fa: string; gender?: 'masculine' | 'feminine' | 'unisex' }[];
  keyVocab: string[];
}

export interface PracticeExercise {
  id: string;
  type: 'multiple_choice' | 'fill_blank' | 'listening' | 'sentence_arrange';
  questionFa: string;
  sentenceEn?: string;
  options?: string[];
  correctAnswer: string;
  explanationFa: string;
  level: DifficultyLevel;
}

export interface UserProgress {
  wordsLearned: number;
  scenariosCompleted: number;
  streakDays: number;
  dailyGoalMinutes: number;
  todayMinutes: number;
  totalPoints: number;
  level: DifficultyLevel;
  lastActiveDate: string;
}
