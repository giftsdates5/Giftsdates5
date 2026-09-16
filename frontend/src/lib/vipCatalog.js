// Canonical service values are the Russian strings (backend whitelist keys).
// Translations below are a display-only layer keyed by the Russian string.

export const VIP_CATEGORIES = [
  { key: "basic", items: ["Минет в презервативе", "Поцелуи с языком", "Секс анальный", "Секс вагинальный", "Секс групповой", "Секс лесбийский"] },
  { key: "extra", items: ["Куннилингус", "Минет без резинки", "Минет глубокий", "Окончание в рот", "Окончание на грудь", "Окончание на лицо", "Работаю с девственниками", "Ролевые игры", "Секс игрушки", "Секс по телефону", "Услуги семейной паре", "Фейсситтинг", "Фото/видео съемка", "Эскорт"] },
  { key: "massage", items: ["Массаж Ветка сакуры", "Массаж классический", "Массаж профессиональный", "Массаж расслабляющий", "Массаж тайский", "Массаж точечный", "Массаж урологический", "Массаж эротический"] },
  { key: "striptease", items: ["Лесби откровенное", "Лесби-шоу легкое", "Стриптиз не профи", "Стриптиз профи"] },
  { key: "bdsm", items: ["Бандаж", "Госпожа", "Легкая доминация", "Порка", "Рабыня", "Трамплинг", "Фетиш", "Эротические игры"] },
  { key: "extreme", items: ["Анилингус делаю", "Золотой дождь выдача", "Золотой дождь прием", "Копро выдача", "Страпон", "Фистинг анальный", "Фистинг вагинальный"] },
];

const pick = (o, lang) => (o && (o[lang] || o.en || o.ru)) || "";

const CAT_TITLES = {
  basic: { ru: "Основные", en: "Basic", es: "Básicos", fr: "De base", de: "Basis", pt: "Básicos", zh: "基础", hi: "मूल", bn: "মৌলিক", ur: "بنیادی", ar: "أساسي" },
  extra: { ru: "Дополнительные", en: "Additional", es: "Adicionales", fr: "Supplémentaires", de: "Zusätzlich", pt: "Adicionais", zh: "附加", hi: "अतिरिक्त", bn: "অতিরিক্ত", ur: "اضافی", ar: "إضافي" },
  massage: { ru: "Массаж", en: "Massage", es: "Masaje", fr: "Massage", de: "Massage", pt: "Massagem", zh: "按摩", hi: "मालिश", bn: "ম্যাসাজ", ur: "مساج", ar: "تدليك" },
  striptease: { ru: "Стриптиз", en: "Striptease", es: "Estriptis", fr: "Strip-tease", de: "Striptease", pt: "Striptease", zh: "脱衣舞", hi: "स्ट्रिपटीज़", bn: "স্ট্রিপটিজ", ur: "اسٹرپ ٹیز", ar: "تعري" },
  bdsm: { ru: "Садо-мазо", en: "BDSM", es: "Sadomaso", fr: "Sado-maso", de: "Sado-Maso", pt: "Sadomasô", zh: "虐恋", hi: "बीडीएसएम", bn: "বিডিএসএম", ur: "بی ڈی ایس ایم", ar: "ساد-ماس" },
  extreme: { ru: "Экстрим", en: "Extreme", es: "Extremo", fr: "Extrême", de: "Extrem", pt: "Extremo", zh: "极限", hi: "चरम", bn: "চরম", ur: "انتہائی", ar: "متطرف" },
};

