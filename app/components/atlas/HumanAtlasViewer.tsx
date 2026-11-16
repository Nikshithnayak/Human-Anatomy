"use client";

import { flushSync } from 'react-dom';
import { registerAtlasTools } from './agent-tools';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  ArrowUpRight,
  ChevronRight,
  Focus,
  Info,
  Layers3,
  Maximize2,
  Microscope,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Search,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import AnatomyScene from './scene';
import { ZAnatomyAtlasView, type AtlasEditionChoice } from './ZAnatomyAtlasView';
import {
  EDITIONS,
  SYSTEMS,
  defaultVisible,
  described,
  edition,
  edition_,
  explanation,
  loadArabicTerms,
  systemName,
  term,
  type Atlas,
  type Concept,
  type SceneState,
  type Sex,
  type SystemId,
  type View,
} from './anatomy';
import { direction, fold, say, type Language } from './i18n';
import type { OrganId } from '../../lib/anatomy-data';
import { getAnatomicalRelationships } from '@/lib/anatomy/relationships';

const initial = (sex: Sex): SceneState => ({
  explode: 0,
  visible: defaultVisible(sex),
  selected: [],
  isolate: false,
  view: 'three-quarter',
  rotate: false,
  reset: 0,
});

const ORGAN_KEYWORDS: { pattern: RegExp; organId: OrganId; name: string }[] = [
  { pattern: /\b(heart|cardiac|myocardium|ventricle|atrium|aorta|cor|mitral|tricuspid|pericardium|coronary|endocardium)\b/i, organId: 'heart', name: 'Heart' },
  { pattern: /\b(brain|cerebr|cerebell|cortex|hippocampus|thalamus|encephalon|medulla|pons|meninges|dura|synapse|neuron)\b/i, organId: 'brain', name: 'Brain' },
  { pattern: /\b(kidney|renal|nephron|renes|ureter|glomerulus|adrenal|suprarenal)\b/i, organId: 'kidneys', name: 'Kidneys' },
  { pattern: /\b(liver|hepatic|hepar|bile|gallbladder|cholecyst|portal|sinusoid)\b/i, organId: 'liver', name: 'Liver' },
  { pattern: /\b(lung|pulmonary|pulmones|bronch|alveol|trachea|pleura|respirat)\b/i, organId: 'lungs', name: 'Lungs' },
  { pattern: /\b(pancreas|pancreat|islet|insulin|glucagon|wirsung|ampulla)\b/i, organId: 'pancreas', name: 'Pancreas' },
  { pattern: /\b(skin|integument|dermis|epidermis|subcutis|follicle|cutaneous)\b/i, organId: 'skin', name: 'Skin' },
  { pattern: /\b(eye|eyeball|oculus|cornea|retina|iris|sclera|lens|pupil|optic)\b/i, organId: 'eyeball', name: 'Eyeball' },
  { pattern: /\b(intestine|colon|bowel|ileum|jejunum|duodenum|appendix|cecum|rectum|stomach|gastric|digestive|mesentery)\b/i, organId: 'intestine', name: 'Intestine' },
];

const atlasManifestCache = new Map<string, Promise<Atlas>>();
function fetchAtlasManifestCached(url: string, errorMessage: string): Promise<Atlas> {
  const existing = atlasManifestCache.get(url);
  if (existing) return existing;
  const pending = fetch(url)
    .then((r) => {
      if (!r.ok) throw new Error(errorMessage);
      return r.json() as Promise<Atlas>;
    })
    .catch((err) => {
      atlasManifestCache.delete(url);
      throw err;
    });
  atlasManifestCache.set(url, pending);
  return pending;
}

export interface HumanAtlasViewerProps {
  /** Interface language — follows the platform-wide locale switcher. */
  language?: Language;
  initialSex?: Sex;
  onOpenInAtelier?: (organId: OrganId) => void;
  onSwitchToAtelier?: () => void;
  embedded?: boolean;
  theme?: 'light' | 'dark';
}

