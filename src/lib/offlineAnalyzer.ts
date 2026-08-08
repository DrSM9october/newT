import { Persona, ChatMessage, DialectType } from '../types';
import { CHAT_PERSONAS } from '../data/personasData';

interface OfflineAnalysisResult {
  replyEn: string;
  replyFa: string;
  grammarScore: number;
  correctedSentence?: string;
  explanationFa?: string;
  betterAlternatives?: string[];
  vocabularyTips?: string[];
}

export function analyzeOfflineMessage(
  userText: string,
  personaId: string = 'alex_casual',
  dialect: DialectType = 'en-US'
): OfflineAnalysisResult {
  const cleanInput = userText.trim();
  const persona = CHAT_PERSONAS.find((p) => p.id === personaId) || CHAT_PERSONAS[0];

  // 1. Iraqi Dialect Handling
  if (dialect === 'ar-IQ' || persona.dialect === 'ar-IQ') {
    return handleIraqiOffline(cleanInput, persona);
  }

  // 2. Lebanese Dialect Handling
  if (dialect === 'ar-LB' || persona.dialect === 'ar-LB') {
    return handleLebaneseOffline(cleanInput, persona);
  }

  // 3. English Analysis Logic (Offline Rules Engine)
  let grammarScore = 100;
  let correctedSentence = cleanInput;
  let explanationFa = 'جمله شما از نظر گرامری کاملاً صحیح است!';
  let betterAlternatives: string[] = [];
  let vocabularyTips: string[] = [];

  const lower = cleanInput.toLowerCase();

  // Basic Grammar Rule checks
  if (/\bi is\b/.test(lower)) {
    grammarScore = 70;
    correctedSentence = cleanInput.replace(/\bi is\b/gi, 'I am');
    explanationFa = 'در زبان انگلیسی برای ضمیر اول شخص (I) باید از فعل کمکی "am" استفاده کنید نه "is".';
    betterAlternatives = [correctedSentence, 'I\'m doing great today.'];
  } else if (/\byou is\b/.test(lower)) {
    grammarScore = 70;
    correctedSentence = cleanInput.replace(/\byou is\b/gi, 'you are');
    explanationFa = 'برای ضمیر مخاطب (You) از فعل "are" استفاده می‌شود.';
    betterAlternatives = [correctedSentence, 'How are you holding up?'];
  } else if (/\bhe go\b/.test(lower) || /\bshe go\b/.test(lower)) {
    grammarScore = 75;
    correctedSentence = cleanInput.replace(/\b(he|she) go\b/gi, '$1 goes');
    explanationFa = 'در زمان حال ساده برای سوم شخص مفرد (He/She/It) باید به فعل پسوند -s یا -es اضافه کنید.';
    betterAlternatives = [correctedSentence];
  } else if (/\bdont has\b/.test(lower)) {
    grammarScore = 65;
    correctedSentence = cleanInput.replace(/\bdont has\b/gi, "doesn't have");
    explanationFa = 'برای سوم شخص منفی از "doesn\'t have" استفاده کنید.';
  } else if (cleanInput.length > 0 && !/^[A-Z]/.test(cleanInput)) {
    grammarScore = 90;
    correctedSentence = cleanInput.charAt(0).toUpperCase() + cleanInput.slice(1);
    explanationFa = 'در زبان انگلیسی همیشه حرف اول جملات با حرف بزرگ (Capital letter) شروع می‌شود.';
  }

  // Generate Persona-specific English Reply
  let replyEn = '';
  let replyFa = '';

  // Contextual Scenario Keywords Detection (for seamless offline AI roleplay)
  if (lower.includes('coffee') || lower.includes('latte') || lower.includes('milk') || lower.includes('muffin') || lower.includes('order')) {
    replyEn = `Got it! One ${cleanInput.includes('latte') ? 'iced latte' : 'fresh coffee'} coming right up for you. Would you like anything else with that?`;
    replyFa = `حتماً! یک قهوه تازه برای شما آماده می‌کنم. آیا چیز دیگری همراه آن میل دارید؟`;
  } else if (lower.includes('passport') || lower.includes('visit') || lower.includes('stay') || lower.includes('hotel') || lower.includes('tourism')) {
    replyEn = `Thank you. Everything seems in order with your documentation. Enjoy your stay in the country!`;
    replyFa = `متشکرم. تمام مدارک شما معتبر به نظر می‌رسد. از اقامت خود در کشور لذت ببرید!`;
  } else if (lower.includes('interview') || lower.includes('experience') || lower.includes('project') || lower.includes('work') || lower.includes('team')) {
    replyEn = `That sounds impressive! How do you handle high-pressure deadlines in your typical workflow?`;
    replyFa = `بسیار چشمگیر است! شما معمولاً چگونه با ددلاین‌های پرفشار در روال کاری خود برخورد می‌کنید؟`;
  } else if (lower.includes('doctor') || lower.includes('fever') || lower.includes('throat') || lower.includes('pain') || lower.includes('sick')) {
    replyEn = `I see. I will prescribe some resting medication for you. Please make sure to drink plenty of fluids.`;
    replyFa = `متوجهم. من برای شما داروی استراحت تجویز می‌کنم. لطفاً حتماً مایعات فراوان بنوشید.`;
  } else if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
    if (persona.mood === 'formal') {
      replyEn = `Good day to you! How may I assist your English practice today?`;
      replyFa = `روز بر شما بخیر! امروز چگونه می‌توانم به تمرین انگلیسی شما کمک کنم؟`;
    } else if (persona.mood === 'excited') {
      replyEn = `Hey there! Wonderful to hear from you! How is your day going?`;
      replyFa = `سلام! خیلی عالیه که باهات صحبت می‌کنم! روزت چطور می‌گذره؟`;
    } else if (persona.mood === 'witty') {
      replyEn = `G'day! Glad you popped in. Ready to chat or just avoiding work? 😉`;
      replyFa = `سلام رفیق! خوشحالم سر زدی. آماده گپ زدن هستی یا فقط داری از زیر کار در میری؟ 😉`;
    } else {
      replyEn = `Hey! Great to hear from you. What's on your mind today?`;
      replyFa = `سلام! خوشحالم پیام دادی. امروز دوست داری در مورد چی صحبت کنیم؟`;
    }
  } else if (lower.includes('how are you')) {
    replyEn = `I'm feeling fantastic, thank you! How are things on your end?`;
    replyFa = `من حالم عالیه، ممنون! اوضاع سمت شما چطوره؟`;
  } else if (lower.includes('name')) {
    replyEn = `My name is ${persona.name}. I'm your ${persona.roleFa || 'partner'}!`;
    replyFa = `اسم من ${persona.name} است. من هم‌صحبت شما هستم!`;
  } else if (lower.includes('weather')) {
    replyEn = `The weather is lovely today! Do you enjoy sunny or rainy days more?`;
    replyFa = `هوا امروز خیلی دلپذیره! شما روزهای آفتابی رو بیشتر دوست داری یا بارونی؟`;
  } else if (lower.includes('food') || lower.includes('eat')) {
    replyEn = `Food is always a fun topic! What's your favorite meal or drink?`;
    replyFa = `غذا همیشه موضوع جذابیه! غذا یا نوشیدنی مورد علاقه‌ت چیه؟`;
  } else {
    // General conversational fallback with persona flavor
    if (persona.mood === 'formal') {
      replyEn = `Thank you for sharing that. Could you elaborate further on that topic?`;
      replyFa = `متشکرم از اینکه این موضوع را مطرح کردید. آیا می‌توانید بیشتر توضیح دهید؟`;
    } else if (persona.mood === 'excited') {
      replyEn = `That's super interesting! Tell me more about it!`;
      replyFa = `این موضوع فوق‌العاده جالبه! بیشتر درباره‌ش برام بگو!`;
    } else {
      replyEn = `I completely understand. That sounds very interesting! What else would you like to discuss?`;
      replyFa = `کاملاً متوجهم. خیلی جالب به نظر می‌رسه! دوست داری درباره چه موضوع دیگه‌ای گپ بزنیم؟`;
    }
  }

  // Suggest native alternatives & vocab
  if (betterAlternatives.length === 0) {
    betterAlternatives = [
      cleanInput,
      `Native way: "Actually, ${cleanInput.toLowerCase()}"`,
    ];
  }

  vocabularyTips = [
    `اصطلاح پیشنهادی: "To be honest" (به راستش / راستش رو بخوای)`,
    `کلمه نیتیو: "Fascinating" (جذاب و شگفت‌انگیز)`,
  ];

  return {
    replyEn,
    replyFa,
    grammarScore,
    correctedSentence,
    explanationFa,
    betterAlternatives,
    vocabularyTips,
  };
}