const SVC_TR = {
  "Минет в презервативе": { en: "Blowjob with condom", es: "Mamada con condón", fr: "Fellation avec préservatif", de: "Blowjob mit Kondom", pt: "Boquete com camisinha", zh: "带套口交", hi: "कंडोम के साथ ब्लोजॉब", bn: "কনডম সহ ব্লোজব", ur: "کنڈوم کے ساتھ بلوجاب", ar: "مص مع واقٍ ذكري" },
  "Поцелуи с языком": { en: "French kissing", es: "Besos con lengua", fr: "Baisers avec la langue", de: "Zungenküsse", pt: "Beijos de língua", zh: "舌吻", hi: "फ्रेंच किस", bn: "ফ্রেঞ্চ কিস", ur: "فرنچ کس", ar: "تقبيل باللسان" },
  "Секс анальный": { en: "Anal sex", es: "Sexo anal", fr: "Sexe anal", de: "Analsex", pt: "Sexo anal", zh: "肛交", hi: "गुदा मैथुन", bn: "পায়ুসঙ্গম", ur: "مقعد سیکس", ar: "جنس شرجي" },
  "Секс вагинальный": { en: "Vaginal sex", es: "Sexo vaginal", fr: "Sexe vaginal", de: "Vaginalsex", pt: "Sexo vaginal", zh: "阴道性交", hi: "योनि मैथुन", bn: "যোনি সঙ্গম", ur: "اندام نہانی سیکس", ar: "جنس مهبلي" },
  "Секс групповой": { en: "Group sex", es: "Sexo en grupo", fr: "Sexe en groupe", de: "Gruppensex", pt: "Sexo em grupo", zh: "群交", hi: "सामूहिक सेक्स", bn: "গ্রুপ সেক্স", ur: "گروپ سیکس", ar: "جنس جماعي" },
  "Секс лесбийский": { en: "Lesbian sex", es: "Sexo lésbico", fr: "Sexe lesbien", de: "Lesbensex", pt: "Sexo lésbico", zh: "女同性交", hi: "लेस्बियन सेक्स", bn: "লেসবিয়ান সেক্স", ur: "لیسبین سیکس", ar: "جنس سحاقي" },
  "Куннилингус": { en: "Cunnilingus", es: "Cunnilingus", fr: "Cunnilingus", de: "Cunnilingus", pt: "Cunilíngua", zh: "舔阴", hi: "कुनिलिंगस", bn: "কানিলিংগাস", ur: "کننیلنگس", ar: "لحس المهبل" },
  "Минет без резинки": { en: "Blowjob without condom", es: "Mamada sin condón", fr: "Fellation sans préservatif", de: "Blowjob ohne Kondom", pt: "Boquete sem camisinha", zh: "无套口交", hi: "बिना कंडोम ब्लोजॉब", bn: "কনডম ছাড়া ব্লোজব", ur: "بغیر کنڈوم بلوجاب", ar: "مص بدون واقٍ" },
  "Минет глубокий": { en: "Deep throat", es: "Garganta profunda", fr: "Gorge profonde", de: "Deepthroat", pt: "Garganta profunda", zh: "深喉", hi: "डीप थ्रोट", bn: "ডিপ থ্রোট", ur: "ڈیپ تھروٹ", ar: "بلع عميق" },
  "Окончание в рот": { en: "Cum in mouth", es: "Acabar en la boca", fr: "Éjaculation dans la bouche", de: "Abspritzen in den Mund", pt: "Gozar na boca", zh: "口爆", hi: "मुँह में स्खलन", bn: "মুখে বীর্যপাত", ur: "منہ میں انزال", ar: "القذف في الفم" },
  "Окончание на грудь": { en: "Cum on breasts", es: "Acabar en los pechos", fr: "Éjaculation sur la poitrine", de: "Abspritzen auf die Brust", pt: "Gozar nos seios", zh: "胸爆", hi: "स्तनों पर स्खलन", bn: "স্তনে বীর্যপাত", ur: "چھاتی پر انزال", ar: "القذف على الصدر" },
  "Окончание на лицо": { en: "Cum on face", es: "Acabar en la cara", fr: "Éjaculation sur le visage", de: "Gesichtsbesamung", pt: "Gozar no rosto", zh: "颜射", hi: "चेहरे पर स्खलन", bn: "চেহারায় বীর্যপাত", ur: "چہرے پر انزال", ar: "القذف على الوجه" },
  "Работаю с девственниками": { en: "Works with virgins", es: "Trabajo con vírgenes", fr: "Je travaille avec les vierges", de: "Arbeite mit Jungfrauen", pt: "Trabalho com virgens", zh: "接待处男", hi: "कुँवारों के साथ काम", bn: "কুমারদের সাথে কাজ", ur: "کنواروں کے ساتھ کام", ar: "أعمل مع العذارى" },
  "Ролевые игры": { en: "Role-play", es: "Juegos de rol", fr: "Jeux de rôle", de: "Rollenspiele", pt: "Jogos de papéis", zh: "角色扮演", hi: "रोल-प्ले", bn: "রোল-প্লে", ur: "رول پلے", ar: "تمثيل الأدوار" },
  "Секс игрушки": { en: "Sex toys", es: "Juguetes sexuales", fr: "Jouets sexuels", de: "Sexspielzeug", pt: "Brinquedos sexuais", zh: "情趣玩具", hi: "सेक्स टॉयज़", bn: "সেক্স টয়", ur: "سیکس ٹوائز", ar: "ألعاب جنسية" },
  "Секс по телефону": { en: "Phone sex", es: "Sexo telefónico", fr: "Sexe par téléphone", de: "Telefonsex", pt: "Sexo por telefone", zh: "电话性爱", hi: "फोन सेक्स", bn: "ফোন সেক্স", ur: "فون سیکس", ar: "جنس هاتفي" },
  "Услуги семейной паре": { en: "Services for couples", es: "Servicios para parejas", fr: "Services pour couples", de: "Service für Paare", pt: "Serviços para casais", zh: "情侣服务", hi: "दंपत्ति के लिए सेवाएँ", bn: "দম্পতির জন্য সেবা", ur: "جوڑوں کے لیے خدمات", ar: "خدمات للأزواج" },
  "Фейсситтинг": { en: "Facesitting", es: "Facesitting", fr: "Facesitting", de: "Facesitting", pt: "Facesitting", zh: "坐脸", hi: "फेससिटिंग", bn: "ফেসসিটিং", ur: "فیس سٹنگ", ar: "الجلوس على الوجه" },
  "Фото/видео съемка": { en: "Photo/video shooting", es: "Sesión de foto/vídeo", fr: "Photo/vidéo", de: "Foto-/Videoaufnahmen", pt: "Foto/vídeo", zh: "拍照/录像", hi: "फोटो/वीडियो शूट", bn: "ফটো/ভিডিও শুট", ur: "فوٹو/ویڈیو شوٹ", ar: "تصوير فوتوغرافي/فيديو" },
  "Эскорт": { en: "Escort", es: "Escort", fr: "Escorte", de: "Begleitung", pt: "Acompanhante", zh: "陪同", hi: "एस्कॉर्ट", bn: "এসকর্ট", ur: "ایسکارٹ", ar: "مرافقة" },
  "Массаж Ветка сакуры": { en: "Sakura branch massage", es: "Masaje Rama de sakura", fr: "Massage Branche de sakura", de: "Sakura-Zweig-Massage", pt: "Massagem Ramo de sakura", zh: "樱花枝按摩", hi: "साकुरा शाखा मालिश", bn: "সাকুরা শাখা ম্যাসাজ", ur: "ساکورا شاخ مساج", ar: "تدليك غصن الساكورا" },
  "Массаж классический": { en: "Classic massage", es: "Masaje clásico", fr: "Massage classique", de: "Klassische Massage", pt: "Massagem clássica", zh: "经典按摩", hi: "क्लासिक मालिश", bn: "ক্লাসিক ম্যাসাজ", ur: "کلاسک مساج", ar: "تدليك كلاسيكي" },
  "Массаж профессиональный": { en: "Professional massage", es: "Masaje profesional", fr: "Massage professionnel", de: "Professionelle Massage", pt: "Massagem profissional", zh: "专业按摩", hi: "पेशेवर मालिश", bn: "পেশাদার ম্যাসাজ", ur: "پیشہ ور مساج", ar: "تدليك احترافي" },
  "Массаж расслабляющий": { en: "Relaxing massage", es: "Masaje relajante", fr: "Massage relaxant", de: "Entspannungsmassage", pt: "Massagem relaxante", zh: "放松按摩", hi: "आरामदायक मालिश", bn: "রিলাক্সিং ম্যাসাজ", ur: "آرام دہ مساج", ar: "تدليك استرخائي" },
  "Массаж тайский": { en: "Thai massage", es: "Masaje tailandés", fr: "Massage thaïlandais", de: "Thai-Massage", pt: "Massagem tailandesa", zh: "泰式按摩", hi: "थाई मालिश", bn: "থাই ম্যাসাজ", ur: "تھائی مساج", ar: "تدليك تايلاندي" },
  "Массаж точечный": { en: "Acupressure massage", es: "Masaje de puntos", fr: "Massage par acupression", de: "Akupressur-Massage", pt: "Massagem de pontos", zh: "点压按摩", hi: "एक्यूप्रेशर मालिश", bn: "আকুপ্রেসার ম্যাসাজ", ur: "ایکیوپریشر مساج", ar: "تدليك بالضغط" },
  "Массаж урологический": { en: "Urological massage", es: "Masaje urológico", fr: "Massage urologique", de: "Urologische Massage", pt: "Massagem urológica", zh: "泌尿按摩", hi: "यूरोलॉजिकल मालिश", bn: "ইউরোলজিক্যাল ম্যাসাজ", ur: "یورولوجیکل مساج", ar: "تدليك بولي" },
  "Массаж эротический": { en: "Erotic massage", es: "Masaje erótico", fr: "Massage érotique", de: "Erotische Massage", pt: "Massagem erótica", zh: "情色按摩", hi: "कामुक मालिश", bn: "ইরোটিক ম্যাসাজ", ur: "شہوانی مساج", ar: "تدليك مثير" },
  "Лесби откровенное": { en: "Explicit lesbian show", es: "Lésbico explícito", fr: "Lesbien explicite", de: "Freizügige Lesbenshow", pt: "Lésbico explícito", zh: "露骨女同", hi: "बोल्ड लेस्बियन", bn: "খোলামেলা লেসবিয়ান", ur: "کھلا لیسبین", ar: "عرض سحاقي صريح" },
  "Лесби-шоу легкое": { en: "Light lesbian show", es: "Show lésbico suave", fr: "Show lesbien léger", de: "Leichte Lesbenshow", pt: "Show lésbico leve", zh: "轻度女同秀", hi: "हल्का लेस्बियन शो", bn: "হালকা লেসবিয়ান শো", ur: "ہلکا لیسبین شو", ar: "عرض سحاقي خفيف" },
  "Стриптиз не профи": { en: "Amateur striptease", es: "Estriptis amateur", fr: "Strip-tease amateur", de: "Amateur-Striptease", pt: "Striptease amador", zh: "业余脱衣舞", hi: "शौकिया स्ट्रिपटीज़", bn: "অপেশাদার স্ট্রিপটিজ", ur: "شوقیہ اسٹرپ ٹیز", ar: "تعري هاوٍ" },
  "Стриптиз профи": { en: "Professional striptease", es: "Estriptis profesional", fr: "Strip-tease professionnel", de: "Profi-Striptease", pt: "Striptease profissional", zh: "专业脱衣舞", hi: "पेशेवर स्ट्रिपटीज़", bn: "পেশাদার স্ট্রিপটিজ", ur: "پیشہ ور اسٹرپ ٹیز", ar: "تعري احترافي" },
  "Бандаж": { en: "Bondage", es: "Bondage", fr: "Bondage", de: "Bondage", pt: "Bondage", zh: "捆绑", hi: "बॉन्डेज", bn: "বন্ডেজ", ur: "بانڈیج", ar: "تقييد" },
  "Госпожа": { en: "Mistress", es: "Ama", fr: "Maîtresse", de: "Herrin", pt: "Senhora", zh: "女王", hi: "स्वामिनी", bn: "মিস্ট্রেস", ur: "مالکن", ar: "سيدة" },
  "Легкая доминация": { en: "Light domination", es: "Dominación suave", fr: "Domination légère", de: "Leichte Dominanz", pt: "Dominação leve", zh: "轻度支配", hi: "हल्का प्रभुत्व", bn: "হালকা ডমিনেশন", ur: "ہلکا تسلط", ar: "هيمنة خفيفة" },
  "Порка": { en: "Spanking", es: "Azotes", fr: "Fessée", de: "Spanking", pt: "Palmadas", zh: "打屁股", hi: "स्पैंकिंग", bn: "স্প্যাঙ্কিং", ur: "اسپینکنگ", ar: "صفع" },
  "Рабыня": { en: "Slave", es: "Esclava", fr: "Esclave", de: "Sklavin", pt: "Escrava", zh: "女奴", hi: "दासी", bn: "দাসী", ur: "کنیز", ar: "أَمَة" },
  "Трамплинг": { en: "Trampling", es: "Trampling", fr: "Trampling", de: "Trampling", pt: "Trampling", zh: "踩踏", hi: "ट्रैम्पलिंग", bn: "ট্রাম্পলিং", ur: "ٹرمپلنگ", ar: "الدوس" },
  "Фетиш": { en: "Fetish", es: "Fetiche", fr: "Fétiche", de: "Fetisch", pt: "Fetiche", zh: "恋物", hi: "फेटिश", bn: "ফেটিশ", ur: "فیٹش", ar: "فيتِش" },
  "Эротические игры": { en: "Erotic games", es: "Juegos eróticos", fr: "Jeux érotiques", de: "Erotische Spiele", pt: "Jogos eróticos", zh: "情色游戏", hi: "कामुक खेल", bn: "ইরোটিক গেম", ur: "شہوانی کھیل", ar: "ألعاب مثيرة" },
  "Анилингус делаю": { en: "Anilingus (I give)", es: "Hago anilingus", fr: "Anulingus (je le fais)", de: "Anilingus (aktiv)", pt: "Faço anilingus", zh: "舔肛（主动）", hi: "एनिलिंगस (करती हूँ)", bn: "অ্যানিলিংগাস (করি)", ur: "اینیلنگس (کرتی ہوں)", ar: "لحس الشرج (أقوم به)" },
  "Золотой дождь выдача": { en: "Golden shower (giving)", es: "Lluvia dorada (activa)", fr: "Douche dorée (active)", de: "Natursekt (aktiv)", pt: "Chuva dourada (ativa)", zh: "黄金浴（给予）", hi: "गोल्डन शावर (देना)", bn: "গোল্ডেন শাওয়ার (দেওয়া)", ur: "گولڈن شاور (دینا)", ar: "التبول (فاعل)" },
  "Золотой дождь прием": { en: "Golden shower (receiving)", es: "Lluvia dorada (pasiva)", fr: "Douche dorée (passive)", de: "Natursekt (passiv)", pt: "Chuva dourada (passiva)", zh: "黄金浴（接受）", hi: "गोल्डन शावर (लेना)", bn: "গোল্ডেন শাওয়ার (নেওয়া)", ur: "گولڈن شاور (لینا)", ar: "التبول (مفعول)" },
  "Копро выдача": { en: "Scat (giving)", es: "Copro (activa)", fr: "Scato (active)", de: "Kaviar (aktiv)", pt: "Copro (ativa)", zh: "排泄（给予）", hi: "कोप्रो (देना)", bn: "কপ্রো (দেওয়া)", ur: "کوپرو (دینا)", ar: "التغوط (فاعل)" },
  "Страпон": { en: "Strap-on", es: "Strap-on", fr: "Gode-ceinture", de: "Strap-on", pt: "Strap-on", zh: "穿戴式假阳具", hi: "स्ट्रैप-ऑन", bn: "স্ট্র্যাপ-অন", ur: "اسٹریپ آن", ar: "قضيب اصطناعي" },
  "Фистинг анальный": { en: "Anal fisting", es: "Fisting anal", fr: "Fisting anal", de: "Anal-Fisting", pt: "Fisting anal", zh: "肛门拳交", hi: "एनल फिस्टिंग", bn: "অ্যানাল ফিস্টিং", ur: "اینل فسٹنگ", ar: "القبضة الشرجية" },
  "Фистинг вагинальный": { en: "Vaginal fisting", es: "Fisting vaginal", fr: "Fisting vaginal", de: "Vaginal-Fisting", pt: "Fisting vaginal", zh: "阴道拳交", hi: "वजाइनल फिस्टिंग", bn: "ভ্যাজাইনাল ফিস্টিং", ur: "ویجائنل فسٹنگ", ar: "القبضة المهبلية" },
};

