import type {Language} from './i18n';

/** Localised system names for the atlas layer list. Kept as plain strings
 *  (not SystemId) to avoid a circular import with anatomy.ts. Missing ids
 *  fall back to the English name. Arabic lives in anatomy-ar.ts. */
type Names = Record<string,string>;

export const SYSTEM_NAMES: Partial<Record<Language,Names>> = {
 es:{skeletal:'Esqueleto',muscular:'Músculos',cardiac:'Corazón',sensory:'Órganos sensoriales',arterial:'Arterias',venous:'Venas',nervous:'Sistema nervioso',brain:'Regiones cerebrales',respiratory:'Respiratorio',digestive:'Digestivo',urinary:'Urinario',lymphatic:'Linfático',endocrine:'Endocrino',reproductive:'Reproductor',pregnancy:'Embarazo',integumentary:'Superficie corporal',connective:'Tejido conectivo',borrowed:'Huesos derivados del varón','donor-muscle':'Músculos de la pierna (donante)'},
 hi:{skeletal:'कंकाल',muscular:'मांसपेशियाँ',cardiac:'हृदय',sensory:'संवेदी अंग',arterial:'धमनियाँ',venous:'शिराएँ',nervous:'तंत्रिका तंत्र',brain:'मस्तिष्क क्षेत्र',respiratory:'श्वसन',digestive:'पाचन',urinary:'मूत्र',lymphatic:'लसीका',endocrine:'अंतःस्रावी',reproductive:'प्रजनन',pregnancy:'गर्भावस्था',integumentary:'शरीर की सतह',connective:'संयोजी ऊतक',borrowed:'पुरुष-व्युत्पन्न अस्थियां','donor-muscle':'पैर की मांसपेशियां (दाता)'},
 zh:{skeletal:'骨骼',muscular:'肌肉',cardiac:'心脏',sensory:'感觉器官',arterial:'动脉',venous:'静脉',nervous:'神经系统',brain:'脑区',respiratory:'呼吸系统',digestive:'消化系统',urinary:'泌尿系统',lymphatic:'淋巴系统',endocrine:'内分泌系统',reproductive:'生殖系统',pregnancy:'妊娠参考',integumentary:'体表',connective:'结缔组织',borrowed:'男性衍生骨骼','donor-muscle':'下肢肌肉（供体）'},
 pt:{skeletal:'Esqueleto',muscular:'Músculos',cardiac:'Coração',sensory:'Órgãos sensoriais',arterial:'Artérias',venous:'Veias',nervous:'Sistema nervoso',brain:'Regiões cerebrais',respiratory:'Respiratório',digestive:'Digestório',urinary:'Urinário',lymphatic:'Linfático',endocrine:'Endócrino',reproductive:'Reprodutor',pregnancy:'Gestação',integumentary:'Superfície corporal',connective:'Tecido conjuntivo',borrowed:'Ossos derivados do homem','donor-muscle':'Músculos da perna (doador)'},
 fr:{skeletal:'Squelette',muscular:'Muscles',cardiac:'Cœur',sensory:'Organes sensoriels',arterial:'Artères',venous:'Veines',nervous:'Système nerveux',brain:'Régions cérébrales',respiratory:'Respiratoire',digestive:'Digestif',urinary:'Urinaire',lymphatic:'Lymphatique',endocrine:'Endocrinien',reproductive:'Reproducteur',pregnancy:'Grossesse',integumentary:'Surface corporelle',connective:'Tissu conjonctif',borrowed:'Os dérivés de l’homme','donor-muscle':'Muscles de la jambe (donneur)'},
 de:{skeletal:'Skelett',muscular:'Muskeln',cardiac:'Herz',sensory:'Sinnesorgane',arterial:'Arterien',venous:'Venen',nervous:'Nervensystem',brain:'Hirnregionen',respiratory:'Atmung',digestive:'Verdauung',urinary:'Harnsystem',lymphatic:'Lymphsystem',endocrine:'Hormonsystem',reproductive:'Fortpflanzung',pregnancy:'Schwangerschaft',integumentary:'Körperoberfläche',connective:'Bindegewebe',borrowed:'Vom Mann abgeleitete Knochen','donor-muscle':'Beinmuskeln (Spenderin)'},
 ja:{skeletal:'骨格',muscular:'筋肉',cardiac:'心臓',sensory:'感覚器',arterial:'動脈',venous:'静脈',nervous:'神経系',brain:'脳領域',respiratory:'呼吸器',digestive:'消化器',urinary:'泌尿器',lymphatic:'リンパ系',endocrine:'内分泌',reproductive:'生殖器',pregnancy:'妊娠',integumentary:'体表',connective:'結合組織',borrowed:'男性由来の骨','donor-muscle':'脚の筋肉（ドナー）'},
 ru:{skeletal:'Скелет',muscular:'Мышцы',cardiac:'Сердце',sensory:'Органы чувств',arterial:'Артерии',venous:'Вены',nervous:'Нервная система',brain:'Отделы мозга',respiratory:'Дыхательная',digestive:'Пищеварительная',urinary:'Мочевыделительная',lymphatic:'Лимфатическая',endocrine:'Эндокринная',reproductive:'Репродуктивная',pregnancy:'Беременность',integumentary:'Поверхность тела',connective:'Соединительная ткань',borrowed:'Кости мужского происхождения','donor-muscle':'Мышцы ног (донорские)'},
 id:{skeletal:'Kerangka',muscular:'Otot',cardiac:'Jantung',sensory:'Organ indra',arterial:'Arteri',venous:'Vena',nervous:'Sistem saraf',brain:'Wilayah otak',respiratory:'Pernapasan',digestive:'Pencernaan',urinary:'Kemih',lymphatic:'Limfatik',endocrine:'Endokrin',reproductive:'Reproduksi',pregnancy:'Kehamilan',integumentary:'Permukaan tubuh',connective:'Jaringan ikat',borrowed:'Tulang turunan pria','donor-muscle':'Otot kaki (donor)'},
 ko:{skeletal:'골격',muscular:'근육',cardiac:'심장',sensory:'감각 기관',arterial:'동맥',venous:'정맥',nervous:'신경계',brain:'뇌 영역',respiratory:'호흡기',digestive:'소화기',urinary:'비뇨기',lymphatic:'림프계',endocrine:'내분비',reproductive:'생식기',pregnancy:'임신',integumentary:'체표',connective:'결합 조직',borrowed:'남성 유래 골격','donor-muscle':'다리 근육 (기증자)'},
};

export const SEX_LABELS: Partial<Record<Language,{male:string;female:string}>> = {
 es:{male:'Masculino',female:'Femenino'},
 hi:{male:'पुरुष',female:'महिला'},
 zh:{male:'男性',female:'女性'},
 pt:{male:'Masculino',female:'Feminino'},
 fr:{male:'Masculin',female:'Féminin'},
 de:{male:'Männlicher',female:'Weiblicher'},
 ja:{male:'男性',female:'女性'},
 ru:{male:'Мужское',female:'Женское'},
 id:{male:'Pria',female:'Wanita'},
 ko:{male:'남성',female:'여성'},
};
