import { PracticeExercise } from '../types';

export const PRACTICE_EXERCISES: PracticeExercise[] = [
  {
    id: 'e1',
    type: 'multiple_choice',
    questionFa: 'کدام کلمه به معنی «تاب‌آوری و سرسختی در برابر مشکلات» است؟',
    options: ['Resilience', 'Reluctance', 'Redundancy', 'Resignation'],
    correctAnswer: 'Resilience',
    explanationFa: 'کلمه Resilience به معنی قدرت بازگشت به حالت اولیه و سرسختی در رویاپردازی و سختی‌هاست.',
    level: 'B2'
  },
  {
    id: 'e2',
    type: 'fill_blank',
    questionFa: 'جای خالی را با کلمه مناسب پر کنید: "She spoke with great ____ during the speech."',
    options: ['eloquence', 'eloquent', 'eloquently', 'eloquences'],
    correctAnswer: 'eloquence',
    explanationFa: 'بعد از صفت great نیاز به اسم (eloquence - فصاحت و شیوایی) داریم.',
    level: 'C1'
  },
  {
    id: 'e3',
    type: 'multiple_choice',
    questionFa: 'معنای عبارت اصیل لبنانی «تكرم عينك» چیست؟',
    options: ['به روی چشم / با کمال میل', 'خداحافظ', 'عصر بخیر', 'متاسفم'],
    correctAnswer: 'به روی چشم / با کمال میل',
    explanationFa: 'عبارت «تكرم عينك» در لهجه لبنانی و شامی برای قبول محترمانه درخواست و تعارف به کار می‌رود.',
    level: 'A2'
  },
  {
    id: 'e4',
    type: 'multiple_choice',
    questionFa: 'معنای عبارت صمیمی عراقی «تدلل عيني» چیست؟',
    options: ['روی چشمم / امر بفرما', 'کجا می‌روی؟', 'قیمتش چقدر است؟', 'صبح بخیر'],
    correctAnswer: 'روی چشمم / امر بفرما',
    explanationFa: 'عبارت «تدلل» یا «تدلل عيني» در فرهنگ عراقی نشان‌دهنده احترام و تعارف صمیمانه است.',
    level: 'A2'
  }
];
