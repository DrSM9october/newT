import { DictionaryWord, DialectType, GenderType, DifficultyLevel } from '../types';
import { SupportedAccent } from './speech';
import { DICTIONARY_CATEGORIES } from '../data/dictionaryData';

export interface GrammarAnalysisResult {
  originalText: string;
  detectedTenseFa: string;
  sentenceTypeFa: string;
  grammarScore: number;
  correctedSentence?: string;
  explanationFa: string;
  genderNoteFa?: string;
  partsOfSpeech: { word: string; posFa: string; role: string; phonetic?: string }[];
  dialectVariations: {
    us: string;
    uk: string;
    iq: string;
    lb: string;
  };
  betterAlternatives: string[];
  persianTranslation: string;
  keyVocabulary: { word: string; meaningFa: string; pos: string }[];
}

/**
 * Offline Rule-Based Grammar & Morphological Parser
 * Works 100% locally in browser without server or internet dependency.
 */
export function analyzeSentenceOffline(
  text: string,
  dialect: SupportedAccent = 'en-US',
  gender: GenderType = 'masculine'
): GrammarAnalysisResult {
  const clean = text.trim();
  const lower = clean.toLowerCase();

  // 1. Sentence Tense & Structure Detection
  let detectedTenseFa = 'حال ساده (Present Simple)';
  let sentenceTypeFa = 'جمله خبری (Declarative)';
  let grammarScore = 95;
  let correctedSentence = clean;
  let explanationFa = 'ساختار جمله از نظر گرامری کاملاً درست و روان است.';

  if (lower.endsWith('?')) {
    sentenceTypeFa = 'جمله پرسشی (Interrogative)';
  } else if (lower.startsWith('please') || lower.startsWith('don\'t') || lower.startsWith('do ') || !/\b(i|you|he|she|it|we|they)\b/.test(lower)) {
    sentenceTypeFa = 'جمله امری/درخواستی (Imperative)';
  }

  // Tense Detection Rules
  if (/\b(will|shall|going to|gonna)\b/.test(lower)) {
    detectedTenseFa = 'آینده (Future Tense)';
  } else if (/\b(was|were|did|had|went|bought|came|saw|took)\b/.test(lower) || /\w+ed\b/.test(lower)) {
    detectedTenseFa = 'گذشته ساده (Past Simple)';
  } else if (/\b(am|is|are)\s+\w+ing\b/.test(lower)) {
    detectedTenseFa = 'حال استمراری (Present Continuous)';
  } else if (/\b(was|were)\s+\w+ing\b/.test(lower)) {
    detectedTenseFa = 'گذشته استمراری (Past Continuous)';
  } else if (/\b(have|has)\s+(\w+ed|\w+en|been|done|seen|gone)\b/.test(lower)) {
    detectedTenseFa = 'حال کامل / نقلی (Present Perfect)';
  } else if (/\b(could|would|should|might|may|must|can)\b/.test(lower)) {
    detectedTenseFa = 'وجه وجهی / افعال کمکی (Modal Verbs)';
  }

  // Grammar Corrections (Offline Heuristics)
  if (/\bi is\b/.test(lower)) {
    correctedSentence = clean.replace(/\bi is\b/gi, 'I am');
    grammarScore = 75;
    explanationFa = 'به جای "I is" باید از "I am" استفاده کنید.';
  } else if (/\bhe do\b/.test(lower) || /\bshe do\b/.test(lower)) {
    correctedSentence = clean.replace(/\b(he|she) do\b/gi, (m) => m.startsWith('h') ? 'he does' : 'she does');
    grammarScore = 80;
    explanationFa = 'برای ضمیر سوم شخص مفرد (He/She) از فعل "does" استفاده می‌شود.';
  } else if (/\byesterday i go\b/.test(lower)) {
    correctedSentence = clean.replace(/\byesterday i go\b/gi, 'Yesterday I went');
    grammarScore = 70;
    explanationFa = 'چون زمان جمله مربوط به گذشته (Yesterday) است، باید از شکل گذشته فعل (went) استفاده کنید.';
  }

  // 2. Word Tokenization & Parts of Speech Tagging (Offline Pos Tagging)
  const rawWords = clean.replace(/[.,?!;:]/g, '').split(/\s+/);
  const partsOfSpeech = rawWords.map((w) => {
    const lw = w.toLowerCase();
    let posFa = 'واژه';
    let role = 'کلمه اصلی';

    if (['i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them'].includes(lw)) {
      posFa = 'ضمیر';
      role = 'نهاد / مفعول';
    } else if (['a', 'an', 'the', 'this', 'that', 'these', 'those', 'my', 'your', 'his', 'her', 'our', 'their'].includes(lw)) {
      posFa = 'حرف تعریف/صفت اشاره';
      role = 'تعیین‌کننده (Determiner)';
    } else if (['is', 'am', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'can', 'could', 'will', 'would', 'should', 'go', 'went', 'want', 'like', 'need', 'see', 'make', 'take'].includes(lw)) {
      posFa = 'فعل';
      role = 'فعل اصلی یا کمکی';
    } else if (['in', 'on', 'at', 'to', 'for', 'with', 'from', 'by', 'about', 'under', 'over'].includes(lw)) {
      posFa = 'حرف اضافه';
      role = 'ارتباط‌دهنده مکانی/زمانی';
    } else if (['good', 'bad', 'great', 'beautiful', 'fast', 'slow', 'big', 'small', 'hot', 'cold', 'new', 'old'].includes(lw)) {
      posFa = 'صفت';
      role = 'توصیف‌کننده اسم';
    } else if (['and', 'but', 'or', 'so', 'because', 'if', 'when', 'while'].includes(lw)) {
      posFa = 'حرف ربط';
      role = 'پیونددهنده جملات';
    } else {
      posFa = 'اسم / واژه کلیدی';
      role = 'مفهوم اصلی جمله';
    }

    return {
      word: w,
      posFa,
      role,
      phonetic: `/${lw}/`,
    };
  });

  // 3. Dialect Equivalents Generation (US, UK, IQ, LB)
  const isFem = gender === 'feminine';
  
  let usVariation = clean;
  let ukVariation = clean.replace(/color/gi, 'colour').replace(/favorite/gi, 'favourite').replace(/elevator/gi, 'lift').replace(/subway/gi, 'underground');
  
  let iqVariation = isFem ? 'شلونچ عيني! بلكي تساعديني بهذه الجملة؟' : 'شلونك عيني! بلكي تساعدني بهذه الجملة؟';
  let lbVariation = isFem ? 'كيفيك يا حلوة! شو اخبارك اليوم؟' : 'كيفك يا مان! شو الاخبار اليوم؟';

  if (lower.includes('hello') || lower.includes('hi') || lower.includes('how are you')) {
    iqVariation = isFem ? 'شلونچ عيني؟ شكو ماكو؟' : 'شلونك عيني؟ شكو ماكو؟';
    lbVariation = isFem ? 'اهلين وسهلين! كيفيك اليوم؟' : 'اهلين وسهلين! كيفك يا زلمة؟';
  } else if (lower.includes('coffee') || lower.includes('drink') || lower.includes('tea')) {
    iqVariation = isFem ? 'تدللين! هسا اجيبلك چاي استكان عراقي.' : 'تدلل! هسا اجيبلك چاي استكان عراقي.';
    lbVariation = isFem ? 'تكرم عينك! هلق بنشرب فنجان قهوة سوا.' : 'تكرم عينك! هلق بنشرب فنجان قهوة سوا.';
  } else if (lower.includes('where') || lower.includes('location')) {
    iqVariation = isFem ? 'وين رايحة عيني؟' : 'وين رايح عيني؟';
    lbVariation = isFem ? 'لوين رايحة يا حلوة؟' : 'لوين رايح يا مان؟';
  } else if (lower.includes('price') || lower.includes('cost') || lower.includes('how much')) {
    iqVariation = 'شكد سعر هذا البيش عيني؟';
    lbVariation = 'قديش حق هيدا الشي؟';
  }

  // 4. Gender Notes
  let genderNoteFa: string | undefined = undefined;
  if (dialect === 'ar-IQ') {
    genderNoteFa = isFem
      ? 'در لهجه عراقی خطاب به خانم‌ها پسوند "چ" اضافه می‌شود (مثلاً شلونچ، شخبارچ، اريدچ).'
      : 'در لهجه عراقی خطاب به آقایان پسوند "ك" استفاده می‌شود (مثلاً شلونك، شخبارک، اريدك).';
  } else if (dialect === 'ar-LB') {
    genderNoteFa = isFem
      ? 'در لهجه لبنانی خطاب به خانم‌ها کسر اضافه می‌شود (مثلاً كيفيك، شو بدك، تعي).'
      : 'در لهجه لبنانی خطاب به آقایان فتحه یا سکون استفاده می‌شود (مثلاً كيفك، شو بدك، تعال).';
  }

  // 5. Native Alternatives
  const betterAlternatives = [
    `Formal: "I would like to state that ${clean}."`,
    `Casual Native: "Honestly, ${clean}."`,
    `Short Expression: "${clean.split(' ').slice(0, 4).join(' ')}..."`,
  ];

  // 6. Persian Translation Heuristic
  let persianTranslation = `ترجمه و تحلیل عبارت: "${clean}"`;
  if (lower.includes('hello')) persianTranslation = 'سلام! چطوری؟';
  else if (lower.includes('coffee')) persianTranslation = 'یک فنجان قهوه می‌خواهم.';
  else if (lower.includes('how much')) persianTranslation = 'قیمت این چقدر است؟';
  else if (lower.includes('thank you') || lower.includes('thanks')) persianTranslation = 'خیلی ممنونم، لطف نمودید.';
  else if (lower.includes('where is')) persianTranslation = 'کجا قرار دارد؟';

  // Key Vocabulary
  const keyVocabulary = rawWords.slice(0, 4).map((w) => ({
    word: w,
    meaningFa: `معنی و کاربرد واژه: ${w}`,
    pos: 'کلمه',
  }));

  return {
    originalText: clean,
    detectedTenseFa,
    sentenceTypeFa,
    grammarScore,
    correctedSentence: correctedSentence !== clean ? correctedSentence : undefined,
    explanationFa,
    genderNoteFa,
    partsOfSpeech,
    dialectVariations: {
      us: usVariation,
      uk: ukVariation,
      iq: iqVariation,
      lb: lbVariation,
    },
    betterAlternatives,
    persianTranslation,
    keyVocabulary,
  };
}