export function HumanAtlasViewer({
  language = 'en',
  initialSex = 'male',
  onOpenInAtelier,
  onSwitchToAtelier,
  embedded = false,
  theme = 'light',
}: HumanAtlasViewerProps) {
  const detailTitle = useRef<HTMLHeadingElement>(null);
  const [atlasMode, setAtlasMode] = useState<'standard' | 'z-anatomy'>('standard');
  const [sex, setSex] = useState<Sex>(initialSex);
  const [fullscreen, setFullscreen] = useState(false);

  const t = (phrase: Parameters<typeof say>[1]) => say(language, phrase);
  const name = (text: string) => term(text, language);
  const rtl = direction(language) === 'rtl';

  const [atlas, setAtlas] = useState<Atlas | null>(null);
  const [state, setState] = useState(() => initial(initialSex));
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [panel, setPanel] = useState<'layers' | 'search' | null>(null);
  const [details, setDetails] = useState(false);
  const [about, setAbout] = useState(false);
  const [query, setQuery] = useState('');
  const [chosen, setChosen] = useState<Concept | null>(null);
  const [animationMode, setAnimationMode] = useState(false);

  const source = edition_(sex, language);

  const handleSexChange = (newSex: Sex) => {
    setAnimationMode(false);
    setSex(newSex);
    setProgress(0);
    setError('');
    setAtlas(null);
    setChosen(null);
    setDetails(false);
    setPanel(null);
    setQuery('');
    setState(initial(newSex));
  };

  // Only the reference body decides which manifest loads. Language is not a
  // dependency: switching it must not tear down and re-download the 3D scene.
  const languageRef = useRef(language);
  useEffect(() => {
    languageRef.current = language;
  }, [language]);

  useEffect(() => {
    let active = true;

    fetchAtlasManifestCached(edition(sex).manifest, say(languageRef.current, 'catalogueError'))
      .then((data) => {
        if (active) setAtlas(data);
      })
      .catch((e) => {
        if (active) setError(e instanceof Error ? e.message : say(languageRef.current, 'catalogueError'));
      });

    return () => {
      active = false;
    };
  }, [sex]);

  // Idle background warm-up once the active atlas completes so switching to
  // Female, Z-Anatomy, or Organ Atelier responds immediately without stalling
  // initial render or first-chunk download.
  useEffect(() => {
    if (progress < 100 || error) return;
    let cancelled = false;

    const warmNextAssets = async () => {
      try {
        const alternateUrl = edition(sex === 'male' ? 'female' : 'male').manifest;
        const altAtlas = await fetchAtlasManifestCached(alternateUrl, 'Prefetch error');
        if (cancelled) return;
        const firstChunk = altAtlas.chunks?.[0];
        const firstUrl = (typeof DecompressionStream !== 'undefined' && firstChunk?.gzip)
          ? firstChunk.gzip
          : firstChunk?.url;
        if (firstUrl) {
          void fetch(firstUrl, { priority: 'low' } as RequestInit).catch(() => {});
        }
      } catch {
        // Ignore background warm-up failures
      }

      if (cancelled) return;
      void import('@/lib/anatomy/z-anatomy').then((za) => {
        if (cancelled) return;
        void za.loadZAnatomySystemsJson().catch(() => {});
        void za.loadZAnatomyLexiconJson().catch(() => {});
      });
      void import('../../lib/three/viewer').catch(() => {});
      void fetch('/models/heart.glb', { priority: 'low' } as RequestInit).catch(() => {});
    };

    const idleApi = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    if (typeof idleApi.requestIdleCallback === 'function') {
      const idleId = idleApi.requestIdleCallback(() => {
        if (!cancelled) void warmNextAssets();
      }, { timeout: 1400 });
      return () => {
        cancelled = true;
        idleApi.cancelIdleCallback?.(idleId);
      };
    }

    const timer = window.setTimeout(() => {
      if (!cancelled) void warmNextAssets();
    }, 650);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [progress, error, sex]);

  useEffect(() => {
    if (language === 'ar') {
      loadArabicTerms().catch(() => {});
    }
  }, [language]);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === '/' && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        setPanel('search');
        setDetails(false);
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, []);

  const parts = useMemo(() => new Map(atlas?.parts.map((p) => [p.id, p])), [atlas]);
  const counts = useMemo(
    () => Object.fromEntries(SYSTEMS.map((s) => [s.id, atlas?.parts.filter((p) => p.system === s.id).length ?? 0])),
    [atlas],
  );
  const activeSystems = SYSTEMS.filter((s) => counts[s.id] > 0);

  const selectedParts = state.selected.map((id) => parts.get(id)).filter((p) => !!p);
  const selected = selectedParts[0];
  const system = SYSTEMS.find((s) => s.id === selected?.system);

  const visibleCount =
    atlas?.parts.filter((p) =>
      state.isolate
        ? state.selected.includes(p.id)
        : state.visible.includes(p.system) || state.selected.includes(p.id),
    ).length ?? 0;

  const results = useMemo(() => {
    if (!atlas) return [];
    const termQuery = query.toLowerCase().trim();
    if (!termQuery) {
      return edition(atlas.sex ?? 'male')
        .suggestions.map((sugName) => atlas.concepts.find((c) => c.name.toLowerCase() === sugName))
        .filter((x): x is Concept => !!x);
    }
    const folded = fold(termQuery);
    return atlas.concepts
      .filter(
        (c) =>
          c.name.toLowerCase().includes(termQuery) ||
          c.id.toLowerCase().includes(termQuery) ||
          fold(term(c.name, language)).includes(folded),
      )
      .sort((a, b) => a.name.length - b.name.length)
      .slice(0, 80);
  }, [atlas, query, language]);

  const choose = (c: Concept) => {
    setChosen(c);
    setState((s) => ({ ...s, selected: c.elements, isolate: false, rotate: false }));
    setDetails(true);
    setPanel(null);
  };

  useEffect(() => {
    if (!atlas) return;
    return registerAtlasTools(atlas, (c) => flushSync(() => choose(c)));
  }, [atlas]);

  const choosePart = (id: string) => {
    const p = parts.get(id);
    if (!p) return;
    setChosen({ id: p.conceptId, name: p.name, elements: [id] });
    setState((s) => ({ ...s, selected: [id], isolate: false, rotate: false }));
    setDetails(true);
    setPanel(null);
  };

  const toggle = (id: SystemId) => {
    setDetails(false);
    setState((s) => ({
      ...s,
      selected: [],
      isolate: false,
      visible: s.visible.includes(id) ? s.visible.filter((x) => x !== id) : [...s.visible, id],
    }));
  };

  const reset = () => {
    setAnimationMode(false);
    setState((s) => ({ ...initial(sex), reset: s.reset + 1 }));
    setChosen(null);
    setDetails(false);
    setPanel(null);
  };

  const openPanel = (next: 'layers' | 'search') => {
    setDetails(false);
    setPanel((p) => (p === next ? null : next));
  };

  // Detect matching organ for atelier deep dive
  const candidateText = `${chosen?.name ?? ''} ${selected?.name ?? ''} ${system?.name ?? ''}`;
  let matchedOrgan = null;
  if (chosen || selected) {
    for (const item of ORGAN_KEYWORDS) {
      if (item.pattern.test(candidateText)) {
        matchedOrgan = item;
        break;
      }
    }
  }

  const handleProgress = useCallback((n: number) => {
    setProgress(n);
    if (n === 100) setError('');
  }, []);

  const handleError = useCallback((err: string) => {
    setError(err);
  }, []);

  const handleEditionChoice = (choice: AtlasEditionChoice) => {
    if (choice === 'z-anatomy') {
      setAtlasMode('z-anatomy');
      return;
    }
    setAtlasMode('standard');
    handleSexChange(choice);
  };

  if (atlasMode === 'z-anatomy') {
    return (
      <ZAnatomyAtlasView
        theme={theme}
        language={language}
        onSelectEdition={handleEditionChoice}
        onOpenInAtelier={onOpenInAtelier}
        onSwitchToAtelier={onSwitchToAtelier}
      />
    );
  }

  return (
    <div
      className={`studio studio-${theme} ${fullscreen ? 'studio-fullscreen' : ''} ${embedded ? 'studio-embedded' : ''}`}
      lang={language}
      dir={rtl ? 'rtl' : 'ltr'}
    >
      {atlas && (
        <AnatomyScene
          atlas={atlas}
          state={{ ...state, tour: animationMode, inspectorOpen: details && selectedParts.length > 0 }}
          onSelect={choosePart}
          onProgress={handleProgress}
          onError={handleError}
        />
      )}
      <div className="vignette" />

      {/* Top Left Branding */}
      <header className="identity">
        <div className="eyebrow">
          <span className="status-dot" /> {t('eyebrow')}
        </div>
        <h1>
          {t('title')}
          <Badge variant="outline" className="edition">
            3D
          </Badge>
        </h1>
        <div className="identity-meta">
          {atlas ? atlas.parts.length.toLocaleString('en') : '—'} {t('pieces')} <span>·</span> {source.dataset}
        </div>
        <div className="anatomy-choice" role="group" aria-label={t('referenceBodyLabel')}>
          <div className="edition-pills">
            {EDITIONS.map((e) => (
              <button
                key={e.sex}
                type="button"
                className={`edition-pill ${sex === e.sex ? 'active' : ''}`}
                aria-pressed={sex === e.sex}
                onClick={() => handleEditionChoice(e.sex)}
              >
                {edition_(e.sex, language).label}
              </button>
            ))}
            <button
              type="button"
              className="edition-pill"
              aria-pressed={false}
              onClick={() => handleEditionChoice('z-anatomy')}
            >
              Z-Anatomy · 2,827
            </button>
          </div>
        </div>
      </header>

      {/* Top Right Actions */}
      <nav className="top-actions" aria-label={t('explorerPanels')}>
        {onSwitchToAtelier && (
          <button
            type="button"
            className="flex items-center gap-2 font-medium"
            onClick={onSwitchToAtelier}
            title={t('switchToAtelier')}
          >
            <Microscope size={17} />
            <span>{t('organAtelier')}</span>
          </button>
        )}
        <Button
          variant="ghost"
          className={panel === 'search' ? 'active' : ''}
          onClick={() => openPanel('search')}
          aria-label={t('searchAnatomy')}
        >
          <Search size={18} />
          <span>{t('findStructure')}</span>
          <kbd>/</kbd>
        </Button>
        <Button
          variant="ghost"
          className="icon-button"
          aria-label={fullscreen ? t('exitFullscreen') : t('fullscreen')}
          title={fullscreen ? t('exitFullscreen') : t('fullscreen')}
          onClick={() => setFullscreen(!fullscreen)}
        >
          {fullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
        </Button>
        <Button
          variant="ghost"
          className="icon-button"
          aria-label={t('aboutThisAtlas')}
          onClick={() => {
            setDetails(false);
            setPanel(null);
            setAbout(true);
          }}
        >
          <Info size={18} />
        </Button>
      </nav>

      {/* Layers Panel */}
      <section
        className={`layers-panel glass ${panel === 'layers' ? 'mobile-open' : ''}`}
        aria-label={t('anatomicalLayers')}
      >
        <div className="panel-heading">
          <span>{t('systems')}</span>
          <Button
            variant="ghost"
            className="mobile-only icon-button"
            onClick={() => setPanel(null)}
            aria-label={t('closeSystems')}
          >
            <X size={18} />
          </Button>
          <Badge variant="secondary" className="desktop-only small-number">
            {activeSystems.length}
          </Badge>
        </div>
        <div className="layer-presets">
          <Button
            variant="ghost"
            aria-pressed={activeSystems.every((x) => state.visible.includes(x.id))}
            onClick={() =>
              setState((s) => ({
                ...s,
                selected: [],
                isolate: false,
                visible: activeSystems.map((x) => x.id),
              }))
            }
          >
            {t('presetAll')}
          </Button>
          <Button
            variant="ghost"
            aria-pressed={
              sex === 'female'
                ? state.visible.length === 2 && state.visible.includes('skeletal') && state.visible.includes('borrowed')
                : state.visible.length === 1 && state.visible[0] === 'skeletal'
            }
            onClick={() =>
              setState((s) => ({
                ...s,
                selected: [],
                isolate: false,
                visible: sex === 'female' ? ['skeletal', 'borrowed'] : ['skeletal'],
              }))
            }
          >
            {t('presetSkeleton')}
          </Button>
          <Button
            variant="ghost"
            aria-pressed={
              !state.visible.includes('skeletal') &&
              (sex === 'female'
                ? ['cardiac', 'respiratory', 'digestive', 'urinary', 'reproductive', 'brain'].every((id) =>
                    state.visible.includes(id as SystemId),
                  )
                : ['cardiac', 'respiratory', 'digestive', 'urinary', 'endocrine', 'reproductive'].every((id) =>
                    state.visible.includes(id as SystemId),
                  ))
            }
            onClick={() =>
              setState((s) => ({
                ...s,
                selected: [],
                isolate: false,
                visible:
                  sex === 'female'
                    ? ['cardiac', 'respiratory', 'digestive', 'urinary', 'reproductive', 'brain', 'integumentary']
                    : ['cardiac', 'respiratory', 'digestive', 'urinary', 'endocrine', 'reproductive'],
              }))
            }
          >
            {t('presetOrgans')}
          </Button>
        </div>
        <div className="system-list">
          {activeSystems.map((s) => (
            <div className={`system-row ${state.visible.includes(s.id) ? 'enabled' : ''}`} key={s.id}>
              <Button
                variant="ghost"
                className="system-name"
                title={`${t('showOnly')} ${systemName(s.id, language)}`}
                onClick={() =>
                  setState((v) => ({
                    ...v,
                    visible: [s.id],
                    isolate: false,
                    selected: [],
                  }))
                }
              >
                <span className="system-dot" style={{ background: s.color }} />
                {systemName(s.id, language)}
                <span className="system-count">{counts[s.id]}</span>
              </Button>
              <Switch
                checked={state.visible.includes(s.id)}
                onCheckedChange={() => toggle(s.id)}
                aria-label={`${t('show')} ${systemName(s.id, language)}`}
              />
            </div>
          ))}
        </div>
        <div className="panel-foot">
          <span>
            {visibleCount.toLocaleString('en')} {t('piecesVisible')}
          </span>
          <Button
            variant="ghost"
            onClick={() => setState((s) => ({ ...s, visible: [], selected: [], isolate: false }))}
          >
            {t('hideAll')}
          </Button>
        </div>
      </section>

      {/* Search Panel */}
      {panel === 'search' && (
        <section className="search-panel glass" aria-label={t('findAnatomy')}>
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-black/10 dark:border-white/10">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Search size={16} className="opacity-60 shrink-0" />
              <input
                type="text"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setPanel(null);
                  if (e.key === 'Enter' && results[0]) choose(results[0]);
                }}
                placeholder={t('searchPlaceholder')}
                aria-label={t('searchNamed')}
                className="w-full bg-transparent outline-none text-xs sm:text-sm"
              />
            </div>
            <Button
              variant="ghost"
              className="icon-button"
              onClick={() => setPanel(null)}
              aria-label={t('closeSearch')}
            >
              <X size={18} />
            </Button>
          </div>
          <div className="mt-2 max-h-[300px] overflow-y-auto space-y-1 pr-1">
            {results.length === 0 ? (
              <p className="text-xs opacity-65 py-6 text-center">{t('noMatches')}</p>
            ) : (
              results.map((c: Concept) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => choose(c)}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl hover:bg-sky-500/15 text-left transition-colors"
                >
                  <span className="text-xs font-medium truncate">{name(c.name)}</span>
                  <span className="small-number shrink-0">
                    {c.elements.length} {c.elements.length === 1 ? t('piece') : t('pieces_plural')}
                  </span>
                </button>
              ))
            )}
          </div>
          <p className="search-note mt-2 text-[11px] opacity-70">{query ? t('searchHintTyping') : t('searchHintEmpty')}</p>
        </section>
      )}

      {/* Camera View Controls */}
      <nav className="view-controls glass" aria-label={t('cameraControls')}>
        {(['three-quarter', 'front', 'side', 'back'] as View[]).map((v, i) => (
          <Button
            variant="ghost"
            key={v}
            className={state.view === v ? 'active' : ''}
            aria-pressed={state.view === v}
            disabled={state.explode > 0.8 && v !== 'front'}
            onClick={() => setState((s) => ({ ...s, view: v, reset: s.reset + 1, rotate: false }))}
            title={t((['viewThreeQuarter', 'viewFront', 'viewSide', 'viewBack'] as const)[i])}
            aria-label={t((['viewThreeQuarter', 'viewFront', 'viewSide', 'viewBack'] as const)[i])}
          >
            <span>{[rtl ? '¾' : '¾', rtl ? 'أ' : 'F', rtl ? 'ج' : 'S', rtl ? 'خ' : 'B'][i]}</span>
          </Button>
        ))}
        <i />
        <Button
          variant="ghost"
          disabled={state.explode >= 0.4}
          aria-label={state.rotate ? t('pauseRotation') : t('rotateBody')}
          title={t('autoRotate')}
          className={state.rotate ? 'active' : ''}
          onClick={() => setState((s) => ({ ...s, rotate: !s.rotate }))}
        >
          {state.rotate ? <Pause size={17} /> : <RotateCw size={18} />}
        </Button>
        <Button
          variant="ghost"
          aria-label={animationMode ? t('pauseTour') : t('playTour')}
          title={animationMode ? t('pauseTour') : t('playTour')}
          className={animationMode ? 'active' : ''}
          onClick={() => setAnimationMode((a) => !a)}
        >
          {animationMode ? <Pause size={17} /> : <Play size={17} />}
        </Button>
        <Button variant="ghost" aria-label={t('resetView')} title={t('reset')} onClick={reset}>
          <RotateCcw size={17} />
        </Button>
      </nav>

      {/* Scene Caption */}
      <div className="scene-caption">
        <span className="caption-line" />
        <span>
          {state.isolate
            ? chosen
              ? name(chosen.name)
              : t('selectedStructure')
            : state.explode > 0.95
              ? t('inventory')
              : state.explode > 0.05
                ? t('separated')
                : source.caption}
        </span>
        <span className="caption-line" />
      </div>

      {/* Bottom Explode & Navigation Dock */}
      <div className="bottom-dock glass">
        <Button
          variant="ghost"
          className="mobile-only dock-layers"
          onClick={() => openPanel('layers')}
          aria-label={t('openLayers')}
        >
          <Layers3 size={20} />
          <span>{t('systems')}</span>
        </Button>
        <div className="explode-control">
          <div className="explode-label">
            <label id="explode-label">{t('explode')}</label>
            <output>
              {Math.round(state.explode * 100)}
              <span>%</span>
            </output>
          </div>
          <Slider
            aria-labelledby="explode-label"
            min={0}
            max={100}
            step={1}
            value={[Math.round(state.explode * 100)]}
            defaultValue={[0]}
            onValueChange={(v) => {
              const val = Array.isArray(v) ? v[0] : (typeof v === 'number' ? v : 0);
              setAnimationMode(false);
              setState((s) => ({
                ...s,
                explode: Math.max(0, Math.min(100, val)) / 100,
                view: val > 80 ? 'front' : s.view,
                rotate: false,
              }));
            }}
          />
          <div className="slider-endpoints">
            <span>{t('assembled')}</span>
            <span>{t('everyPiece')}</span>
          </div>
        </div>
        <Button variant="ghost" className="dock-reset" onClick={reset} aria-label={t('assembleReset')}>
          <RotateCcw size={18} />
          <span>{t('reset')}</span>
        </Button>
      </div>

      {/* Footer Info */}
      <footer className="studio-footer">
        <span>
          {state.explode > 0.8 ? t('dragToPan') : t('dragToOrbit')} <b>·</b> {t('pinchToZoom')} <b>·</b>{' '}
          {t('tapToInspect')}
        </span>
        <Button
          variant="ghost"
          onClick={() => {
            setDetails(false);
            setPanel(null);
            setAbout(true);
          }}
        >
          {t('sourceCredits')} <ArrowUpRight size={12} />
        </Button>
      </footer>

      {/* Loading & Error States */}
      {!error && (
        <div
          className={`loading glass ${progress > 0 && progress < 100 ? 'is-streaming' : ''} ${progress >= 100 ? 'is-complete' : ''}`}
          role="status"
          aria-hidden={progress >= 100}
        >
          <Activity size={18} />
          <div>
            <strong>{t('preparing')}</strong>
            <span>
              {progress}% · {t('loadingBody')} {source.label.toLocaleLowerCase(language)} {t('reference')}
            </span>
            <div className="loading-track">
              <i style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="loading glass error" role="alert">
          <p>{error}</p>
          <Button variant="ghost" onClick={() => location.reload()}>
            {t('reloadViewer')}
          </Button>
        </div>
      )}

      {/* Structure Inspector Sheet */}
      <Sheet
        open={details && selectedParts.length > 0}
        modal={false}
        disablePointerDismissal
        onOpenChange={(open) => {
          setDetails(open);
          if (!open) {
            setState((s) => ({ ...s, selected: [], isolate: false }));
          }
        }}
      >
        <SheetContent
          initialFocus={detailTitle}
          className={`detail-sheet glass ${state.isolate ? 'is-isolated' : ''}`}
          showCloseButton={true}
          hideOverlay={true}
        >
          <div className="detail-header">
            <div className="detail-accent" style={{ background: system?.color }} />
            <div className="eyebrow">{system ? systemName(system.id, language) : t('anatomy')}</div>
            <SheetTitle ref={detailTitle} tabIndex={-1} className="structure-title">
              {chosen ? name(chosen.name) : ''}
            </SheetTitle>
            {chosen && rtl && name(chosen.name) !== chosen.name && (
              <span className="structure-latin">{chosen.name}</span>
            )}
          </div>
          <div className="detail-scroll" key={`${chosen?.id}-${state.isolate}`}>
            <SheetDescription className="structure-description">
              {chosen && selected ? explanation(chosen.name, selected.system, sex, language) : ''}
            </SheetDescription>
            {chosen && !described(chosen.name) && (
              <span className="context-note">{t('systemOverview')}</span>
            )}

            {/* Atelier Bridge Button */}
            {matchedOrgan && onOpenInAtelier && (
              <button
                type="button"
                className="bridge-action"
                onClick={() => onOpenInAtelier(matchedOrgan.organId)}
              >
                <Microscope size={16} />
                <span>{t('deepDive')} ({matchedOrgan.name})</span>
                <ChevronRight size={14} className="ml-auto" />
              </button>
            )}

            {/* Anatomy Relationship Explorer */}
            {(() => {
              const rels = getAnatomicalRelationships(chosen?.name || selected?.name || '');
              if (!rels || rels.relationships.length === 0) return null;
              return (
                <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-400">
                    <Activity size={14} />
                    <span>Anatomical Relationships & Connections</span>
                  </div>
                  <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                    {rels.relationships.map((rel) => (
                      <div
                        key={rel.id}
                        className="p-2 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-neutral-200/60 dark:border-neutral-800"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-bold text-neutral-800 dark:text-neutral-200">
                            {rel.targetName}
                          </span>
                          <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                            {rel.type.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-600 dark:text-neutral-400 mt-1 leading-snug">
                          {rel.description}
                        </p>
                        {rel.clinicalRelevance && (
                          <p className="text-[10px] text-rose-700 dark:text-rose-400 font-semibold mt-1">
                            Clinical: {rel.clinicalRelevance}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            <div className="structure-meta">
              <span>
                {t('atlasReference')}
                <strong>{chosen?.id}</strong>
              </span>
              <span>
                {t('selectedPieces')}
                <strong>{state.selected.length.toLocaleString('en')}</strong>
              </span>
            </div>

            {selectedParts.length > 1 && (
              <div className="member-list">
                <h3>{t('includedStructures')}</h3>
                {selectedParts.slice(0, 50).map((p) => (
                  <Button variant="ghost" key={p.id} onClick={() => choosePart(p.id)}>
                    <span>{name(p.name)}</span>
                    <ChevronRight size={14} />
                  </Button>
                ))}
                {selectedParts.length > 50 && (
                  <p>
                    {t('and')} {selectedParts.length - 50} {t('andMore')}
                  </p>
                )}
              </div>
            )}
            <a className="source-link" href={source.download} target="_blank" rel="noreferrer">
              {t('viewSource')} <ArrowUpRight size={14} />
            </a>
          </div>
          <div className="detail-actions">
            <Button
              className={`primary-action ${state.isolate ? 'active' : ''}`}
              onClick={() => setState((s) => ({ ...s, isolate: !s.isolate, explode: 0 }))}
            >
              <Focus size={18} />
              {state.isolate ? t('showSurrounding') : t('isolate')}
              <ChevronRight size={16} />
            </Button>
            <Button
              variant="ghost"
              className="secondary-action"
              onClick={() => {
                setState((s) => ({ ...s, selected: [], isolate: false }));
                setDetails(false);
              }}
            >
              {t('clearSelection')}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* About Dataset Sheet */}
      <Sheet open={about} onOpenChange={setAbout}>
        <SheetContent className="about-sheet glass">
          <div className="eyebrow">{t('sourceScope')}</div>
          <SheetTitle className="structure-title">{t('aboutTitle')}</SheetTitle>
          <SheetDescription>
            {t('aboutIntro')} {source.label.toLocaleLowerCase(language)} {t('aboutIntroFrom')} {source.dataset}.
          </SheetDescription>
          <div className="about-copy">
            <p>
              <strong>
                {source.label} · {source.dataset}
              </strong>
              <br />
              {source.summary}
            </p>
            <p>{source.limits}</p>
            <p>{t('shared')}</p>
            <p>{t('caveat')}</p>
            <h3>{t('sourceHeading')}</h3>
            <p>{source.credit}</p>
            <a href={source.licence} target="_blank" rel="noreferrer">
              {t('datasetLicense')} <ArrowUpRight size={14} />
            </a>
            <a href={source.download} target="_blank" rel="noreferrer">
              {t('originalGeometry')} <ArrowUpRight size={14} />
            </a>
            {source.publication && (
              <a href={source.publication} target="_blank" rel="noreferrer">
                {t('readPublication')} <ArrowUpRight size={14} />
              </a>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
