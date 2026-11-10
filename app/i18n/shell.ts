/**
 * Extra interface strings for the application shell (top navigation, theme
 * and sound toggles, modality titles). Kept separate from the per-locale
 * `ui/*.ts` dictionaries so adding shell labels never breaks their shared
 * `UiDictionary` type. Any missing locale falls back to English.
 */
export type ShellText = {
  atlas: string; atlasTitle: string;
  atelier: string; atelierTitle: string;
  clinical: string; clinicalTitle: string;
  imaging: string; imagingTitle: string;
  lessons: string; lessonsTitle: string;
  quizzes: string; quizzesTitle: string;
  notes: string; notesTitle: string;
  lightMode: string; darkMode: string; toggleTheme: string;
  mute: string; unmute: string; toggleSound: string;
  allSystems: string; filterSystems: string; primaryNav: string;
};

const en: ShellText = {
  atlas: "3D Body Atlas", atlasTitle: "3D full-body human atlas",
  atelier: "Organ Atelier", atelierTitle: "Organ atelier & dissection",
  clinical: "Clinical Reasoning", clinicalTitle: "Interactive 3D clinical reasoning & diagnostic cases",
  imaging: "Patient Scan", imagingTitle: "Patient-specific CT/MRI & 3D imaging workspace",
  lessons: "Lessons", lessonsTitle: "Interactive clinical lessons",
  quizzes: "Quizzes", quizzesTitle: "Clinical case quizzes & spotters",
  notes: "Notes", notesTitle: "Study notes & bookmarks",
  lightMode: "Switch to light mode", darkMode: "Switch to dark mode", toggleTheme: "Toggle theme",
  mute: "Mute sound effects", unmute: "Unmute sound effects", toggleSound: "Toggle sound",
  allSystems: "All", filterSystems: "Filter organs by system", primaryNav: "Primary navigation",
};

