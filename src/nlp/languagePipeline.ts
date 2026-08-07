import { DifficultyLevel, DialectType, GenderType } from '../types';

export interface Token {
  text: string;
  cleanText: string;
  index: number;
  posFa: string;
  roleFa: string;
  isPunctuation: boolean;
}

export interface MorphologyInfo {
  lemma: string;
  prefix?: string;
  suffix?: string;
  hasPluralS: boolean;
  hasPastEd: boolean;
  hasIng: boolean;
}

export interface GrammarErrorDetail {
  id: string;
  position: [number, number];
  originalSegment: string;
  suggestedSegment: string;
  ruleCategory: 'subject_verb_agreement' | 'tense_mismatch' | 'article_usage' | 'preposition' | 'spelling';
  explanationFa: string;
}

export interface LanguageAnalysisResult {
  rawText: string;
  tokens: Token[];
  sentenceType: 'declarative' | 'interrogative' | 'imperative' | 'exclamatory';
  detectedTenseFa: string;
  grammarScore: number; // 0 - 100
  correctedText?: string;
  explanationFa: string;
  errors: GrammarErrorDetail[];
  genderNoteFa?: string;
  dialectVariations: {
    us: string;
    uk: string;
    iq: string;
    lb: string;
  };
  betterAlternatives: string[];
  persianTranslation: string;
  keyKeywords: { word: string; meaningFa: string; pos: string }[];
}

export class LanguagePipeline {
  /**
   * Main Pipeline Execution Method
   */
  public analyze(
    text: string,
    dialect: DialectType = 'en-US',
    gender: GenderType = 'masculine'
  ): LanguageAnalysisResult {
    const clean = text.trim();
    if (!clean) {
      return this.emptyResult();
    }

    const tokens = this.tokenize(clean);
    const sentenceType = this.detectSentenceType(clean);
    const tenseFa = this.detectTense(clean);
    const { score, corrected, errors, explanationFa } = this.evaluateGrammarRules(clean);
    const dialectVars = this.generateDialectVariations(clean, gender);
    const genderNote = this.generateGenderNote(dialect, gender);
    const translation = this.heuristicTranslation(clean);
    const keyKeywords = this.extractKeywords(tokens);

    return {
      rawText: clean,
      tokens,
      sentenceType,
      detectedTenseFa: tenseFa,
      grammarScore: score,
      correctedText: corrected !== clean ? corrected : undefined,
      explanationFa,
      errors,
      genderNoteFa: genderNote,
      dialectVariations: dialectVars,
      betterAlternatives: [
        `Native Casual: "Basically, ${clean}."`,
        `Formal Tone: "I would like to state that ${clean}."`,
        `Concise Variant: "${clean.split(' ').slice(0, 4).join(' ')}..."`,
      ],
      persianTranslation: translation,
      keyKeywords,
    };
  }

  private tokenize(text: string): Token[] {
    const rawTokens = text.split(/(\s+|[.,?!;:])/).filter(Boolean);
    let tokenIndex = 0;

    return rawTokens.map((raw) => {
      const isSpaceOrPunct = /^\s+$|^[.,?!;:]$/.test(raw);
      const cleanText = raw.toLowerCase().replace(/[^a-z0-9]/g, '');

      let posFa = 'واژه';
      let roleFa = 'کلمه در جمله';

      if (['i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them'].includes(cleanText)) {
        posFa = 'ضمیر (Pronoun)';
        roleFa = 'نهاد یا مفعول';
      } else if (['a', 'an', 'the', 'this', 'that', 'my', 'your', 'his', 'her', 'our'].includes(cleanText)) {
        posFa = 'حرف تعریف (Determiner)';
        roleFa = 'توصیف مالکیت یا شناسه';
      } else if (['is', 'am', 'are', 'was', 'were', 'have', 'has', 'had', 'go', 'went', 'want', 'like', 'do', 'did'].includes(cleanText)) {
        posFa = 'فعل (Verb)';
        roleFa = 'فعل اصلی یا کمکی';
      } else if (['in', 'on', 'at', 'to', 'for', 'with', 'from', 'by', 'about'].includes(cleanText)) {
        posFa = 'حرف اضافه (Preposition)';
        roleFa = 'ارتباط‌دهنده مکانی/زمانی';
      }

      const token: Token = {
        text: raw,
        cleanText,
        index: tokenIndex++,
        posFa,
        roleFa,
        isPunctuation: isSpaceOrPunct,
      };

      return token;
    });
  }