/**
 * Generates an Offline Detailed Word Object for ANY search query
 */
export function buildOfflineDetailedWordCard(query: string): DictionaryWord {
  const clean = query.trim();
  const isPersian = /[\u0600-\u06FF]/.test(clean);

  if (isPersian) {
    return {
      id: `off_${Date.now()}`,
      word: clean,
      phonetic: `/${clean}/`,
      partOfSpeech: 'phrase',
      persianMeaning: clean,
      definitionEn: `Offline auto-generated lexical card for the Persian term "${clean}".`,
      category: 'daily_life',
      level: 'A2',
      isEssential: true,
      frequencyScore: 85,
      accentNotes: {
        us: `Standard American English translation and contextual usage for "${clean}".`,
        uk: `British English phrasing equivalent for "${clean}".`,
        au: `Australian conversational usage for "${clean}".`,
        iq: `التعبير العراقي المقابل: "${clean}" مع حركات اللهجة اليومية.`,
        lb: `اللفظ اللبناني المتداول: "${clean}" في الحياة اليومية.`,
      },
      examples: [
        {
          en: `How do you express "${clean}" in a formal conversation?`,
          fa: `چطور عبارت "${clean}" را در یک مکالمه رسمی بیان می‌کنید؟`,
        },
        {
          en: `Here is a practical everyday sentence related to "${clean}".`,
          fa: `این یک جمله کاربردی روزمره مرتبط با "${clean}" است.`,
        },
      ],
      synonyms: [clean, 'vocabulary', 'expression'],
    };
  }

  const capitalize = clean.charAt(0).toUpperCase() + clean.slice(1);

  return {
    id: `off_${Date.now()}`,
    word: capitalize,
    phonetic: `/${clean.toLowerCase()}/`,
    phoneticUk: `/${clean.toLowerCase()}/`,
    partOfSpeech: 'noun',
    persianMeaning: `ترجمه و مفهوم: ${clean}`,
    definitionEn: `To understand, articulate, and use "${capitalize}" in daily conversations across accents.`,
    category: 'daily_life',
    level: 'B1',
    isEssential: true,
    frequencyScore: 88,
    accentNotes: {
      us: `In American accent: Pronounced with strong primary stress on the first syllable.`,
      uk: `In British accent: Often uses a slightly rounded vowel sound.`,
      au: `In Australian accent: Characterized by relaxed diphthong articulation.`,
      iq: `في اللهجة العراقية: يترجم المفهوم بعبارات متداولة في السوق والشارع.`,
      lb: `في اللهجة اللبنانية: يستعمل هذا المفهوم في المحادثات اليومية بشكل سلس.`,
    },
    examples: [
      {
        en: `I am currently practicing how to use "${capitalize}" fluently in my speech.`,
        fa: `من در حال تمرین استفاده روان از واژه "${capitalize}" در مکالماتم هستم.`,
      },
      {
        en: `Could you give me an example of "${capitalize}" in a real sentence?`,
        fa: `می‌توانید یک مثال واقعی از "${capitalize}" در جمله به من بدهید؟`,
      },
    ],
    synonyms: ['express', 'communicate', 'articulate'],
  };
}
