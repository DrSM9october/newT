import { RoleplayScenario } from '../types';

export const PRACTICAL_SCENARIOS: RoleplayScenario[] = [
  {
    id: 'cafe_ordering',
    titleFa: 'سفارش در کافه و رستوران',
    titleEn: 'Ordering at a Coffee Shop',
    descriptionFa: 'تمرین سفارش قهوه، کیک، تغییر جزییات سفارش و پرداخت حساب با باریستا',
    category: 'cafe_food',
    level: 'A1',
    icon: 'Coffee',
    aiPersona: {
      name: 'Alex',
      role: 'Friendly Cafe Barista',
      avatar: '☕',
      systemPrompt:
        'You are Alex, a warm and polite coffee shop barista at "Metro Brews" in Seattle. Greet the customer cheerfully, ask for their coffee order, ask about size (small, medium, large), milk choice, or if they want any pastry. Be friendly, encouraging, and respond realistically.',
    },
    objectives: [
      { id: 'o1', titleFa: 'سفارش نوع نوشیدنی و سایز آن', titleEn: 'Order coffee type and size', completed: false },
      { id: 'o2', titleFa: 'درخواست تغییر نوع شیر یا شیرینی', titleEn: 'Specify milk or pastry option', completed: false },
      { id: 'o3', titleFa: 'پرسیدن قیمت و پرداخت حساب', titleEn: 'Ask for the bill or payment method', completed: false },
    ],
    starterMessage: "Welcome to Metro Brews! What can I get started for you today?",
    usefulPhrases: [
      { en: "I'd like a medium iced latte, please.", fa: "یک لاته یخ‌دار متوسط می‌خواهم لطفا." },
      { en: "Do you have oat milk or almond milk?", fa: "شیر جو دوسر یا شیر بادام دارید؟" },
      { en: "Can I get this to go?", fa: "می‌شود این را بیرون‌بر ببرم؟" },
      { en: "How much is that in total?", fa: "مجموعش چقدر می‌شود؟" },
    ],
    keyVocab: ['Latte', 'Cappuccino', 'Pastry', 'To-go', 'Receipt', 'Oat milk'],
  },
  {
    id: 'airport_immigration',
    titleFa: 'کنترل گذرنامه و گمرک فرودگاه',
    titleEn: 'Airport Passport & Customs Check',
    descriptionFa: 'پاسخ به سوالات آفیسران مهاجرت در مورد هدف سفر، مدت اقامت و مدارک',
    category: 'travel_airport',
    level: 'A2',
    icon: 'Plane',
    aiPersona: {
      name: 'Officer Davis',
      role: 'Border Protection Officer',
      avatar: '🛂',
      systemPrompt:
        'You are Officer Davis at London Heathrow Airport immigration control. You are polite, professional, and slightly formal. Ask the traveler for their passport, purpose of visit, length of stay, address where they will stay, and if they have anything to declare.',
    },
    objectives: [
      { id: 'o1', titleFa: 'اعلام هدف سفر (گردشگری یا کاری)', titleEn: 'State purpose of visit', completed: false },
      { id: 'o2', titleFa: 'توضیح درباره مدت زمان اقامت', titleEn: 'State duration of stay', completed: false },
      { id: 'o3', titleFa: 'ارائه نام هتل یا محل اقامت', titleEn: 'Provide hotel / accommodation details', completed: false },
    ],
    starterMessage: "Good day. Passports and landing cards, please. What is the purpose of your visit to the UK?",
    usefulPhrases: [
      { en: "I am here on vacation for ten days.", fa: "من برای تعطیلات و سفر ۱۰ روزه اینجا هستم." },
      { en: "I will be staying at the Hilton Hotel downtown.", fa: "در هتل هیلتون مرکز شهر اقامت خواهم داشت." },
      { en: "Here is my return ticket confirmation.", fa: "این هم تاییدیه بلیط برگشتم است." },
    ],
    keyVocab: ['Passport', 'Vacation', 'Reservation', 'Return flight', 'Declare'],
  },
  {
    id: 'hotel_checkin',
    titleFa: 'رزرو و تحویل اتاق در هتل',
    titleEn: 'Hotel Room Check-in',
    descriptionFa: 'تحویل گرفتن کلید اتاق، پرسش درباره اینترنت، صبحانه و خروج از هتل',
    category: 'hotel_stay',
    level: 'A2',
    icon: 'Bed',
    aiPersona: {
      name: 'Sarah',
      role: 'Hotel Receptionist',
      avatar: '🏨',
      systemPrompt:
        'You are Sarah, reception manager at the Grand View Hotel. Help the guest check in, verify their booking name, ask for ID, inform them about Wi-Fi password, breakfast hours (7am - 10am), and elevator locations.',
    },
    objectives: [
      { id: 'o1', titleFa: 'ارائه نام رزرو و مدرک شناسایی', titleEn: 'Provide booking name and ID', completed: false },
      { id: 'o2', titleFa: 'سوال درباره ساعت صبحانه و Wi-Fi', titleEn: 'Inquire about Wi-Fi and breakfast', completed: false },
      { id: 'o3', titleFa: 'درخواست اتاق در طبقات بالا یا ویو مناسب', titleEn: 'Request room preference', completed: false },
    ],
    starterMessage: "Good evening, welcome to the Grand View Hotel! How may I assist you tonight?",
    usefulPhrases: [
      { en: "Hi, I have a reservation under the name Ali Rezaei.", fa: "سلام، من رزروی به نام علی رضایی دارم." },
      { en: "What is the Wi-Fi password for the room?", fa: "رمز وای‌فای اتاق چیست؟" },
      { en: "Is breakfast included in my stay?", fa: "آیا صبحانه شامل اقامتم می‌شود؟" },
    ],
    keyVocab: ['Reservation', 'Check-in', 'Keycard', 'Breakfast included', 'Elevator'],
  },
  {
    id: 'job_interview_tech',
    titleFa: 'مصاحبه شغلی و رزومه',
    titleEn: 'Job Interview Practice',
    descriptionFa: 'تمرین پاسخ به سوالات مصاحبه شغلی، معرفی خود، سوابق و نقاط قوت',
    category: 'job_interview',
    level: 'B1',
    icon: 'Briefcase',
    aiPersona: {
      name: 'Michael',
      role: 'Senior Hiring Manager',
      avatar: '💼',
      systemPrompt:
        'You are Michael, Hiring Manager at a global technology firm. Conduct a supportive yet professional job interview. Ask the candidate to introduce themselves, share a challenging situation they overcame, why they want this role, and if they have any questions for you.',
    },
    objectives: [
      { id: 'o1', titleFa: 'معرفی خود و تجربیات قبلی', titleEn: 'Self introduction & background', completed: false },
      { id: 'o2', titleFa: 'توضیح درباره نحوه حل چالش‌های کاری', titleEn: 'Explain how you handle workplace challenges', completed: false },
      { id: 'o3', titleFa: 'طرح یک سوال از مصاحبه‌کننده', titleEn: 'Ask a relevant question to the interviewer', completed: false },
    ],
    starterMessage: "Hello! Thank you for joining us today. To start off, could you tell me a little about yourself and your background?",
    usefulPhrases: [
      { en: "I have over four years of experience in customer support.", fa: "من بیش از چهار سال سابقه کار در پشتیبانی مشتریان دارم." },
      { en: "My main strength is my attention to detail.", fa: "نقطه قوت اصلی من دقت بالا در جزییات است." },
      { en: "What does a typical day look like in this position?", fa: "یک روز معمولی در این موقعیت شغلی چگونه است؟" },
    ],
    keyVocab: ['Background', 'Experience', 'Strength', 'Teamwork', 'Challenge'],
  },
  {
    id: 'doctor_visit',
    titleFa: 'ویزیت پزشک و توصیف علائم',
    titleEn: 'Doctor Visit & Health Symptoms',
    descriptionFa: 'شرح بیماری، احساس درد، سابقه حساسیت و گرفتن نسخه دارو',
    category: 'emergency_health',
    level: 'B1',
    icon: 'HeartPulse',
    aiPersona: {
      name: 'Dr. Carter',
      role: 'General Physician',
      avatar: '🩺',
      systemPrompt:
        'You are Dr. Carter at an urgent care clinic. Be compassionate and clear. Ask the patient about their symptoms, how long they have had them, if they have fever or allergies, and give gentle medical advice or prescriptions.',
    },
    objectives: [
      { id: 'o1', titleFa: 'توضیح دقیق علائم بیماری (درد، تب، سرفه)', titleEn: 'Describe symptoms (pain, fever, cough)', completed: false },
      { id: 'o2', titleFa: 'بیان مدت زمان ابتلا', titleEn: 'State how long you have had the symptoms', completed: false },
      { id: 'o3', titleFa: 'پرسش درباره دوز مصرف دارو', titleEn: 'Ask about medication dosage', completed: false },
    ],
    starterMessage: "Hello there. Come on in and sit down. What seems to be bringing you in today?",
    usefulPhrases: [
      { en: "I've had a severe headache and sore throat for two days.", fa: "دو روز است که سردرد شدید و گلودرد دارم." },
      { en: "Am I allergic to this medication?", fa: "آیا به این دارو حساسیت دارم؟" },
      { en: "How many times a day should I take these pills?", fa: "روزی چند بار باید این قرص‌ها را بخورم؟" },
    ],
    keyVocab: ['Sore throat', 'Fever', 'Prescription', 'Painkiller', 'Dosage'],
  },
  {
    id: 'directions_city',
    titleFa: 'آدرس پرسیدن در شهر',
    titleEn: 'Asking for Directions in Town',
    descriptionFa: 'پیدا کردن ایستگاه مترو، موزه یا داروخانه و فهم راهنمایی‌های مکانی',
    category: 'directions_transport',
    level: 'A1',
    icon: 'Navigation',
    aiPersona: {
      name: 'David',
      role: 'Friendly Local Resident',
      avatar: '🗺️',
      systemPrompt:
        'You are David, a friendly local walking down Regent Street. Help a tourist who is lost. Give clear step-by-step directions using turns (turn right, left, cross the street, past the bank, 2 blocks away). Be helpful!',
    },
    objectives: [
      { id: 'o1', titleFa: 'پرسش درباره مکان مقصد مشخص', titleEn: 'Ask for a specific landmark', completed: false },
      { id: 'o2', titleFa: 'درخواست تکرار یا روشن‌سازی مسیر', titleEn: 'Ask for clarification on direction', completed: false },
      { id: 'o3', titleFa: 'پرسیدن پیاده‌روی است یا نیاز به تاکسی دارد', titleEn: 'Ask if it is walkable or needs transit', completed: false },
    ],
    starterMessage: "Hi there! You look a bit lost. Can I help you find somewhere?",
    usefulPhrases: [
      { en: "Excuse me, how do I get to the nearest metro station?", fa: "ببخشید، چطور می‌توانم به نزدیک‌ترین ایستگاه مترو بروم؟" },
      { en: "Is it within walking distance from here?", fa: "آیا از اینجا با پای پیاده قابل رفتن است؟" },
      { en: "Should I turn left at the traffic light?", fa: "باید پشت چراغ راهنمایی به چپ بپیچم؟" },
    ],
    keyVocab: ['Crosswalk', 'Traffic light', 'Turn left', 'Blocks', 'Within walking distance'],
  }
];