function handleIraqiOffline(input: string, persona: Persona): OfflineAnalysisResult {
  const lower = input.toLowerCase();
  let replyEn = 'يا هلا والله! نورتنا عيوني. شنو رأيك نحكي عن اليوم؟';
  let replyFa = 'خوش آمدی عزیز دلم! صفا آوردی. نظرت چیه درباره امروز گپ بزنیم؟';

  if (lower.includes('شلونك') || lower.includes('شلون')) {
    replyEn = 'الحمد لله عيوني، كلشي تمام! انت شلونك وشكو ماكو؟';
    replyFa = 'الحمدالله چشام، همه چی عالیه! تو چطوری و چه خبرها؟';
  } else if (lower.includes('مرحبا') || lower.includes('هلو') || lower.includes('هلا')) {
    replyEn = 'هلا بيك عيوني، نورت العراقيين! امرني شتحتاج؟';
    replyFa = 'سلام به تو عزیزم، صفا دادی! بگو چه کمکی می‌تونم بکنم؟';
  }

  return {
    replyEn,
    replyFa,
    grammarScore: 98,
    correctedSentence: input,
    explanationFa: 'جمله لهجه عراقی شما بسیار روان و طبیعی (عامیانه بغدادی) است.',
    betterAlternatives: ['شلونك عيوني؟ (چطوری عزیز دلم؟)', 'شكو ماكو؟ (چه خبرها؟)'],
    vocabularyTips: ['عيوني: چشام / عزیزم', 'شكو ماكو: چه خبرها'],
  };
}

