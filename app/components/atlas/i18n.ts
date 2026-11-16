/** Interface language. Anatomical names and descriptions are translated
 * separately, in `terms-ar.json` and `anatomy-ar.ts`, because they come from
 * sources with their own provenance rather than from this file.
 *
 * The atlas follows the platform-wide locale (12 languages). English and
 * Arabic are complete; the other locales translate the visible interface and
 * fall back to English for anything not yet translated. */
export type Language = 'en'|'ar'|'es'|'hi'|'zh'|'pt'|'fr'|'de'|'ja'|'ru'|'id'|'ko';
export const LANGUAGES:{id:Language;label:string;direction:'ltr'|'rtl'}[] = [
 {id:'en',label:'English',direction:'ltr'},
 {id:'ar',label:'العربية',direction:'rtl'},
 {id:'es',label:'Español',direction:'ltr'},
 {id:'hi',label:'हिन्दी',direction:'ltr'},
 {id:'zh',label:'中文',direction:'ltr'},
 {id:'pt',label:'Português',direction:'ltr'},
 {id:'fr',label:'Français',direction:'ltr'},
 {id:'de',label:'Deutsch',direction:'ltr'},
 {id:'ja',label:'日本語',direction:'ltr'},
 {id:'ru',label:'Русский',direction:'ltr'},
 {id:'id',label:'Indonesia',direction:'ltr'},
 {id:'ko',label:'한국어',direction:'ltr'},
];
export const isLanguage = (code:string):code is Language => LANGUAGES.some(l=>l.id===code);
export const direction = (language:Language) => LANGUAGES.find(l=>l.id===language)?.direction ?? 'ltr';