export const VIP_PLACES = [
  { v: "own", tr: { ru: "У себя", en: "At my place", es: "En mi lugar", fr: "Chez moi", de: "Bei mir", pt: "No meu local", zh: "我这里", hi: "मेरे यहाँ", bn: "আমার এখানে", ur: "میرے ہاں", ar: "في مكاني" } },
  { v: "your", tr: { ru: "К тебе", en: "At your place", es: "En tu lugar", fr: "Chez toi", de: "Bei dir", pt: "No seu local", zh: "你那里", hi: "आपके यहाँ", bn: "আপনার এখানে", ur: "آپ کے ہاں", ar: "في مكانك" } },
  { v: "other", tr: { ru: "В другом месте", en: "Elsewhere", es: "En otro lugar", fr: "Ailleurs", de: "Woanders", pt: "Em outro local", zh: "其他地方", hi: "अन्य जगह", bn: "অন্য জায়গায়", ur: "کسی اور جگہ", ar: "في مكان آخر" } },
];

export const PRICE_KEYS = [
  { k: "hour", tr: { ru: "За час", en: "Per hour", es: "Por hora", fr: "Par heure", de: "Pro Stunde", pt: "Por hora", zh: "每小时", hi: "प्रति घंटा", bn: "প্রতি ঘণ্টা", ur: "فی گھنٹہ", ar: "للساعة" } },
  { k: "h2", tr: { ru: "За 2 часа", en: "2 hours", es: "2 horas", fr: "2 heures", de: "2 Stunden", pt: "2 horas", zh: "2小时", hi: "2 घंटे", bn: "২ ঘণ্টা", ur: "2 گھنٹے", ar: "ساعتان" } },
  { k: "h3", tr: { ru: "За 3 часа", en: "3 hours", es: "3 horas", fr: "3 heures", de: "3 Stunden", pt: "3 horas", zh: "3小时", hi: "3 घंटे", bn: "৩ ঘণ্টা", ur: "3 گھنٹے", ar: "3 ساعات" } },
];

export const svcLabel = (ru, lang) => (lang === "ru" ? ru : (SVC_TR[ru]?.[lang] || SVC_TR[ru]?.en || ru));
export const catTitle = (key, lang) => pick(CAT_TITLES[key], lang);
export const placeLabel = (v, lang) => { const p = VIP_PLACES.find((x) => x.v === v); return p ? pick(p.tr, lang) : v; };
export const priceLabel = (k, lang) => { const p = PRICE_KEYS.find((x) => x.k === k); return p ? pick(p.tr, lang) : k; };
