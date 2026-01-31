'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Clock3, Home, Sparkles } from 'lucide-react';
import ProductImage from '@/app/components/ProductImage';
import { type Product } from '@/lib/productTypes';
import TopControls from '@/app/components/TopControls';
import { useSfx } from '@/app/components/sfx/SfxProvider';
import { useLanguage } from '@/app/hooks/useLanguage';
import SfxToggle from '@/app/components/sfx/SfxToggle';
import { useButtonHotkeys } from '@/app/hooks/useButtonHotkeys';

type SoloResult = {
  product: Product;
  guess: number;
  price: number;
  delta: number;
};

const DEFAULT_ROUNDS = 5;
const DEFAULT_SOURCE: Product['source'] | 'mixed' = 'mixed';
const roundSeconds = 20;

function Stage({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-page px-3 pb-8 pt-16 text-blue-deep sm:px-6 sm:pt-12">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-10 top-8 h-48 w-48 rotate-6 rounded-lg bg-blue-light/30 blur-3xl" />
        <div className="absolute -right-6 bottom-10 h-40 w-40 -rotate-3 rounded-lg bg-blue-mid/25 blur-3xl" />
      </div>
      <div className="relative z-10 mx-auto max-w-4xl">{children}</div>
    </div>
  );
}

export default function SoloPage() {
  const router = useRouter();
  const { playTick, playDing, playBuzzer } = useSfx();
  const { language, setLanguage } = useLanguage();
  useButtonHotkeys();
  const [products, setProducts] = useState<Product[]>([]);
  const [roundIndex, setRoundIndex] = useState(0);
  const [guess, setGuess] = useState('');
  const [lockedGuess, setLockedGuess] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [results, setResults] = useState<SoloResult[]>([]);
  const [timeLeft, setTimeLeft] = useState(roundSeconds);
  const [roundsTotal, setRoundsTotal] = useState(DEFAULT_ROUNDS);
  const [source, setSource] = useState<typeof DEFAULT_SOURCE>(DEFAULT_SOURCE);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [isMobileLayout, setIsMobileLayout] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 768;
  });
  const [runId, setRunId] = useState(0);
  const [showSettings, setShowSettings] = useState(false);

  const currentProduct = products[roundIndex];
  const ENTER_SYMBOL = '⏎';
  const ESC_LABEL = 'Esc';
  const hotkey = useCallback(
    (
      keys: string,
      options?: { allowInput?: boolean; priority?: boolean; title?: string }
    ) =>
      isMobileLayout
        ? {}
        : {
          'data-hotkeys': keys,
          ...(options?.allowInput ? { 'data-hotkey-allow-input': 'true' } : {}),
          ...(options?.priority ? { 'data-hotkey-priority': 'true' } : {}),
          ...(options?.title ? { title: options.title } : {}),
        },
    [isMobileLayout]
  );
  const withShortcut = useCallback(
    (label: string, shortcut: string) => (isMobileLayout ? label : `${label} ${shortcut}`),
    [isMobileLayout]
  );

  const handleLock = useCallback(
    (auto = false) => {
      if (!currentProduct) return;
      if (lockedGuess !== null) return;
      const value = parseFloat(guess || '0') || 0;
      setLockedGuess(value);
      setShowResult(true);
      const delta = Math.abs(value - currentProduct.price);
      playDing();
      setResults((prev) => [...prev, { product: currentProduct, guess: value, price: currentProduct.price, delta }]);
      if (timerRef.current) clearInterval(timerRef.current);
      if (auto) {
        playBuzzer();
      }
    },
    [currentProduct, guess, lockedGuess, playBuzzer, playDing]
  );

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const storedRounds = parseInt(localStorage.getItem('soloRounds') || `${DEFAULT_ROUNDS}`, 10);
      const storedSource = (localStorage.getItem('soloSource') as typeof DEFAULT_SOURCE) || DEFAULT_SOURCE;
      const resolvedRounds = isNaN(storedRounds) ? DEFAULT_ROUNDS : storedRounds;
      const resolvedSource = storedSource || DEFAULT_SOURCE;
      setRoundsTotal(resolvedRounds);
      setSource(resolvedSource);
      setIsLoadingProducts(true);
      setLoadError(null);

      try {
        const res = await fetch(`/lenka/api/solo-products?rounds=${resolvedRounds}&source=${resolvedSource}`);
        if (!res.ok) {
          throw new Error(`Failed to fetch products (${res.status})`);
        }
        const data = (await res.json()) as { products: Product[] };
        if (cancelled) return;
        setProducts(data.products || []);
      } catch (err: any) {
        console.error('Failed to load solo products:', err);
        if (cancelled) return;
        // Try fixture fallback
        try {
          const res = await fetch(`/lenka/api/solo-products?rounds=${resolvedRounds}&source=${resolvedSource}&fixture=1`);
          if (!res.ok) throw new Error(`Fixture fetch failed (${res.status})`);
          const data = (await res.json()) as { products: Product[] };
          setProducts(data.products || []);
          setLoadError(null);
        } catch (fallbackErr: any) {
          console.error('Fixture fallback failed:', fallbackErr);
          setLoadError(err?.message || 'Erro ao carregar produtos');
          setProducts([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingProducts(false);
          if (timerRef.current) clearInterval(timerRef.current);
          setRoundIndex(0);
          setResults([]);
          setGuess('');
          setLockedGuess(null);
          setShowResult(false);
          setTimeLeft(roundSeconds);
          setShowSummary(false);
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [runId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => setIsMobileLayout(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    document.body.style.overflow = showSettings ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [showSettings]);

  useEffect(() => {
    if (!currentProduct || showResult) return;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current as NodeJS.Timeout);
          if (lockedGuess === null) {
            handleLock(true);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentProduct, showResult, lockedGuess, handleLock]);

  const handleNext = () => {
    if (roundIndex + 1 >= roundsTotal) {
      setShowResult(true);
      return;
    }
    setRoundIndex((idx) => idx + 1);
    setGuess('');
    setLockedGuess(null);
    setShowResult(false);
    setTimeLeft(roundSeconds);
  };

  const finished = showSummary;
  const totalScore = useMemo(() => {
    return results.reduce((sum, r) => sum + Math.max(0, Math.round(100 - r.delta)), 0);
  }, [results]);
  const getDeltaTone = (delta: number) => {
    if (delta <= 1) return { color: 'bg-blue-light/60 text-blue-deep', label: t('Spot on', 'Acertaste em cheio') };
    if (delta <= 5) return { color: 'bg-blue-light/30 text-blue-deep', label: t('Close', 'Quase lá') };
    return { color: 'bg-red-100 text-red-700', label: t('Wild guess', 'Palpite arriscado') };
  };

  const t = (en: string, pt: string) => (language === 'pt' ? pt : en);
  const handleLeaveSolo = () => {
    router.push('/');
  };

  const renderCurrent = () => {
    if (!currentProduct) {
      return (
        <div className="flyer-box bg-card p-6 text-center mt-12">
          <p className="font-ad text-xl uppercase text-blue-deep">{t('Loading products...', 'A carregar produtos...')}</p>
        </div>
      );
    }

    if (isMobileLayout) {
      const productImageSize = 140;
      return (
        <div className="flyer-box bg-card p-3 space-y-2.5 mt-12">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-0.5">
              <p className="text-[9px] font-semibold uppercase tracking-[0.35em] text-blue-mid">
                {language === 'pt'
                  ? `Ronda ${roundIndex + 1} / ${roundsTotal}`
                  : `Round ${roundIndex + 1} / ${roundsTotal}`}
              </p>
              <h2 className="font-ad text-lg uppercase leading-tight text-blue-deep">
                {t('Guess that price!', 'Adivinha esse preço!')}
              </h2>
            </div>
            <div className="promo-badge rounded-full bg-blue-mid px-3 py-1.5 text-card shadow-flyer">
              <Clock3 className="h-4 w-4" />
              <span className="ml-1.5 text-base leading-none">{timeLeft}s</span>
            </div>
          </div>

          <div className="flex justify-center">
            <div className="rounded-md border-2 border-blue-deep bg-card p-1.5 shadow-flyer-sm">
              <ProductImage
                src={currentProduct.imageUrl}
                alt={currentProduct.name}
                width={productImageSize}
                height={productImageSize}
                className="h-[140px] w-[140px] rounded-md border-2 border-blue-deep bg-blue-light/30 p-1.5 shadow-flyer-xs object-contain"
              />
            </div>
          </div>

          <div className="flyer-panel bg-card px-2.5 py-2">
            <p className="text-[9px] font-semibold uppercase tracking-[0.35em] text-blue-mid">
              {t('Product', 'Produto')}
            </p>
            <h3 className="mt-1 font-ad text-base uppercase leading-snug text-blue-deep">{currentProduct.name}</h3>
            {currentProduct.store && (
              <p className="text-[11px] font-display text-blue-deep/70">{currentProduct.store}</p>
            )}
            {currentProduct.description && (
              <p className="text-[11px] leading-snug text-blue-deep/70">{currentProduct.description}</p>
            )}
          </div>

          {!showResult && (
            <div className="space-y-2">
              <div className="flex items-stretch gap-2">
                <div className="flyer-panel flex-1 bg-blue-light/10 px-2.5 py-2">
                  <label className="text-[9px] font-semibold uppercase tracking-[0.35em] text-blue-mid">
                    {t('Your Guess (€)', 'O teu palpite (€)')}
                  </label>
                  <input
                    type="number"
                    value={guess}
                    onChange={(e) => setGuess(e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="mt-1 w-full bg-transparent font-ad text-xl uppercase leading-tight text-blue-deep placeholder:text-blue-deep/30 focus:outline-none"
                  />
                </div>
                <button
                  onClick={() => handleLock()}
                  disabled={lockedGuess !== null || !guess}
                  {...hotkey('enter', { allowInput: true, title: t('Shortcut: ⏎', 'Atalho: ⏎') })}
                  className={`coupon-button self-stretch px-4 text-sm ${lockedGuess !== null || !guess ? 'cursor-not-allowed opacity-60' : 'bg-blue-mid text-card hover:-translate-y-1'
                    }`}
                >
                  {withShortcut(t('Lock', 'Bloquear'), `(${ENTER_SYMBOL})`)}
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  className="coupon-button flex-1 bg-card px-4 py-2 text-sm hover:-translate-y-1"
                  onClick={() => router.push('/')}
                  {...hotkey('escape', { title: t('Shortcut: Esc', 'Atalho: Esc') })}
                >
                  {withShortcut(t('Leave game', 'Sair do jogo'), `(${ESC_LABEL})`)}
                </button>
              </div>
            </div>
          )}

          {showResult && lockedGuess !== null && (
            <div className="flyer-panel bg-blue-light/15 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-blue-mid">{t('Round Result', 'Resultado da ronda')}</p>
              <div className="mt-2 flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-deep/80">{t('Your guess', 'O teu palpite')}</p>
                  <p className="font-ad text-2xl uppercase text-blue-deep">€{lockedGuess.toFixed(2)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-blue-deep/80">{t('Real price', 'Preço real')}</p>
                  <p className="font-ad text-2xl uppercase text-blue-deep">€{currentProduct.price.toFixed(2)}</p>
                </div>
              </div>
              <p className="mt-2 text-sm font-semibold uppercase tracking-[0.35em] text-blue-mid">
                {t('Difference', 'Diferença')}: €{Math.abs(lockedGuess - currentProduct.price).toFixed(2)}
              </p>
              <div className="flex gap-2 mt-3">
                {roundIndex + 1 >= roundsTotal ? (
                  <button
                    className="coupon-button flex-1 bg-blue-mid px-4 py-3 text-card hover:-translate-y-1"
                    onClick={() => setShowSummary(true)}
                    {...hotkey('enter', { title: t('Shortcut: ⏎', 'Atalho: ⏎') })}
                  >
                    {withShortcut(t('See final results', 'Ver resultados finais'), `(${ENTER_SYMBOL})`)}
                  </button>
                ) : (
                  <button
                    className="coupon-button flex-1 bg-blue-mid px-4 py-3 text-card hover:-translate-y-1"
                    onClick={handleNext}
                    {...hotkey('enter', { title: t('Shortcut: ⏎', 'Atalho: ⏎') })}
                  >
                    {withShortcut(t('Next product', 'Próximo produto'), `(${ENTER_SYMBOL})`)}
                  </button>
                )}
              </div>
            </div>
          )}

          {showResult && (
            <div className="flex gap-2">
              <button
                className="coupon-button flex-1 bg-card px-4 py-3 text-sm hover:-translate-y-1 border-2 border-blue-deep shadow-flyer-xs rounded-md"
                onClick={() => router.push('/')}
                {...hotkey('escape', { title: t('Shortcut: Esc', 'Atalho: Esc') })}
              >
                {withShortcut(t('Leave game', 'Sair do jogo'), `(${ESC_LABEL})`)}
              </button>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="flyer-box bg-card p-5 space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-blue-mid">
              {language === 'pt' ? `Ronda ${roundIndex + 1} / ${roundsTotal}` : `Round ${roundIndex + 1} / ${roundsTotal}`}
            </p>
            <h1 className="font-ad text-2xl uppercase leading-tight text-blue-deep">{t('Guess that price!', 'Adivinha esse preço!')}</h1>
          </div>
          <div className="promo-badge rounded-full bg-blue-mid px-4 py-2 text-card shadow-flyer">
            <Clock3 className="h-5 w-5" />
            <span className="ml-2 text-xl">{timeLeft}s</span>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
          <div className="flyer-panel flex-1 bg-card px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-blue-mid">{t('Product', 'Produto')}</p>
            <h3 className="mt-1 font-ad text-xl uppercase leading-snug text-blue-deep">{currentProduct.name}</h3>
            {currentProduct.store && <p className="text-sm text-blue-deep/70">{currentProduct.store}</p>}
          </div>
          <div className="flex items-center justify-center rounded-md border-2 border-blue-deep bg-card p-3 shadow-flyer-sm">
            <ProductImage
              src={currentProduct.imageUrl}
              alt={currentProduct.name}
              width={300}
              height={300}
              className="h-[260px] w-[260px] rounded-md border-2 border-blue-deep bg-blue-light/30 p-3 shadow-flyer-xs object-contain"
            />
          </div>
        </div>

        {!showResult && (
          <div className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
              <div className="flyer-panel flex-1 bg-blue-light/10 px-3 py-2">
                <label className="text-[10px] font-semibold uppercase tracking-[0.35em] text-blue-mid">
                  {t('Your Guess (€)', 'O teu palpite (€)')}
                </label>
                <input
                  type="number"
                  value={guess}
                  onChange={(e) => setGuess(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className="mt-1 w-full bg-transparent font-ad text-3xl uppercase leading-tight text-blue-deep placeholder:text-blue-deep/30 focus:outline-none"
                />
              </div>
              <button
                onClick={() => handleLock()}
                disabled={lockedGuess !== null}
                {...hotkey('enter', { allowInput: true, title: t('Shortcut: ⏎', 'Atalho: ⏎') })}
                className={`coupon-button px-6 py-3 text-base sm:min-h-[85px] sm:flex sm:items-center sm:justify-center sm:px-6 sm:py-2 sm:self-start ${lockedGuess !== null ? 'cursor-not-allowed opacity-60' : 'bg-blue-mid text-card hover:-translate-y-1'
                  }`}
              >
                {withShortcut(t('Lock Guess', 'Bloquear palpite'), `(${ENTER_SYMBOL})`)}
              </button>
            </div>
            <div className="flex">
              <button
                className="coupon-button bg-card px-4 py-3 text-sm sm:px-5 sm:py-3 sm:text-base hover:-translate-y-1"
                onClick={() => router.push('/')}
                {...hotkey('escape', { title: t('Shortcut: Esc', 'Atalho: Esc') })}
              >
                {withShortcut(t('Leave game', 'Sair do jogo'), `(${ESC_LABEL})`)}
              </button>
            </div>
          </div>
        )}

        {showResult && lockedGuess !== null && (
          <div className="flyer-panel bg-blue-light/15 px-4 py-3 space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-blue-mid">{t('Round Result', 'Resultado da ronda')}</p>
            <div className="mt-2 flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-deep/80">{t('Your guess', 'O teu palpite')}</p>
                <p className="font-ad text-2xl uppercase text-blue-deep">€{lockedGuess.toFixed(2)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-blue-deep/80">{t('Real price', 'Preço real')}</p>
                <p className="font-ad text-2xl uppercase text-blue-deep">€{currentProduct.price.toFixed(2)}</p>
              </div>
            </div>
            <p className="mt-2 text-sm font-semibold uppercase tracking-[0.35em] text-blue-mid">
              {t('Difference', 'Diferença')}: €{Math.abs(lockedGuess - currentProduct.price).toFixed(2)}
            </p>
            <div className="flex gap-2">
              {roundIndex + 1 >= roundsTotal ? (
                <button
                  className="coupon-button flex-1 bg-blue-mid px-4 py-3 text-card hover:-translate-y-1"
                  onClick={() => setShowSummary(true)}
                  {...hotkey('enter', { title: t('Shortcut: ⏎', 'Atalho: ⏎') })}
                >
                  {withShortcut(t('See final results', 'Ver resultados finais'), `(${ENTER_SYMBOL})`)}
                </button>
              ) : (
                <button
                  className="coupon-button flex-1 bg-blue-mid px-4 py-3 text-card hover:-translate-y-1"
                  onClick={handleNext}
                  {...hotkey('enter', { title: t('Shortcut: ⏎', 'Atalho: ⏎') })}
                >
                  {withShortcut(t('Next product', 'Próximo produto'), `(${ENTER_SYMBOL})`)}
                </button>
              )}
            </div>
          </div>
        )}

        {showResult && (
          <div className="flex gap-2">
            <button
              className="coupon-button flex-1 bg-card px-4 py-2 text-sm hover:-translate-y-1 border-2 border-blue-deep shadow-flyer-xs rounded-md"
              onClick={() => router.push('/')}
              {...hotkey('escape', { title: t('Shortcut: Esc', 'Atalho: Esc') })}
            >
              {withShortcut(t('Leave game', 'Sair do jogo'), `(${ESC_LABEL})`)}
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderSummary = () => (
    <div className="flyer-box bg-card p-4 space-y-3 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-blue-mid">{t('Solo Results', 'Resultados do solo')}</p>
          <h2 className="font-ad text-xl uppercase text-blue-deep sm:text-2xl">{t('Game complete', 'Jogo concluído')}</h2>
        </div>
        <div className="promo-badge rounded-full bg-blue-mid px-3 py-2 text-card shadow-flyer">
          <span className="ml-1 text-base sm:text-xl">{totalScore} pts</span>
        </div>
      </div>
      <div className="text-[11px] text-blue-deep/70">
        <p>{t('Green dot is the real price. Yellow is your guess.', 'O ponto verde é o preço real. O amarelo é o teu palpite.')}</p>
      </div>
      <div className="space-y-2">
        {(() => {
          return results.map((res, idx) => {
            // 1. Calculate Relative Scale
            // Base view radius is the price itself (so range is 0 to 2*price)
            // If guess is way off, expand radius to fit it
            const deviation = Math.abs(res.guess - res.price);
            const viewRadius = Math.max(res.price, deviation * 1.1);

            // Real price is always center (50%)
            const realPos = 50;

            // Calculate guess position relative to center
            const diff = res.guess - res.price;
            let guessPos = 50 + (diff / viewRadius) * 50;

            // Clamp between 5% and 95% to keep inside container
            guessPos = Math.max(5, Math.min(95, guessPos));

            // 2. Calculate Color Gradient (Green -> Yellow -> Red)
            // 0% error = 120 hue (Green)
            // 100% error = 0 hue (Red)
            const errorPercentage = deviation / res.price;
            // Cap error at 100% for color calculation (anything >100% error is fully red)
            const hue = Math.max(0, 120 - (Math.min(1, errorPercentage) * 120));

            const badgeStyle = {
              backgroundColor: `hsl(${hue}, 85%, 45%)`,
              color: '#fff',
            };
            const lineStyle = {
              backgroundColor: `hsl(${hue}, 85%, 45%)`,
            };

            return (
              <div
                key={`${res.product.id}-${idx}`}
                className="rounded-md border border-blue-deep/30 bg-blue-light/10 px-3 py-4 shadow-flyer-xs mt-4"
              >
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.35em] text-blue-mid">
                      {language === 'pt' ? `Ronda ${idx + 1}` : `Round ${idx + 1}`}
                    </p>
                    <p className="font-ad text-[13px] uppercase text-blue-deep line-clamp-1">{res.product.name}</p>
                  </div>
                </div>

                {/* Timeline Container */}
                <div className="relative h-1 w-full rounded-full bg-blue-deep/20 my-8">

                  {/* Real Price (Center, Below) */}
                  <div
                    className="absolute top-4 flex -translate-x-1/2 flex-col items-center"
                    style={{ left: '50%' }}
                  >
                    <div className="h-3 w-0.5 bg-blue-deep/40 -mt-4 mb-1"></div>
                    <span
                      className="whitespace-nowrap rounded-md bg-blue-deep px-2 py-1 text-[10px] font-bold text-card shadow-sm"
                      title={t('Real price', 'Preço real')}
                    >
                      €{res.price.toFixed(2)}
                    </span>
                  </div>

                  {/* User Guess (Relative, Above) */}
                  <div
                    className="absolute -top-8 flex -translate-x-1/2 flex-col items-center"
                    style={{ left: `${guessPos}%` }}
                  >
                    <span
                      className="whitespace-nowrap rounded-full px-2 py-1 text-[10px] font-bold shadow-sm mb-1"
                      style={badgeStyle}
                      title={t('Your guess', 'O teu palpite')}
                    >
                      €{res.guess.toFixed(2)}
                    </span>
                    <div className="h-3 w-0.5 opacity-50" style={lineStyle}></div>
                  </div>

                </div>
              </div>
            );
          });
        })()}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          className="coupon-button flex-1 bg-card px-4 py-3 text-sm hover:-translate-y-1"
          onClick={() => {
            setRunId((prev) => prev + 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          {...hotkey('enter', { title: t('Shortcut: ⏎', 'Atalho: ⏎') })}
        >
          {withShortcut(t('Play again', 'Jogar novamente'), `(${ENTER_SYMBOL})`)}
        </button>
        <button
          className="coupon-button flex-1 bg-card px-4 py-3 text-sm hover:-translate-y-1"
          onClick={() => router.push('/')}
          {...hotkey('escape', { title: t('Shortcut: Esc', 'Atalho: Esc') })}
        >
          {withShortcut(t('Leave game', 'Sair do jogo'), `(${ESC_LABEL})`)}
        </button>
      </div>
    </div>
  );

  return (
    <Stage>
      <TopControls
        isMobile={isMobileLayout}
        onOpenSettings={
          isMobileLayout
            ? () => {
              setShowSettings(true);
            }
            : undefined
        }
      />
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-ad text-2xl uppercase text-blue-deep">{t('Solo Mode', 'Modo solo')}</h1>
      </div>

      {isLoadingProducts && (
        <div className="flyer-box bg-card p-6 text-center">
          <p className="font-ad text-xl uppercase text-blue-deep">{t('Loading products...', 'A carregar produtos...')}</p>
          <p className="mt-2 text-sm text-blue-deep/80">
            {t('Fetching items from the providers you selected.', 'A buscar artigos das fontes que escolheste.')}
          </p>
          <div className="mt-6 flex gap-2">
            <button
              className="coupon-button flex-1 bg-card px-4 py-2 text-sm hover:-translate-y-1"
              onClick={() => router.push('/')}
              {...hotkey('escape', { title: t('Shortcut: Esc', 'Atalho: Esc') })}
            >
              {withShortcut(t('Cancel', 'Cancelar'), `(${ESC_LABEL})`)}
            </button>
          </div>
        </div>
      )}

      {!isLoadingProducts && !products.length && (
        <div className="flyer-box bg-card p-6 text-center">
          <p className="font-ad text-xl uppercase text-red-700">{t('Failed to load products', 'Falha ao carregar produtos')}</p>
          {loadError && <p className="mt-2 text-sm text-blue-deep/80">{loadError}</p>}
          <div className="mt-4 flex justify-center">
            <button
              className="coupon-button bg-blue-mid px-4 py-2 text-card hover:-translate-y-1"
              onClick={() => router.push('/')}
              {...hotkey('escape', { title: t('Shortcut: Esc', 'Atalho: Esc') })}
            >
              {withShortcut(t('Back', 'Voltar'), `(${ESC_LABEL})`)}
            </button>
          </div>
        </div>
      )}

      {!isLoadingProducts && products.length > 0 && (!finished ? renderCurrent() : renderSummary())}


      {showSettings && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-blue-deep/40 px-4 py-5 backdrop-blur-sm"
          onClick={() => setShowSettings(false)}
        >
          <div
            className="relative max-h-full w-full max-w-lg overflow-y-auto rounded-xl bg-card p-5 shadow-flyer"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <button
                className="label-chip flex items-center gap-2 bg-blue-light/60 px-3 py-2"
                onClick={() => setShowSettings(false)}
                {...hotkey('escape', { priority: true, title: t('Shortcut: Esc', 'Atalho: Esc') })}
              >
                <ArrowLeft className="h-4 w-4" />
                {t('Back', 'Voltar')}
              </button>
              <p className="text-[10px] uppercase tracking-[0.4em] text-blue-mid">
                {t('Settings', 'Definições')}
              </p>
            </div>

            <div className="space-y-3">
              <div className="flyer-panel bg-card px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-blue-mid">
                  {t('Language', 'Idioma')}
                </p>
                <div className="mt-2 flex gap-2">
                  {['pt', 'en'].map((lng) => (
                    <button
                      key={lng}
                      onClick={() => {
                        setLanguage(lng as 'pt' | 'en');
                        playTick();
                      }}
                      className={`label-chip ${language === lng ? 'bg-blue-light text-blue-deep' : 'bg-card text-blue-deep/80'}`}
                    >
                      {lng === 'pt' ? 'PT' : 'EN'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flyer-panel flex items-center justify-between bg-card px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-blue-mid">
                  {t('Sound Effects', 'Efeitos sonoros')}
                </p>
                <SfxToggle size={32} />
              </div>
            </div>
          </div>
        </div>
      )}
    </Stage>
  );
}