const shell: Record<string, ShellText> = {
  en,
  es: {
    atlas: "Atlas corporal 3D", atlasTitle: "Atlas humano 3D de cuerpo completo",
    atelier: "Taller de órganos", atelierTitle: "Taller de órganos y disección",
    clinical: "Razonamiento clínico", clinicalTitle: "Casos de razonamiento clínico 3D",
    imaging: "Escaneo del paciente", imagingTitle: "Espacio de trabajo de TC/RM y 3D",
    lessons: "Lecciones", lessonsTitle: "Lecciones clínicas interactivas",
    quizzes: "Cuestionarios", quizzesTitle: "Casos clínicos y cuestionarios",
    notes: "Notas", notesTitle: "Notas de estudio y marcadores",
    lightMode: "Cambiar a modo claro", darkMode: "Cambiar a modo oscuro", toggleTheme: "Cambiar tema",
    mute: "Silenciar efectos", unmute: "Activar efectos", toggleSound: "Sonido",
    allSystems: "Todos", filterSystems: "Filtrar órganos por sistema", primaryNav: "Navegación principal",
  },
  hi: {
    atlas: "3D शरीर एटलस", atlasTitle: "पूरे शरीर का 3D मानव एटलस",
    atelier: "अंग एटेलियर", atelierTitle: "अंग एटेलियर और विच्छेदन",
    clinical: "क्लिनिकल रीजनिंग", clinicalTitle: "इंटरैक्टिव 3D क्लिनिकल मामले",
    imaging: "रोगी स्कैन", imagingTitle: "रोगी-विशिष्ट सीटी/एमआरआई 3D वर्कस्पेस",
    lessons: "पाठ", lessonsTitle: "इंटरैक्टिव क्लिनिकल पाठ",
    quizzes: "क्विज़", quizzesTitle: "क्लिनिकल केस क्विज़",
    notes: "नोट्स", notesTitle: "अध्ययन नोट्स और बुकमार्क",
    lightMode: "लाइट मोड पर जाएँ", darkMode: "डार्क मोड पर जाएँ", toggleTheme: "थीम बदलें",
    mute: "ध्वनि बंद करें", unmute: "ध्वनि चालू करें", toggleSound: "ध्वनि",
    allSystems: "सभी", filterSystems: "तंत्र के अनुसार अंग छाँटें", primaryNav: "मुख्य नेविगेशन",
  },
  zh: {
    atlas: "3D 人体图谱", atlasTitle: "3D 全身人体图谱",
    atelier: "器官工作室", atelierTitle: "器官工作室与解剖",
    clinical: "临床推理", clinicalTitle: "交互式 3D 临床推理与病例",
    imaging: "患者扫描", imagingTitle: "患者专属 CT/MRI 与 3D 工作区",
    lessons: "课程", lessonsTitle: "互动临床课程",
    quizzes: "测验", quizzesTitle: "临床病例测验",
    notes: "笔记", notesTitle: "学习笔记与书签",
    lightMode: "切换到浅色模式", darkMode: "切换到深色模式", toggleTheme: "切换主题",
    mute: "静音", unmute: "取消静音", toggleSound: "声音",
    allSystems: "全部", filterSystems: "按系统筛选器官", primaryNav: "主导航",
  },
  ar: {
    atlas: "أطلس الجسم ثلاثي الأبعاد", atlasTitle: "أطلس ثلاثي الأبعاد لكامل الجسم",
    atelier: "مرسم الأعضاء", atelierTitle: "مرسم الأعضاء والتشريح",
    clinical: "التفكير السريري", clinicalTitle: "حل الحالات السريرية بالتشريح التفاعلي",
    imaging: "فحص المريض", imagingTitle: "مساحة عمل التصوير المقطعي والرنين ثلاثي الأبعاد للمريض",
    lessons: "الدروس", lessonsTitle: "دروس سريرية تفاعلية",
    quizzes: "الاختبارات", quizzesTitle: "اختبارات الحالات السريرية",
    notes: "الملاحظات", notesTitle: "ملاحظات الدراسة والإشارات",
    lightMode: "الوضع الفاتح", darkMode: "الوضع الداكن", toggleTheme: "تبديل السمة",
    mute: "كتم المؤثرات", unmute: "تشغيل المؤثرات", toggleSound: "الصوت",
    allSystems: "الكل", filterSystems: "تصفية الأعضاء حسب الجهاز", primaryNav: "التنقل الرئيسي",
  },
  pt: {
    atlas: "Atlas corporal 3D", atlasTitle: "Atlas humano 3D de corpo inteiro",
    atelier: "Ateliê de órgãos", atelierTitle: "Ateliê de órgãos e dissecação",
    clinical: "Raciocínio Clínico", clinicalTitle: "Casos de raciocínio clínico 3D",
    imaging: "Exame do Paciente", imagingTitle: "Espaço de TC/RM e 3D do paciente",
    lessons: "Aulas", lessonsTitle: "Aulas clínicas interativas",
    quizzes: "Quizzes", quizzesTitle: "Casos clínicos e quizzes",
    notes: "Notas", notesTitle: "Notas de estudo e favoritos",
    lightMode: "Mudar para modo claro", darkMode: "Mudar para modo escuro", toggleTheme: "Alternar tema",
    mute: "Silenciar efeitos", unmute: "Activar efeitos", toggleSound: "Som",
    allSystems: "Todos", filterSystems: "Filtrar órgãos por sistema", primaryNav: "Navegação principal",
  },
  fr: {
    atlas: "Atlas du corps 3D", atlasTitle: "Atlas humain 3D du corps entier",
    atelier: "Atelier des organes", atelierTitle: "Atelier des organes et dissection",
    clinical: "Raisonnement Clinique", clinicalTitle: "Cas cliniques 3D et raisonnement",
    imaging: "Imagerie Patient", imagingTitle: "Espace scanner/IRM et 3D spécifique au patient",
    lessons: "Leçons", lessonsTitle: "Leçons cliniques interactives",
    quizzes: "Quiz", quizzesTitle: "Cas cliniques et quiz",
    notes: "Notes", notesTitle: "Notes d’étude et favoris",
    lightMode: "Passer en mode clair", darkMode: "Passer en mode sombre", toggleTheme: "Changer de thème",
    mute: "Couper le son", unmute: "Activer le son", toggleSound: "Son",
    allSystems: "Tous", filterSystems: "Filtrar les organes par système", primaryNav: "Navigation principale",
  },
  de: {
    atlas: "3D-Körperatlas", atlasTitle: "3D-Ganzkörperatlas",
    atelier: "Organ-Atelier", atelierTitle: "Organ-Atelier & Präparation",
    clinical: "Klinisches Denken", clinicalTitle: "Interaktive 3D-Klinikfälle",
    imaging: "Patienten-Scan", imagingTitle: "Patientenspezifischer CT/MRT & 3D-Arbeitsbereich",
    lessons: "Lektionen", lessonsTitle: "Interaktive klinische Lektionen",
    quizzes: "Quiz", quizzesTitle: "Klinische Fall-Quiz",
    notes: "Notizen", notesTitle: "Lernnotizen & Lesezeichen",
    lightMode: "Zum hellen Modus", darkMode: "Zum dunklen Modus", toggleTheme: "Design wechseln",
    mute: "Ton aus", unmute: "Ton an", toggleSound: "Ton",
    allSystems: "Alle", filterSystems: "Organe nach System filtern", primaryNav: "Hauptnavigation",
  },
  ja: {
    atlas: "3D人体アトラス", atlasTitle: "3D全身人体アトラス",
    atelier: "臓器アトリエ", atelierTitle: "臓器アトリエと解剖",
    clinical: "臨床推論", clinicalTitle: "3Dインタラクティブ臨床推論",
    imaging: "患者スキャン", imagingTitle: "患者個別CT/MRI・3D医用画像ワークスペース",
    lessons: "レッスン", lessonsTitle: "インタラクティブ臨床レッスン",
    quizzes: "クイズ", quizzesTitle: "臨床症例クイズ",
    notes: "ノート", notesTitle: "学習ノートとブックマーク",
    lightMode: "ライトモードに切替", darkMode: "ダークモードに切替", toggleTheme: "テーマ切替",
    mute: "効果音をミュート", unmute: "効果音をオン", toggleSound: "サウンド",
    allSystems: "すべて", filterSystems: "系統で臓器を絞り込む", primaryNav: "メインナビゲーション",
  },
  ru: {
    atlas: "3D-атлас тела", atlasTitle: "3D-атлас всего тела человека",
    atelier: "Ателье органов", atelierTitle: "Ателье органов и препарирование",
    clinical: "Клиническое мышление", clinicalTitle: "Интерактивные клинические случаи 3D",
    imaging: "Снимок пациента", imagingTitle: "КТ/МРТ и 3D-визуализация пациента",
    lessons: "Уроки", lessonsTitle: "Интерактивные клинические уроки",
    quizzes: "Тесты", quizzesTitle: "Клинические случаи и тесты",
    notes: "Заметки", notesTitle: "Учебные заметки и закладки",
    lightMode: "Светлая тема", darkMode: "Тёмная тема", toggleTheme: "Сменить тему",
    mute: "Выключить звук", unmute: "Включить звук", toggleSound: "Звук",
    allSystems: "Все", filterSystems: "Фильтр органов по системам", primaryNav: "Основная навигация",
  },
  id: {
    atlas: "Atlas Tubuh 3D", atlasTitle: "Atlas manusia 3D seluruh tubuh",
    atelier: "Atelier Organ", atelierTitle: "Atelier organ & diseksi",
    clinical: "Penalaran Klinis", clinicalTitle: "Kasus penalaran klinis 3D",
    imaging: "Pemindaian Pasien", imagingTitle: "Ruang kerja CT/MRI & 3D pasien",
    lessons: "Pelajaran", lessonsTitle: "Pelajaran klinis interaktif",
    quizzes: "Kuis", quizzesTitle: "Kuis kasus klinis",
    notes: "Catatan", notesTitle: "Catatan belajar & penanda",
    lightMode: "Beralih ke mode terang", darkMode: "Beralih ke mode gelap", toggleTheme: "Ganti tema",
    mute: "Bisukan efek suara", unmute: "Aktifkan efek suara", toggleSound: "Suara",
    allSystems: "Semua", filterSystems: "Saring organ menurut sistem", primaryNav: "Navigasi utama",
  },
  ko: {
    atlas: "3D 인체 아틀라스", atlasTitle: "3D 전신 인체 아틀라스",
    atelier: "장기 아틀리에", atelierTitle: "장기 아틀리에 및 해부",
    clinical: "임상 추론", clinicalTitle: "3D 인터랙티브 임상 추론 사례",
    imaging: "환자 영상 스캔", imagingTitle: "환자 맞춤형 CT/MRI 및 3D 영상 워크스페이스",
    lessons: "강의", lessonsTitle: "인터랙티브 임상 강의",
    quizzes: "퀴즈", quizzesTitle: "임상 사례 퀴즈",
    notes: "노트", notesTitle: "학습 노트 및 북마크",
    lightMode: "라이트 모드로 전환", darkMode: "다크 모드로 전환", toggleTheme: "테마 전환",
    mute: "효과음 끄기", unmute: "효과음 켜기", toggleSound: "사운드",
    allSystems: "전체", filterSystems: "계통별 장기 필터", primaryNav: "주 메뉴",
  },
};

export function getShellText(locale: string): ShellText {
  return shell[locale] ?? en;
}