  private detectSentenceType(text: string): 'declarative' | 'interrogative' | 'imperative' | 'exclamatory' {
    const trimmed = text.trim();
    if (trimmed.endsWith('?')) return 'interrogative';
    if (trimmed.endsWith('!')) return 'exclamatory';
    if (/^(please|do|don't|stop|listen|go|come|look)\b/i.test(trimmed)) return 'imperative';
    return 'declarative';
  }

  private detectTense(text: string): string {
    const lower = text.toLowerCase();
    if (/\b(will|shall|going to|gonna)\b/.test(lower)) return 'آینده ساده (Future Simple)';
    if (/\b(was|were|did|had|went|bought|saw)\b/.test(lower) || /\w+ed\b/.test(lower)) return 'گذشته ساده (Past Simple)';
    if (/\b(am|is|are)\s+\w+ing\b/.test(lower)) return 'حال استمراری (Present Continuous)';
    if (/\b(have|has)\s+(\w+ed|\w+en|been|done|seen)\b/.test(lower)) return 'حال کامل (Present Perfect)';
    return 'حال ساده (Present Simple)';
  }

  private evaluateGrammarRules(text: string): {
    score: number;
    corrected: string;
    errors: GrammarErrorDetail[];
    explanationFa: string;
  } {
    const lower = text.toLowerCase();
    const errors: GrammarErrorDetail[] = [];
    let score = 95;
    let corrected = text;
    let explanationFa = 'ساختار جمله از نظر گرامری صحیح و کاملاً شفاف است.';

    if (/\bi is\b/i.test(text)) {
      score = 75;
      corrected = text.replace(/\bi is\b/gi, 'I am');
      errors.push({
        id: 'err_1',
        position: [0, text.length],
        originalSegment: 'I is',
        suggestedSegment: 'I am',
        ruleCategory: 'subject_verb_agreement',
        explanationFa: 'برای ضمیر اول شخص I باید از فعل am استفاده شود.',
      });
      explanationFa = 'فعل تطبیقی درست برای ضمیر "I"، کلمه "am" است.';
    } else if (/\b(he|she) do\b/i.test(text)) {
      score = 80;
      corrected = text.replace(/\b(he|she) do\b/gi, (m) => m.toLowerCase().startsWith('h') ? 'he does' : 'she does');
      errors.push({
        id: 'err_2',
        position: [0, text.length],
        originalSegment: 'do',
        suggestedSegment: 'does',
        ruleCategory: 'subject_verb_agreement',
        explanationFa: 'برای سوم شخص مفرد (He/She) از does استفاده می‌شود.',
      });
      explanationFa = 'ضمایر سوم شخص مفرد نیاز به فعل does دارند.';
    }

    return { score, corrected, errors, explanationFa };
  }

  private generateDialectVariations(text: string, gender: GenderType) {
    const isFem = gender === 'feminine';
    const lower = text.toLowerCase();

    let uk = text.replace(/color/gi, 'colour').replace(/elevator/gi, 'lift');
    let iq = isFem ? 'شلونچ عيني! بلكي تساعديني بهذه الجملة؟' : 'شلونك عيني! بلكي تساعدني بهذه الجملة؟';
    let lb = isFem ? 'كيفيك يا حلوة! شو الاخبار اليوم؟' : 'كيفك يا مان! شو الاخبار اليوم؟';

    if (lower.includes('hello') || lower.includes('hi')) {
      iq = isFem ? 'شلونچ عيني؟ شكو ماكو؟' : 'شلونك عيني؟ شكو ماكو؟';
      lb = isFem ? 'اهلين وسهلين! كيفيك اليوم؟' : 'اهلين وسهلين! كيفك يا زلمة؟';
    }

    return {
      us: text,
      uk,
      iq,
      lb,
    };
  }

  private generateGenderNote(dialect: DialectType, gender: GenderType): string | undefined {
    if (dialect === 'ar-IQ') {
      return gender === 'feminine'
        ? 'در لهجه عراقی برای خانم‌ها پسوند "چ" به جای "ک" استفاده می‌شود (مثلاً شلونچ، شخبارچ).'
        : 'در لهجه عراقی برای آقایان پسوند "ک" استفاده می‌شود (مثلاً شلونك، شخبارک).';
    }
    if (dialect === 'ar-LB') {
      return gender === 'feminine'
        ? 'در لهجه لبنانی خطاب به خانم‌ها با کسر انتهای کلمات صحبت می‌شود (مثلاً كيفيك، شو بدك).'
        : 'در لهجه لبنانی خطاب به آقایان با سکون انتهای کلمه تلفظ می‌شود (مثلاً كيفك، شو بدك).';
    }
    return undefined;
  }

  private heuristicTranslation(text: string): string {
    const lower = text.toLowerCase();
    if (lower.includes('hello')) return 'سلام! وقت شما بخیر.';
    if (lower.includes('how are you')) return 'چطوری؟ حال شما چطوره؟';
    if (lower.includes('thank you') || lower.includes('thanks')) return 'خیلی ممنون، سپاسگزارم.';
    if (lower.includes('coffee')) return 'یک فنجان قهوه می‌خواهم.';
    if (lower.includes('where is')) return 'کجا قرار دارد؟';
    return `ترجمه و تحلیل عبارت: "${text}"`;
  }

  private extractKeywords(tokens: Token[]) {
    return tokens
      .filter((t) => !t.isPunctuation && t.cleanText.length > 2)
      .slice(0, 4)
      .map((t) => ({
        word: t.text,
        meaningFa: `معنی و کاربرد واژه: ${t.text}`,
        pos: t.posFa,
      }));
  }

  private emptyResult(): LanguageAnalysisResult {
    return {
      rawText: '',
      tokens: [],
      sentenceType: 'declarative',
      detectedTenseFa: 'نامشخص',
      grammarScore: 100,
      explanationFa: 'متنی برای تحلیل وارد نشده است.',
      errors: [],
      dialectVariations: { us: '', uk: '', iq: '', lb: '' },
      betterAlternatives: [],
      persianTranslation: '',
      keyKeywords: [],
    };
  }
}

export const languagePipeline = new LanguagePipeline();