/** Every piece of interface text, in both languages. */
const TEXT = {
 title:{en:'Human Atlas',ar:'أطلس الجسم البشري'},
 eyebrow:{en:'INTERACTIVE ANATOMY',ar:'تشريح تفاعلي'},
 pieces:{en:'modeled pieces',ar:'قطعة مُجسَّمة'},
 referenceBody:{en:'reference body',ar:'الجسم المرجعي'},
 referenceBodyLabel:{en:'Reference body',ar:'الجسم المرجعي'},
 language:{en:'Language',ar:'اللغة'},

 findStructure:{en:'Find a structure',ar:'ابحث عن تركيب'},
 searchAnatomy:{en:'Search anatomy',ar:'البحث في التشريح'},
 findAnatomy:{en:'Find anatomy',ar:'البحث في التشريح'},
 searchNamed:{en:'Search named anatomical structures',ar:'ابحث في التراكيب التشريحية المسماة'},
 searchPlaceholder:{en:'Heart, femur, cranial nerve…',ar:'قلب، عظم الفخذ، عصب قحفي…'},
 closeSearch:{en:'Close search',ar:'إغلاق البحث'},
 noMatches:{en:'No structures match your search.',ar:'لا توجد تراكيب مطابقة لبحثك.'},
 searchHintEmpty:{en:'Start with a major organ, or search every named structure.',ar:'ابدأ بعضو رئيسي، أو ابحث في كل تركيب مسمى.'},
 searchHintTyping:{en:'Showing up to 80 matches. Refine your search to find smaller structures.',ar:'يُعرض حتى ٨٠ نتيجة. ضيّق بحثك للوصول إلى التراكيب الأصغر.'},
 piece:{en:'piece',ar:'قطعة'},
 pieces_plural:{en:'pieces',ar:'قطعة'},

 systems:{en:'Systems',ar:'الأجهزة'},
 anatomicalLayers:{en:'Anatomical layers',ar:'الطبقات التشريحية'},
 openLayers:{en:'Open system layers',ar:'فتح طبقات الأجهزة'},
 closeSystems:{en:'Close systems',ar:'إغلاق الأجهزة'},
 presetAll:{en:'All',ar:'الكل'},
 presetSkeleton:{en:'Skeleton',ar:'الهيكل'},
 presetOrgans:{en:'Organs',ar:'الأعضاء'},
 showOnly:{en:'Show only',ar:'إظهار فقط'},
 show:{en:'Show',ar:'إظهار'},
 piecesVisible:{en:'pieces visible',ar:'قطعة ظاهرة'},
 hideAll:{en:'Hide all',ar:'إخفاء الكل'},

 cameraControls:{en:'Camera controls',ar:'التحكم في الكاميرا'},
 explorerPanels:{en:'Explorer panels',ar:'لوحات المستكشف'},
 viewThreeQuarter:{en:'three-quarter view',ar:'منظور ثلاثة أرباع'},
 viewFront:{en:'front view',ar:'منظور أمامي'},
 viewSide:{en:'side view',ar:'منظور جانبي'},
 viewBack:{en:'back view',ar:'منظور خلفي'},
 autoRotate:{en:'Auto rotate',ar:'دوران تلقائي'},
 rotateBody:{en:'Rotate body',ar:'تدوير الجسم'},
 pauseRotation:{en:'Pause rotation',ar:'إيقاف الدوران'},
 reset:{en:'Reset',ar:'إعادة'},
 resetView:{en:'Reset view and layers',ar:'إعادة ضبط المنظور والطبقات'},
 assembleReset:{en:'Assemble and reset',ar:'إعادة التجميع'},

 explode:{en:'Explode anatomy',ar:'تفكيك التشريح'},
 assembled:{en:'Assembled',ar:'مُجمَّع'},
 everyPiece:{en:'Every piece',ar:'كل قطعة'},
 inventory:{en:'ANATOMICAL INVENTORY',ar:'جرد تشريحي'},
 separated:{en:'SEPARATED STRUCTURES',ar:'تراكيب مفصولة'},
 selectedStructure:{en:'SELECTED STRUCTURE',ar:'التركيب المحدد'},

 dragToOrbit:{en:'Drag to orbit',ar:'اسحب للدوران'},
 dragToPan:{en:'Drag to pan',ar:'اسحب للتحريك'},
 pinchToZoom:{en:'Pinch to zoom',ar:'اقرص للتكبير'},
 tapToInspect:{en:'Tap to inspect',ar:'انقر للفحص'},

 anatomy:{en:'ANATOMY',ar:'تشريح'},
 atlasReference:{en:'Atlas reference',ar:'مرجع الأطلس'},
 selectedPieces:{en:'Selected pieces',ar:'القطع المحددة'},
 includedStructures:{en:'Included structures',ar:'التراكيب المتضمنة'},
 andMore:{en:'more modeled pieces.',ar:'قطعة مُجسَّمة أخرى.'},
 and:{en:'And',ar:'و'},
 systemOverview:{en:'System overview · structure identified from source anatomy',ar:'نظرة عامة على الجهاز · التركيب محدد من التشريح المصدر'},
 isolate:{en:'Isolate structure',ar:'عزل التركيب'},
 showSurrounding:{en:'Show surrounding anatomy',ar:'إظهار التشريح المحيط'},
 clearSelection:{en:'Clear selection',ar:'إلغاء التحديد'},
 viewSource:{en:'View anatomical source',ar:'عرض المصدر التشريحي'},

 aboutThisAtlas:{en:'About this atlas',ar:'عن هذا الأطلس'},
 sourceScope:{en:'SOURCE & SCOPE',ar:'المصدر والنطاق'},
 aboutTitle:{en:'A body, revealed.',ar:'جسدٌ مكشوف.'},
 aboutIntro:{en:'Explore the adult',ar:'استكشف التشريح المرجعي للبالغ'},
 aboutIntroFrom:{en:'reference anatomy from',ar:'من'},
 shared:{en:'The two reference bodies come from different projects, so their coverage and level of detail differ. Neither contains every human structure or variation. Named concepts can contain multiple pieces; each source mesh is rendered once.',
        ar:'الجسمان المرجعيان من مشروعين مختلفين، فتغطيتهما ومستوى تفصيلهما مختلفان. ولا أحدهما يحوي كل تركيب أو تنوع بشري. المفهوم المسمى قد يضم عدة قطع، وكل شبكة مصدرية تُرسم مرة واحدة.'},
 caveat:{en:'Colors and system groupings are designed for exploration. The geometry is simplified for the web, and short explanations provide general educational context. This is an anatomical reference, not a diagnostic or surgical tool.',
        ar:'الألوان وتجميع الأجهزة مصممة للاستكشاف. الهندسة مبسطة للويب، والشروح القصيرة تقدم سياقًا تعليميًا عامًا. هذا مرجع تشريحي، وليس أداة تشخيص أو جراحة.'},
 sourceHeading:{en:'Source',ar:'المصدر'},
 datasetLicense:{en:'Dataset license',ar:'رخصة البيانات'},
 originalGeometry:{en:'Original geometry & metadata',ar:'الهندسة الأصلية والبيانات الوصفية'},
 readPublication:{en:'Read the source publication',ar:'اقرأ البحث المنشور'},
 sourceCredits:{en:'Source & credits',ar:'المصدر والاعتمادات'},

 preparing:{en:'Preparing the anatomy',ar:'جارٍ تحضير التشريح'},
 loadingBody:{en:'Loading',ar:'تحميل'},
 reference:{en:'reference anatomy',ar:'التشريح المرجعي'},
 reloadViewer:{en:'Reload viewer',ar:'إعادة تحميل العارض'},
 catalogueError:{en:'The anatomy catalogue could not be loaded.',ar:'تعذر تحميل فهرس التشريح.'},

 organAtelier:{en:'Organ Atelier',ar:'مرسم الأعضاء'},
 switchToAtelier:{en:'Switch to Organ Atelier',ar:'الانتقال إلى مرسم الأعضاء'},
 playTour:{en:'Play 3D animation tour',ar:'تشغيل جولة الرسوم ثلاثية الأبعاد'},
 pauseTour:{en:'Pause animation tour',ar:'إيقاف الجولة'},
 deepDive:{en:'Deep dive in Atelier',ar:'استكشاف معمّق في المرسم'},
 fullscreen:{en:'Fullscreen',ar:'ملء الشاشة'},
 exitFullscreen:{en:'Exit fullscreen',ar:'الخروج من ملء الشاشة'},
} as const;

export type Phrase = keyof typeof TEXT;

type Overrides = Partial<Record<Phrase,string>>;

/** Interface translations for the remaining platform locales. Any phrase not
 *  listed falls back to English, so the atlas never shows an empty label. */
