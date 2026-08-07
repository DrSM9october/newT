import { DictionaryWord } from '../types';

export const DICTIONARY_WORDS: DictionaryWord[] = [
  {
    id: 'w1',
    word: 'Resilience',
    phonetic: '/rɪˈzɪl.jəns/',
    phoneticUk: '/rɪˈzɪl.i.əns/',
    meaningFa: 'تاب‌آوری، تاب و توان، سرسختی در برابر مشکلات',
    partOfSpeech: 'noun',
    level: 'B2',
    examples: [
      { en: 'Her resilience carried her through the difficult times.', fa: 'تاب‌آوری او باعث شد دوران سخت را پشت سر بگذارد.', gender: 'feminine' },
      { en: 'Building mental resilience takes practice and time.', fa: 'ایجاد تاب‌آوری ذهنی نیاز به تمرین و زمان دارد.', gender: 'unisex' }
    ],
    collocations: ['show resilience', 'emotional resilience', 'remarkable resilience'],
    synonyms: ['toughness', 'adaptability', 'flexibility'],
    antonyms: ['fragility', 'vulnerability']
  },
  {
    id: 'w2',
    word: 'Eloquence',
    phonetic: '/ˈel.ə.kwəns/',
    phoneticUk: '/ˈel.ə.kwəns/',
    meaningFa: 'شیوایی بیان، فصاحت، سخنوری شیوا',
    partOfSpeech: 'noun',
    level: 'C1',
    examples: [
      { en: 'He spoke with great eloquence and passion.', fa: 'او با فصاحت و شور و شوق فراوان سخن گفت.', gender: 'masculine' }
    ],
    collocations: ['speak with eloquence', 'natural eloquence'],
    synonyms: ['fluency', 'articulateness', 'oratory']
  },
  {
    id: 'w3',
    word: 'Empower',
    phonetic: '/ɪmˈpaʊ.ər/',
    meaningFa: 'توانمند ساختن، قدرت دادن، اعطای اختیار',
    partOfSpeech: 'verb',
    level: 'B2',
    examples: [
      { en: 'Education empowers people to make better choices.', fa: 'آموزش به مردم توانایی می‌دهد تا تصمیمات بهتری بگیرند.', gender: 'unisex' }
    ],
    collocations: ['empower women', 'empower students', 'feel empowered'],
    synonyms: ['enable', 'authorize', 'strengthen']
  },
  {
    id: 'w4',
    word: 'تكرم عينك',
    phonetic: 'Tekram Ainak',
    meaningFa: 'به روی چشم / حتماً با کمال میل (اصطلاح پرکاربرد لبنانی 🇱🇧)',
    partOfSpeech: 'expression',
    level: 'A2',
    examples: [
      { en: 'تكرم عينك، هلق بجبلك فنجان قهوة.', fa: 'به روی چشم، الان واست یه فنجون قهوه میارم.', gender: 'unisex' }
    ],
    collocations: ['تكرم عينك', 'على راسي'],
    synonyms: ['با کمال میل', 'حتماً']
  },
  {
    id: 'w5',
    word: 'تدلل عيني',
    phonetic: 'Tdallal Aini',
    meaningFa: 'فرمانبردارم / روی چشمم / شما فقط امر بفرما (اصطلاح صمیمی عراقی 🇮🇶)',
    partOfSpeech: 'expression',
    level: 'A2',
    examples: [
      { en: 'تدلل عيني، هسا انزلك يم الموعد.', fa: 'روی چشمم عزیزم، الان جلوی قرار پیاده‌ت می‌کنم.', gender: 'unisex' }
    ],
    collocations: ['تدلل', 'يا هلا بيك'],
    synonyms: ['رو چشمم', 'امر بفرما']
  }
];