function handleLebaneseOffline(input: string, persona: Persona): OfflineAnalysisResult {
  const lower = input.toLowerCase();
  let replyEn = 'هاي كيفك؟ بتمنى تكون بألف خير، عن شو بتحب نحكي؟';
  let replyFa = 'های چطوری؟ امیدوارم عالی باشی، دوست داری درباره چی صحبت کنیم؟';

  if (lower.includes('كيفك') || lower.includes('كيف')) {
    replyEn = 'منيح كتير الحمد لله! وانت كيف صحتك اليوم؟';
    replyFa = 'خیلی خوبم الحمدالله! تو حالت چطوره امروز؟';
  } else if (lower.includes('هاي') || lower.includes('مرحبا') || lower.includes('بونجور')) {
    replyEn = 'بونجور يا حلو! نورتنا والله، تكرم عينك!';
    replyFa = 'روز بخیر عزیز! صفا دادی، روی چشمام!';
  }

  return {
    replyEn,
    replyFa,
    grammarScore: 98,
    correctedSentence: input,
    explanationFa: 'عبارت لهجه لبنانی شما شیک و صمیمی (عامیانه بیروتی) است.',
    betterAlternatives: ['كيفك اليوم؟ (چطوری امروز؟)', 'تكرم عينك (روی چشمام)'],
    vocabularyTips: ['منيح: خوب / عالی', 'تكرم عينك: روی چشمام'],
  };
}