const EXTRA: Partial<Record<Language, Overrides>> = {
 es:{
  title:'Atlas humano',eyebrow:'ANATOMÍA INTERACTIVA',pieces:'piezas modeladas',referenceBody:'cuerpo de referencia',referenceBodyLabel:'Cuerpo de referencia',language:'Idioma',
  findStructure:'Buscar una estructura',searchAnatomy:'Buscar anatomía',findAnatomy:'Buscar anatomía',searchNamed:'Buscar estructuras anatómicas',searchPlaceholder:'Corazón, fémur, nervio craneal…',closeSearch:'Cerrar búsqueda',noMatches:'Ninguna estructura coincide con tu búsqueda.',searchHintEmpty:'Empieza con un órgano principal o busca cualquier estructura.',searchHintTyping:'Mostrando hasta 80 resultados. Afina la búsqueda para estructuras más pequeñas.',piece:'pieza',pieces_plural:'piezas',
  systems:'Sistemas',anatomicalLayers:'Capas anatómicas',openLayers:'Abrir capas',closeSystems:'Cerrar sistemas',presetAll:'Todo',presetSkeleton:'Esqueleto',presetOrgans:'Órganos',showOnly:'Mostrar solo',show:'Mostrar',piecesVisible:'piezas visibles',hideAll:'Ocultar todo',
  cameraControls:'Controles de cámara',explorerPanels:'Paneles del explorador',viewThreeQuarter:'vista tres cuartos',viewFront:'vista frontal',viewSide:'vista lateral',viewBack:'vista posterior',autoRotate:'Rotación automática',rotateBody:'Rotar cuerpo',pauseRotation:'Pausar rotación',reset:'Restablecer',resetView:'Restablecer vista y capas',assembleReset:'Ensamblar y restablecer',
  explode:'Despiece anatómico',assembled:'Ensamblado',everyPiece:'Cada pieza',inventory:'INVENTARIO ANATÓMICO',separated:'ESTRUCTURAS SEPARADAS',selectedStructure:'ESTRUCTURA SELECCIONADA',
  dragToOrbit:'Arrastra para orbitar',dragToPan:'Arrastra para desplazar',pinchToZoom:'Pellizca para ampliar',tapToInspect:'Toca para inspeccionar',
  anatomy:'ANATOMÍA',atlasReference:'Referencia del atlas',selectedPieces:'Piezas seleccionadas',includedStructures:'Estructuras incluidas',andMore:'piezas modeladas más.',and:'Y',isolate:'Aislar estructura',showSurrounding:'Mostrar anatomía circundante',clearSelection:'Borrar selección',viewSource:'Ver fuente anatómica',
  aboutThisAtlas:'Acerca de este atlas',sourceScope:'FUENTE Y ALCANCE',aboutTitle:'Un cuerpo, revelado.',sourceHeading:'Fuente',datasetLicense:'Licencia del conjunto de datos',sourceCredits:'Fuente y créditos',
  preparing:'Preparando la anatomía',loadingBody:'Cargando',reference:'anatomía de referencia',reloadViewer:'Recargar visor',catalogueError:'No se pudo cargar el catálogo anatómico.',
  organAtelier:'Taller de órganos',switchToAtelier:'Ir al Taller de órganos',playTour:'Reproducir recorrido 3D',pauseTour:'Pausar recorrido',deepDive:'Explorar en el Taller',fullscreen:'Pantalla completa',exitFullscreen:'Salir de pantalla completa',
 },
 hi:{
  title:'मानव एटलस',eyebrow:'इंटरैक्टिव शरीर रचना',pieces:'मॉडल किए गए भाग',referenceBody:'संदर्भ शरीर',referenceBodyLabel:'संदर्भ शरीर',language:'भाषा',
  findStructure:'संरचना खोजें',searchAnatomy:'शरीर रचना खोजें',findAnatomy:'शरीर रचना खोजें',searchNamed:'नामित संरचनाएँ खोजें',searchPlaceholder:'हृदय, फीमर, कपाल तंत्रिका…',closeSearch:'खोज बंद करें',noMatches:'आपकी खोज से कोई संरचना मेल नहीं खाती।',searchHintEmpty:'किसी मुख्य अंग से शुरू करें, या कोई भी संरचना खोजें।',searchHintTyping:'80 परिणाम तक दिखाए जा रहे हैं। छोटी संरचनाओं के लिए खोज सीमित करें।',piece:'भाग',pieces_plural:'भाग',
  systems:'तंत्र',anatomicalLayers:'शारीरिक परतें',openLayers:'परतें खोलें',closeSystems:'तंत्र बंद करें',presetAll:'सभी',presetSkeleton:'कंकाल',presetOrgans:'अंग',showOnly:'केवल दिखाएँ',show:'दिखाएँ',piecesVisible:'भाग दिखाई दे रहे हैं',hideAll:'सभी छिपाएँ',
  cameraControls:'कैमरा नियंत्रण',explorerPanels:'एक्सप्लोरर पैनल',viewThreeQuarter:'तीन-चौथाई दृश्य',viewFront:'सामने का दृश्य',viewSide:'बगल का दृश्य',viewBack:'पीछे का दृश्य',autoRotate:'स्वतः घुमाएँ',rotateBody:'शरीर घुमाएँ',pauseRotation:'घूमना रोकें',reset:'रीसेट',resetView:'दृश्य और परतें रीसेट करें',assembleReset:'जोड़ें और रीसेट करें',
  explode:'शरीर रचना अलग करें',assembled:'जुड़ा हुआ',everyPiece:'हर भाग',inventory:'शारीरिक सूची',separated:'अलग संरचनाएँ',selectedStructure:'चयनित संरचना',
  dragToOrbit:'घुमाने के लिए खींचें',dragToPan:'सरकाने के लिए खींचें',pinchToZoom:'ज़ूम के लिए पिंच करें',tapToInspect:'जाँचने के लिए टैप करें',
  anatomy:'शरीर रचना',atlasReference:'एटलस संदर्भ',selectedPieces:'चयनित भाग',includedStructures:'शामिल संरचनाएँ',andMore:'और मॉडल किए गए भाग।',and:'और',isolate:'संरचना अलग करें',showSurrounding:'आसपास की संरचना दिखाएँ',clearSelection:'चयन हटाएँ',viewSource:'स्रोत देखें',
  aboutThisAtlas:'इस एटलस के बारे में',sourceScope:'स्रोत और दायरा',aboutTitle:'एक शरीर, प्रकट।',sourceHeading:'स्रोत',datasetLicense:'डेटासेट लाइसेंस',sourceCredits:'स्रोत और श्रेय',
  preparing:'शरीर रचना तैयार हो रही है',loadingBody:'लोड हो रहा है',reference:'संदर्भ शरीर रचना',reloadViewer:'व्यूअर फिर से लोड करें',catalogueError:'शरीर रचना सूची लोड नहीं हो सकी।',
  organAtelier:'अंग एटेलियर',switchToAtelier:'अंग एटेलियर पर जाएँ',playTour:'3D एनिमेशन टूर चलाएँ',pauseTour:'टूर रोकें',deepDive:'एटेलियर में विस्तार से देखें',fullscreen:'पूर्ण स्क्रीन',exitFullscreen:'पूर्ण स्क्रीन से बाहर',
 },
 zh:{
  title:'人体图谱',eyebrow:'交互式解剖',pieces:'个模型部件',referenceBody:'参考人体',referenceBodyLabel:'参考人体',language:'语言',
  findStructure:'查找结构',searchAnatomy:'搜索解剖',findAnatomy:'搜索解剖',searchNamed:'搜索已命名的解剖结构',searchPlaceholder:'心脏、股骨、颅神经…',closeSearch:'关闭搜索',noMatches:'没有匹配的结构。',searchHintEmpty:'从主要器官开始，或搜索任意结构。',searchHintTyping:'最多显示 80 个结果。请细化搜索以查找更小的结构。',piece:'个部件',pieces_plural:'个部件',
  systems:'系统',anatomicalLayers:'解剖层',openLayers:'打开系统层',closeSystems:'关闭系统',presetAll:'全部',presetSkeleton:'骨骼',presetOrgans:'器官',showOnly:'仅显示',show:'显示',piecesVisible:'个部件可见',hideAll:'全部隐藏',
  cameraControls:'相机控制',explorerPanels:'浏览面板',viewThreeQuarter:'四分之三视图',viewFront:'正视图',viewSide:'侧视图',viewBack:'后视图',autoRotate:'自动旋转',rotateBody:'旋转人体',pauseRotation:'暂停旋转',reset:'重置',resetView:'重置视图和图层',assembleReset:'组装并重置',
  explode:'分解解剖',assembled:'已组装',everyPiece:'所有部件',inventory:'解剖清单',separated:'分离结构',selectedStructure:'已选结构',
  dragToOrbit:'拖动旋转',dragToPan:'拖动平移',pinchToZoom:'双指缩放',tapToInspect:'点击查看',
  anatomy:'解剖',atlasReference:'图谱编号',selectedPieces:'已选部件',includedStructures:'包含的结构',andMore:'个其他模型部件。',and:'以及',isolate:'隔离结构',showSurrounding:'显示周围解剖',clearSelection:'清除选择',viewSource:'查看解剖来源',
  aboutThisAtlas:'关于本图谱',sourceScope:'来源与范围',aboutTitle:'人体，一览无余。',sourceHeading:'来源',datasetLicense:'数据集许可',sourceCredits:'来源与致谢',
  preparing:'正在准备解剖模型',loadingBody:'正在加载',reference:'参考解剖',reloadViewer:'重新加载',catalogueError:'无法加载解剖目录。',
  organAtelier:'器官工作室',switchToAtelier:'切换到器官工作室',playTour:'播放 3D 动画导览',pauseTour:'暂停导览',deepDive:'在工作室中深入了解',fullscreen:'全屏',exitFullscreen:'退出全屏',
 },
 pt:{
  title:'Atlas humano',eyebrow:'ANATOMIA INTERATIVA',pieces:'peças modeladas',referenceBody:'corpo de referência',referenceBodyLabel:'Corpo de referência',language:'Idioma',
  findStructure:'Encontrar estrutura',searchAnatomy:'Pesquisar anatomia',findAnatomy:'Pesquisar anatomia',searchNamed:'Pesquisar estruturas anatômicas',searchPlaceholder:'Coração, fêmur, nervo craniano…',closeSearch:'Fechar pesquisa',noMatches:'Nenhuma estrutura corresponde à pesquisa.',searchHintEmpty:'Comece por um órgão principal ou pesquise qualquer estrutura.',searchHintTyping:'Mostrando até 80 resultados. Refine para estruturas menores.',piece:'peça',pieces_plural:'peças',
  systems:'Sistemas',anatomicalLayers:'Camadas anatômicas',openLayers:'Abrir camadas',closeSystems:'Fechar sistemas',presetAll:'Tudo',presetSkeleton:'Esqueleto',presetOrgans:'Órgãos',showOnly:'Mostrar apenas',show:'Mostrar',piecesVisible:'peças visíveis',hideAll:'Ocultar tudo',
  cameraControls:'Controles da câmera',explorerPanels:'Painéis do explorador',viewThreeQuarter:'vista três quartos',viewFront:'vista frontal',viewSide:'vista lateral',viewBack:'vista posterior',autoRotate:'Rotação automática',rotateBody:'Girar corpo',pauseRotation:'Pausar rotação',reset:'Redefinir',resetView:'Redefinir vista e camadas',assembleReset:'Montar e redefinir',
  explode:'Explodir anatomia',assembled:'Montado',everyPiece:'Cada peça',inventory:'INVENTÁRIO ANATÔMICO',separated:'ESTRUTURAS SEPARADAS',selectedStructure:'ESTRUTURA SELECIONADA',
  dragToOrbit:'Arraste para orbitar',dragToPan:'Arraste para mover',pinchToZoom:'Pince para ampliar',tapToInspect:'Toque para inspecionar',
  anatomy:'ANATOMIA',atlasReference:'Referência do atlas',selectedPieces:'Peças selecionadas',includedStructures:'Estruturas incluídas',andMore:'outras peças modeladas.',and:'E',isolate:'Isolar estrutura',showSurrounding:'Mostrar anatomia ao redor',clearSelection:'Limpar seleção',viewSource:'Ver fonte anatômica',
  aboutThisAtlas:'Sobre este atlas',sourceScope:'FONTE E ESCOPO',aboutTitle:'Um corpo, revelado.',sourceHeading:'Fonte',datasetLicense:'Licença do conjunto de dados',sourceCredits:'Fonte e créditos',
  preparing:'Preparando a anatomia',loadingBody:'Carregando',reference:'anatomia de referência',reloadViewer:'Recarregar visualizador',catalogueError:'Não foi possível carregar o catálogo anatômico.',
  organAtelier:'Ateliê de órgãos',switchToAtelier:'Ir para o Ateliê de órgãos',playTour:'Reproduzir tour 3D',pauseTour:'Pausar tour',deepDive:'Aprofundar no Ateliê',fullscreen:'Tela cheia',exitFullscreen:'Sair da tela cheia',
 },
 fr:{
  title:'Atlas humain',eyebrow:'ANATOMIE INTERACTIVE',pieces:'pièces modélisées',referenceBody:'corps de référence',referenceBodyLabel:'Corps de référence',language:'Langue',
  findStructure:'Trouver une structure',searchAnatomy:'Rechercher',findAnatomy:'Rechercher',searchNamed:'Rechercher des structures anatomiques',searchPlaceholder:'Cœur, fémur, nerf crânien…',closeSearch:'Fermer la recherche',noMatches:'Aucune structure ne correspond.',searchHintEmpty:'Commencez par un organe majeur ou recherchez une structure.',searchHintTyping:'Jusqu’à 80 résultats. Affinez pour les petites structures.',piece:'pièce',pieces_plural:'pièces',
  systems:'Systèmes',anatomicalLayers:'Couches anatomiques',openLayers:'Ouvrir les couches',closeSystems:'Fermer les systèmes',presetAll:'Tout',presetSkeleton:'Squelette',presetOrgans:'Organes',showOnly:'Afficher seulement',show:'Afficher',piecesVisible:'pièces visibles',hideAll:'Tout masquer',
  cameraControls:'Contrôles caméra',explorerPanels:'Panneaux',viewThreeQuarter:'vue trois-quarts',viewFront:'vue de face',viewSide:'vue de profil',viewBack:'vue de dos',autoRotate:'Rotation auto',rotateBody:'Faire pivoter',pauseRotation:'Pause rotation',reset:'Réinitialiser',resetView:'Réinitialiser vue et couches',assembleReset:'Assembler et réinitialiser',
  explode:'Éclater l’anatomie',assembled:'Assemblé',everyPiece:'Chaque pièce',inventory:'INVENTAIRE ANATOMIQUE',separated:'STRUCTURES SÉPARÉES',selectedStructure:'STRUCTURE SÉLECTIONNÉE',
  dragToOrbit:'Glisser pour pivoter',dragToPan:'Glisser pour déplacer',pinchToZoom:'Pincer pour zoomer',tapToInspect:'Toucher pour inspecter',
  anatomy:'ANATOMIE',atlasReference:'Référence atlas',selectedPieces:'Pièces sélectionnées',includedStructures:'Structures incluses',andMore:'autres pièces modélisées.',and:'Et',isolate:'Isoler la structure',showSurrounding:'Afficher l’anatomie voisine',clearSelection:'Effacer la sélection',viewSource:'Voir la source',
  aboutThisAtlas:'À propos de cet atlas',sourceScope:'SOURCE ET PORTÉE',aboutTitle:'Un corps, révélé.',sourceHeading:'Source',datasetLicense:'Licence des données',sourceCredits:'Source et crédits',
  preparing:'Préparation de l’anatomie',loadingBody:'Chargement',reference:'anatomie de référence',reloadViewer:'Recharger',catalogueError:'Impossible de charger le catalogue anatomique.',
  organAtelier:'Atelier des organes',switchToAtelier:'Aller à l’Atelier des organes',playTour:'Lancer la visite 3D',pauseTour:'Mettre en pause',deepDive:'Approfondir dans l’Atelier',fullscreen:'Plein écran',exitFullscreen:'Quitter le plein écran',
 },
 de:{
  title:'Menschlicher Atlas',eyebrow:'INTERAKTIVE ANATOMIE',pieces:'modellierte Teile',referenceBody:'Referenzkörper',referenceBodyLabel:'Referenzkörper',language:'Sprache',
  findStructure:'Struktur finden',searchAnatomy:'Anatomie suchen',findAnatomy:'Anatomie suchen',searchNamed:'Benannte Strukturen suchen',searchPlaceholder:'Herz, Femur, Hirnnerv…',closeSearch:'Suche schließen',noMatches:'Keine passenden Strukturen.',searchHintEmpty:'Beginnen Sie mit einem Hauptorgan oder suchen Sie eine Struktur.',searchHintTyping:'Bis zu 80 Treffer. Verfeinern Sie die Suche.',piece:'Teil',pieces_plural:'Teile',
  systems:'Systeme',anatomicalLayers:'Anatomische Schichten',openLayers:'Schichten öffnen',closeSystems:'Systeme schließen',presetAll:'Alle',presetSkeleton:'Skelett',presetOrgans:'Organe',showOnly:'Nur anzeigen',show:'Anzeigen',piecesVisible:'Teile sichtbar',hideAll:'Alle ausblenden',
  cameraControls:'Kamerasteuerung',explorerPanels:'Explorer-Bereiche',viewThreeQuarter:'Dreiviertelansicht',viewFront:'Vorderansicht',viewSide:'Seitenansicht',viewBack:'Rückansicht',autoRotate:'Automatisch drehen',rotateBody:'Körper drehen',pauseRotation:'Drehung pausieren',reset:'Zurücksetzen',resetView:'Ansicht und Schichten zurücksetzen',assembleReset:'Zusammensetzen',
  explode:'Anatomie zerlegen',assembled:'Zusammengesetzt',everyPiece:'Jedes Teil',inventory:'ANATOMISCHES INVENTAR',separated:'GETRENNTE STRUKTUREN',selectedStructure:'AUSGEWÄHLTE STRUKTUR',
  dragToOrbit:'Ziehen zum Drehen',dragToPan:'Ziehen zum Verschieben',pinchToZoom:'Zum Zoomen kneifen',tapToInspect:'Tippen zum Ansehen',
  anatomy:'ANATOMIE',atlasReference:'Atlas-Referenz',selectedPieces:'Ausgewählte Teile',includedStructures:'Enthaltene Strukturen',andMore:'weitere modellierte Teile.',and:'Und',isolate:'Struktur isolieren',showSurrounding:'Umgebung anzeigen',clearSelection:'Auswahl löschen',viewSource:'Quelle ansehen',
  aboutThisAtlas:'Über diesen Atlas',sourceScope:'QUELLE & UMFANG',aboutTitle:'Ein Körper, enthüllt.',sourceHeading:'Quelle',datasetLicense:'Datensatzlizenz',sourceCredits:'Quelle & Danksagung',
  preparing:'Anatomie wird vorbereitet',loadingBody:'Lädt',reference:'Referenzanatomie',reloadViewer:'Neu laden',catalogueError:'Der Anatomiekatalog konnte nicht geladen werden.',
  organAtelier:'Organ-Atelier',switchToAtelier:'Zum Organ-Atelier',playTour:'3D-Animationstour abspielen',pauseTour:'Tour pausieren',deepDive:'Im Atelier vertiefen',fullscreen:'Vollbild',exitFullscreen:'Vollbild beenden',
 },
 ja:{
  title:'人体アトラス',eyebrow:'インタラクティブ解剖学',pieces:'モデルパーツ',referenceBody:'参照ボディ',referenceBodyLabel:'参照ボディ',language:'言語',
  findStructure:'構造を検索',searchAnatomy:'解剖を検索',findAnatomy:'解剖を検索',searchNamed:'名前付き構造を検索',searchPlaceholder:'心臓、大腿骨、脳神経…',closeSearch:'検索を閉じる',noMatches:'一致する構造はありません。',searchHintEmpty:'主要な臓器から始めるか、構造を検索してください。',searchHintTyping:'最大80件を表示中。より小さな構造は絞り込んでください。',piece:'パーツ',pieces_plural:'パーツ',
  systems:'系統',anatomicalLayers:'解剖レイヤー',openLayers:'レイヤーを開く',closeSystems:'系統を閉じる',presetAll:'すべて',presetSkeleton:'骨格',presetOrgans:'臓器',showOnly:'これだけ表示',show:'表示',piecesVisible:'パーツ表示中',hideAll:'すべて非表示',
  cameraControls:'カメラ操作',explorerPanels:'エクスプローラー',viewThreeQuarter:'斜め前方',viewFront:'正面',viewSide:'側面',viewBack:'背面',autoRotate:'自動回転',rotateBody:'回転',pauseRotation:'回転を停止',reset:'リセット',resetView:'表示とレイヤーをリセット',assembleReset:'組み立ててリセット',
  explode:'分解表示',assembled:'組み立て',everyPiece:'全パーツ',inventory:'解剖インベントリ',separated:'分離された構造',selectedStructure:'選択した構造',
  dragToOrbit:'ドラッグで回転',dragToPan:'ドラッグで移動',pinchToZoom:'ピンチでズーム',tapToInspect:'タップで詳細',
  anatomy:'解剖',atlasReference:'アトラス参照',selectedPieces:'選択パーツ',includedStructures:'含まれる構造',andMore:'個のその他パーツ。',and:'ほか',isolate:'構造を分離',showSurrounding:'周囲を表示',clearSelection:'選択解除',viewSource:'出典を見る',
  aboutThisAtlas:'このアトラスについて',sourceScope:'出典と範囲',aboutTitle:'人体を、あらわに。',sourceHeading:'出典',datasetLicense:'データライセンス',sourceCredits:'出典とクレジット',
  preparing:'解剖を準備中',loadingBody:'読み込み中',reference:'参照解剖',reloadViewer:'再読み込み',catalogueError:'解剖カタログを読み込めませんでした。',
  organAtelier:'臓器アトリエ',switchToAtelier:'臓器アトリエへ',playTour:'3Dアニメーションツアーを再生',pauseTour:'ツアーを一時停止',deepDive:'アトリエで詳しく見る',fullscreen:'全画面',exitFullscreen:'全画面を終了',
 },
 ru:{
  title:'Атлас человека',eyebrow:'ИНТЕРАКТИВНАЯ АНАТОМИЯ',pieces:'смоделированных частей',referenceBody:'эталонное тело',referenceBodyLabel:'Эталонное тело',language:'Язык',
  findStructure:'Найти структуру',searchAnatomy:'Поиск по анатомии',findAnatomy:'Поиск по анатомии',searchNamed:'Поиск анатомических структур',searchPlaceholder:'Сердце, бедренная кость, черепной нерв…',closeSearch:'Закрыть поиск',noMatches:'Совпадений не найдено.',searchHintEmpty:'Начните с крупного органа или найдите любую структуру.',searchHintTyping:'Показано до 80 результатов. Уточните запрос.',piece:'часть',pieces_plural:'частей',
  systems:'Системы',anatomicalLayers:'Анатомические слои',openLayers:'Открыть слои',closeSystems:'Закрыть системы',presetAll:'Все',presetSkeleton:'Скелет',presetOrgans:'Органы',showOnly:'Показать только',show:'Показать',piecesVisible:'частей видно',hideAll:'Скрыть все',
  cameraControls:'Управление камерой',explorerPanels:'Панели',viewThreeQuarter:'вид три четверти',viewFront:'вид спереди',viewSide:'вид сбоку',viewBack:'вид сзади',autoRotate:'Автовращение',rotateBody:'Вращать тело',pauseRotation:'Остановить вращение',reset:'Сброс',resetView:'Сбросить вид и слои',assembleReset:'Собрать и сбросить',
  explode:'Разобрать анатомию',assembled:'Собрано',everyPiece:'Каждая часть',inventory:'АНАТОМИЧЕСКИЙ ПЕРЕЧЕНЬ',separated:'РАЗДЕЛЁННЫЕ СТРУКТУРЫ',selectedStructure:'ВЫБРАННАЯ СТРУКТУРА',
  dragToOrbit:'Тяните для вращения',dragToPan:'Тяните для сдвига',pinchToZoom:'Сведите пальцы для масштаба',tapToInspect:'Нажмите для просмотра',
  anatomy:'АНАТОМИЯ',atlasReference:'Код атласа',selectedPieces:'Выбранные части',includedStructures:'Входящие структуры',andMore:'других частей.',and:'И ещё',isolate:'Изолировать структуру',showSurrounding:'Показать окружение',clearSelection:'Снять выделение',viewSource:'Открыть источник',
  aboutThisAtlas:'Об атласе',sourceScope:'ИСТОЧНИК И ОХВАТ',aboutTitle:'Тело, раскрытое.',sourceHeading:'Источник',datasetLicense:'Лицензия данных',sourceCredits:'Источник и авторы',
  preparing:'Подготовка анатомии',loadingBody:'Загрузка',reference:'эталонной анатомии',reloadViewer:'Перезагрузить',catalogueError:'Не удалось загрузить анатомический каталог.',
  organAtelier:'Ателье органов',switchToAtelier:'Перейти в Ателье органов',playTour:'Запустить 3D-тур',pauseTour:'Пауза',deepDive:'Подробно в Ателье',fullscreen:'Полный экран',exitFullscreen:'Выйти из полноэкранного режима',
 },
 id:{
  title:'Atlas Manusia',eyebrow:'ANATOMI INTERAKTIF',pieces:'bagian model',referenceBody:'tubuh referensi',referenceBodyLabel:'Tubuh referensi',language:'Bahasa',
  findStructure:'Cari struktur',searchAnatomy:'Cari anatomi',findAnatomy:'Cari anatomi',searchNamed:'Cari struktur anatomi',searchPlaceholder:'Jantung, femur, saraf kranial…',closeSearch:'Tutup pencarian',noMatches:'Tidak ada struktur yang cocok.',searchHintEmpty:'Mulai dari organ utama, atau cari struktur apa pun.',searchHintTyping:'Menampilkan hingga 80 hasil. Persempit pencarian.',piece:'bagian',pieces_plural:'bagian',
  systems:'Sistem',anatomicalLayers:'Lapisan anatomi',openLayers:'Buka lapisan',closeSystems:'Tutup sistem',presetAll:'Semua',presetSkeleton:'Kerangka',presetOrgans:'Organ',showOnly:'Tampilkan saja',show:'Tampilkan',piecesVisible:'bagian terlihat',hideAll:'Sembunyikan semua',
  cameraControls:'Kontrol kamera',explorerPanels:'Panel penjelajah',viewThreeQuarter:'tampak tiga perempat',viewFront:'tampak depan',viewSide:'tampak samping',viewBack:'tampak belakang',autoRotate:'Putar otomatis',rotateBody:'Putar tubuh',pauseRotation:'Jeda putaran',reset:'Atur ulang',resetView:'Atur ulang tampilan',assembleReset:'Rakit dan atur ulang',
  explode:'Urai anatomi',assembled:'Terakit',everyPiece:'Setiap bagian',inventory:'INVENTARIS ANATOMI',separated:'STRUKTUR TERPISAH',selectedStructure:'STRUKTUR TERPILIH',
  dragToOrbit:'Seret untuk memutar',dragToPan:'Seret untuk menggeser',pinchToZoom:'Cubit untuk zoom',tapToInspect:'Ketuk untuk detail',
  anatomy:'ANATOMI',atlasReference:'Referensi atlas',selectedPieces:'Bagian terpilih',includedStructures:'Struktur termasuk',andMore:'bagian lainnya.',and:'Dan',isolate:'Isolasi struktur',showSurrounding:'Tampilkan sekitarnya',clearSelection:'Hapus pilihan',viewSource:'Lihat sumber',
  aboutThisAtlas:'Tentang atlas ini',sourceScope:'SUMBER & CAKUPAN',aboutTitle:'Tubuh, terungkap.',sourceHeading:'Sumber',datasetLicense:'Lisensi dataset',sourceCredits:'Sumber & kredit',
  preparing:'Menyiapkan anatomi',loadingBody:'Memuat',reference:'anatomi referensi',reloadViewer:'Muat ulang',catalogueError:'Katalog anatomi tidak dapat dimuat.',
  organAtelier:'Atelier Organ',switchToAtelier:'Beralih ke Atelier Organ',playTour:'Putar tur animasi 3D',pauseTour:'Jeda tur',deepDive:'Pelajari di Atelier',fullscreen:'Layar penuh',exitFullscreen:'Keluar layar penuh',
 },
 ko:{
  title:'인체 아틀라스',eyebrow:'인터랙티브 해부학',pieces:'개 모델 부위',referenceBody:'참조 신체',referenceBodyLabel:'참조 신체',language:'언어',
  findStructure:'구조 찾기',searchAnatomy:'해부 검색',findAnatomy:'해부 검색',searchNamed:'이름 있는 구조 검색',searchPlaceholder:'심장, 대퇴골, 뇌신경…',closeSearch:'검색 닫기',noMatches:'일치하는 구조가 없습니다.',searchHintEmpty:'주요 장기부터 시작하거나 구조를 검색하세요.',searchHintTyping:'최대 80개 결과 표시 중. 검색을 좁혀 보세요.',piece:'개 부위',pieces_plural:'개 부위',
  systems:'계통',anatomicalLayers:'해부 레이어',openLayers:'레이어 열기',closeSystems:'계통 닫기',presetAll:'전체',presetSkeleton:'골격',presetOrgans:'장기',showOnly:'이것만 표시',show:'표시',piecesVisible:'개 부위 표시 중',hideAll:'모두 숨기기',
  cameraControls:'카메라 조작',explorerPanels:'탐색 패널',viewThreeQuarter:'3/4 보기',viewFront:'정면',viewSide:'측면',viewBack:'후면',autoRotate:'자동 회전',rotateBody:'회전',pauseRotation:'회전 정지',reset:'초기화',resetView:'보기 및 레이어 초기화',assembleReset:'조립 및 초기화',
  explode:'분해 보기',assembled:'조립됨',everyPiece:'모든 부위',inventory:'해부 목록',separated:'분리된 구조',selectedStructure:'선택한 구조',
  dragToOrbit:'드래그하여 회전',dragToPan:'드래그하여 이동',pinchToZoom:'핀치하여 확대',tapToInspect:'탭하여 보기',
  anatomy:'해부',atlasReference:'아틀라스 참조',selectedPieces:'선택한 부위',includedStructures:'포함된 구조',andMore:'개의 다른 부위.',and:'그리고',isolate:'구조 분리',showSurrounding:'주변 표시',clearSelection:'선택 해제',viewSource:'출처 보기',
  aboutThisAtlas:'이 아틀라스 정보',sourceScope:'출처 및 범위',aboutTitle:'드러난 인체.',sourceHeading:'출처',datasetLicense:'데이터 라이선스',sourceCredits:'출처 및 크레딧',
  preparing:'해부 모델 준비 중',loadingBody:'로딩 중',reference:'참조 해부',reloadViewer:'다시 불러오기',catalogueError:'해부 카탈로그를 불러올 수 없습니다.',
  organAtelier:'장기 아틀리에',switchToAtelier:'장기 아틀리에로 이동',playTour:'3D 애니메이션 투어 재생',pauseTour:'투어 일시정지',deepDive:'아틀리에에서 자세히 보기',fullscreen:'전체 화면',exitFullscreen:'전체 화면 종료',
 },
};

export const say = (language:Language, phrase:Phrase):string => {
 const entry = TEXT[phrase] as {en:string;ar:string};
 if (language==='en' || language==='ar') return entry[language];
 return EXTRA[language]?.[phrase] ?? entry.en;
};

/** Arabic writes several letters more than one way and marks vowels optionally,
 * so a search has to compare stripped forms or it misses obvious matches. */
export const fold = (text:string) => text
 .toLowerCase()
 .replace(/[ً-ْٰـ]/g,'')
 .replace(/[أإآٱ]/g,'ا')
 .replace(/ى/g,'ي')
 .replace(/ؤ/g,'و')
 .replace(/ئ/g,'ي')
 .replace(/ة/g,'ه')
 .trim();
