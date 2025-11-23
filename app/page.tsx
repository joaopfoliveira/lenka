'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, ChevronDown, Coins, DoorClosed, Gamepad2, Sparkles, Users } from 'lucide-react';
import Logo from './components/Logo';
import { useSfx } from './components/sfx/SfxProvider';
import { ensurePlayerClientId, resolvePlayerName } from './utils/playerIdentity';
import { useLanguage } from './hooks/useLanguage';
import TopControls from './components/TopControls';

export default function Home() {
  const router = useRouter();
  const [mode, setMode] = useState<'menu' | 'create' | 'join'>('menu');
  const [playerName, setPlayerName] = useState('');
  const [lobbyCode, setLobbyCode] = useState('');
  const [error, setError] = useState('');
  const [errorContext, setErrorContext] = useState<'create' | 'join' | ''>('');
  const { playTick, playDing } = useSfx();
  const [isLaunching, setIsLaunching] = useState(false);
  const { language } = useLanguage();
  const [isMobileLayout, setIsMobileLayout] = useState(false);
  const [layoutReady, setLayoutReady] = useState(false);
  const [activeMobileCard, setActiveMobileCard] = useState<'create' | 'join' | null>(null);
  const [showSoloConfig, setShowSoloConfig] = useState(false);
  const t = (en: string, pt: string) => (language === 'pt' ? pt : en);
  const DEFAULT_ROUNDS = 5;
  const DEFAULT_SOURCE: 'kuantokusta' | 'temu' | 'decathlon' | 'mixed' = 'mixed';
  const [soloRounds, setSoloRounds] = useState(DEFAULT_ROUNDS);
  const [soloSource, setSoloSource] = useState<'mixed' | 'kuantokusta' | 'temu' | 'decathlon'>(DEFAULT_SOURCE);
  const roundOptions = [5, 8, 10] as const;
  const productSourceOptions: Array<{
    value: 'mixed' | 'kuantokusta' | 'temu' | 'decathlon';
    label: { en: string; pt: string };
  }> = [
    { value: 'mixed', label: { en: 'Mixed', pt: 'Mistura' } },
    { value: 'kuantokusta', label: { en: 'KuantoKusta', pt: 'KuantoKusta' } },
    { value: 'temu', label: { en: 'Temu', pt: 'Temu' } },
    { value: 'decathlon', label: { en: 'Decathlon', pt: 'Decathlon' } },
  ];
  const mobileActionCards: Array<{ key: 'create' | 'join'; label: string; title: string; icon: typeof Gamepad2 }> = [
    {
      key: 'create',
      label: t('Host Mode', 'Modo anfitrião'),
      title: t('Create Game', 'Criar jogo'),
      icon: Gamepad2,
    },
    {
      key: 'join',
      label: t('Contestant', 'Concorrente'),
      title: t('Join Game', 'Junta-te a um jogo'),
      icon: DoorClosed,
    },
  ];
  const clearError = () => {
    setError('');
    setErrorContext('');
  };
  const setErrorFor = (context: 'create' | 'join', message: string) => {
    setError(message);
    setErrorContext(context);
  };
  const renderSoloForm = (variant: 'desktop' | 'mobile' = 'desktop', includeActions = true) => {
    const roundsControl =
      variant === 'mobile' ? (
        <div className="flyer-panel bg-blue-light/15 px-3 py-2">
          <label className="text-[10px] font-semibold uppercase tracking-[0.35em] text-blue-mid">
            {t('Rounds', 'Rondas')}
          </label>
          <select
            value={soloRounds}
            onChange={(e) => setSoloRounds(Number(e.target.value) as (typeof roundOptions)[number])}
            className="mt-2 w-full rounded-md border-2 border-blue-deep bg-card px-3 py-2 font-ad text-lg uppercase text-blue-deep focus:outline-none"
          >
            {roundOptions.map((option) => (
              <option key={`solo-round-${option}`} value={option}>
                {language === 'pt' ? `${option} rondas` : `${option} rounds`}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-blue-mid">
            {t('Rounds', 'Rondas')}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {roundOptions.map((option) => (
              <button
                key={`solo-round-${option}`}
                onClick={() => setSoloRounds(option)}
                className={`label-chip ${soloRounds === option ? 'bg-blue-light text-blue-deep' : 'bg-card text-blue-deep/80'}`}
              >
                {language === 'pt' ? `${option} rondas` : `${option} rounds`}
              </button>
            ))}
          </div>
        </div>
      );

    const sourceControl =
      variant === 'mobile' ? (
        <div className="flyer-panel bg-blue-light/15 px-3 py-2">
          <label className="text-[10px] font-semibold uppercase tracking-[0.35em] text-blue-mid">
            {t('Product source', 'Fonte de produtos')}
          </label>
          <select
            value={soloSource}
            onChange={(e) => setSoloSource(e.target.value as typeof soloSource)}
            className="mt-2 w-full rounded-md border-2 border-blue-deep bg-card px-3 py-2 font-ad text-lg uppercase text-blue-deep focus:outline-none"
          >
            {productSourceOptions.map((option) => (
              <option key={`solo-src-${option.value}`} value={option.value}>
                {language === 'pt' ? option.label.pt : option.label.en}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-blue-mid">
            {t('Product source', 'Fonte de produtos')}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {productSourceOptions.map((option) => (
              <button
                key={`solo-src-${option.value}`}
                onClick={() => setSoloSource(option.value)}
                className={`label-chip ${soloSource === option.value ? 'bg-blue-light text-blue-deep' : 'bg-card text-blue-deep/80'}`}
              >
                {language === 'pt' ? option.label.pt : option.label.en}
              </button>
            ))}
          </div>
        </div>
      );

    return (
      <div className={variant === 'desktop' ? 'space-y-4' : 'space-y-2'}>
        {variant === 'desktop' ? (
          <div className="flyer-panel bg-blue-light/15 px-4 py-3 space-y-3">
            {roundsControl}
            {sourceControl}
          </div>
        ) : (
          <div className="space-y-2">
            {roundsControl}
            {sourceControl}
          </div>
        )}

        {includeActions && (
          <button
            onClick={() => handleStartSolo()}
            disabled={isLaunching}
            className={`coupon-button flex items-center justify-between bg-blue-mid px-6 py-4 text-lg text-card transition ${
              isLaunching ? 'cursor-not-allowed opacity-60' : 'hover:-translate-y-0.5'
            }`}
          >
            <span className="font-ad text-xl uppercase">{t('Start', 'Começar')}</span>
          </button>
        )}
      </div>
    );
  };
  const renderCreateForm = (variant: 'desktop' | 'mobile' = 'desktop') => (
    <div className={variant === 'desktop' ? 'space-y-4' : 'space-y-3'}>
      <div className="flyer-panel bg-card px-3 py-2">
        <label className="text-[11px] font-semibold uppercase tracking-[0.4em] text-blue-mid">
          {t('Your Name', 'O teu nome')}
        </label>
        <input
          type="text"
          value={playerName}
          onChange={(e) => {
            setPlayerName(e.target.value);
            clearError();
          }}
          placeholder={t('', '')}
          className="mt-2 w-full bg-transparent text-2xl font-ad uppercase text-blue-deep placeholder:text-blue-deep/40 focus:outline-none"
          maxLength={20}
        />
      </div>

      {variant === 'desktop' && (
        <div className="flyer-panel bg-blue-light/20 px-4 py-3 text-sm font-display text-blue-deep/80">
          {t(
            'Lenka will ask rounds and source once inside. Adjust everything in the lobby before you start.',
            'A Lenka pergunta rondas e fonte já dentro. Ajusta tudo no lobby antes de começar.'
          )}
        </div>
      )}

      {error && errorContext === 'create' && (
        <div className="flyer-panel border-red-500 bg-red-100 px-4 py-3 text-sm font-semibold text-red-700">
          ⚠️ {error}
        </div>
      )}

      <button
        onClick={handleCreateLobby}
        disabled={isLaunching}
        className={`coupon-button w-full items-center justify-between bg-blue-mid px-6 py-4 text-lg text-card ${
          isLaunching ? 'cursor-not-allowed opacity-60' : 'hover:-translate-y-1'
        }`}
      >
        <span className="font-ad text-l uppercase">{t('Start', 'Começar')}</span>
      </button>
    </div>
  );

  const renderJoinForm = (variant: 'desktop' | 'mobile' = 'desktop') => (
    <div className={variant === 'desktop' ? 'space-y-4' : 'space-y-3'}>
      <div className="flyer-panel bg-card px-3 py-2">
        <label className="text-[11px] font-semibold uppercase tracking-[0.4em] text-blue-mid">
          {t('Your Name', 'O teu nome')}
        </label>
        <input
          type="text"
          value={playerName}
          onChange={(e) => {
            setPlayerName(e.target.value);
            clearError();
          }}
          placeholder={t('', '')}
          className="mt-2 w-full bg-transparent text-2xl font-ad uppercase text-blue-deep placeholder:text-blue-deep/40 focus:outline-none"
          maxLength={20}
        />
      </div>

      <div className="flyer-panel bg-blue-light/20 px-3 py-2">
        <label className="text-[11px] font-semibold uppercase tracking-[0.4em] text-blue-mid">
          {t('Lobby Code', 'Código do lobby')}
        </label>
        <input
          type="text"
          value={lobbyCode}
          onChange={(e) => {
            setLobbyCode(e.target.value.toUpperCase());
            clearError();
          }}
          placeholder=""
          className="mt-2 w-full bg-transparent text-2xl font-ad uppercase text-blue-deep placeholder:text-blue-deep/40 focus:outline-none"
          maxLength={6}
        />
      </div>

      {variant === 'desktop' && (
        <div className="flyer-panel bg-blue-light/20 px-4 py-3 text-sm font-display text-blue-deep/80">
          {t('Punch in the secret code and step onto the showroom floor.', 'Introduz o código secreto e sobe ao palco.')}
        </div>
      )}

      {error && errorContext === 'join' && (
        <div className="flyer-panel border-red-500 bg-red-100 px-4 py-3 text-sm font-semibold text-red-700">
          ⚠️ {error}
        </div>
      )}

      <button
        onClick={handleJoinLobby}
        className="coupon-button w-full flex items-center justify-center bg-blue-mid px-5 py-4 text-lg text-card hover:-translate-y-1"
      >
        <span className="font-ad text-xl uppercase">{t('Join', 'Entrar')}</span>
      </button>
    </div>
  );

  const handleToggleMobileCard = (cardKey: 'create' | 'join') => {
    setActiveMobileCard((prev) => (prev === cardKey ? null : cardKey));
    clearError();
    playTick();
  };
  const heroHighlights = [
    {
      icon: Users,
      label: t('Players', 'Jogadores'),
      title: t('1–8', '1–8'),
      description: t('Solo duel or full crew.', 'A solo ou com toda a equipa.'),
    },
    {
      icon: Gamepad2,
      label: t('Host tools', 'Ferramentas do anfitrião'),
      title: t('Rounds + store', 'Rondas + loja'),
      description: t('Tweak everything before launch.', 'Afina tudo antes de começar.'),
    },
    {
      icon: Sparkles,
      label: t('Vibe', 'Vibe'),
      title: t('Flash rounds', 'Rondas relâmpago'),
      description: t('Vintage flyer energy, price thrills.', 'Energia vintage e preços a ferver.'),
    },
  ];

  useEffect(() => {
    router.prefetch('/lobby/__create__');
    ensurePlayerClientId();
  }, [router]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => setIsMobileLayout(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    setLayoutReady(true);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!isMobileLayout) {
      setActiveMobileCard(null);
    }
  }, [isMobileLayout]);

  const handleCreateLobby = () => {
    clearError();
    const { finalName } = resolvePlayerName(playerName, setPlayerName);
    localStorage.setItem('playerName', finalName);
    localStorage.setItem('createLobby', 'true');
    localStorage.setItem('roundsTotal', DEFAULT_ROUNDS.toString());
    localStorage.setItem('productSource', DEFAULT_SOURCE);
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem('lenka:lastLobbyCode');
    }
    ensurePlayerClientId();
    playDing();
    setIsLaunching(true);
    router.push('/lobby/__create__?solo=1');
  };

  const handleJoinLobby = () => {
    clearError();
    const { finalName } = resolvePlayerName(playerName, setPlayerName);
    if (!lobbyCode.trim()) {
      setErrorFor('join', t('Please enter the lobby code', 'Introduz o código do lobby'));
      return;
    }

    localStorage.setItem('playerName', finalName);
    ensurePlayerClientId();
    playDing();
    router.push(`/lobby/${lobbyCode.toUpperCase()}`);
  };
const handleStartSolo = () => {
    clearError();
    const { finalName } = resolvePlayerName(playerName, setPlayerName);
    localStorage.setItem('playerName', finalName);
    localStorage.setItem('soloRounds', soloRounds.toString());
    localStorage.setItem('soloSource', soloSource);
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem('lenka:soloMode', 'true');
    }
    ensurePlayerClientId();
    playDing();
    setIsLaunching(true);
    router.push('/solo');
  };

  if (!layoutReady) {
    return null;
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-page px-4 pb-10 pt-16 text-blue-deep sm:pt-6">
      <TopControls />
      {isLaunching && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-blue-deep/80 px-6 text-card">
          <div className="flyer-box max-w-lg bg-blue-mid text-center text-card">
            <p className="font-ad text-xs uppercase tracking-[0.45em]">{t('Showtime prep', 'A preparar o espetáculo')}</p>
            <p className="mt-3 font-ad text-3xl uppercase">
              {t('Opening your private showcase…', 'A abrir o teu showcase privado…')}
            </p>
            <p className="mt-2 font-display text-base text-card/90">
              {t('Hang tight while Lenka polishes the prizes.', 'Espera enquanto a Lenka prepara os prémios.')}
            </p>
          </div>
        </div>
      )}

      <div className="pointer-events-none absolute inset-0">
        <motion.div
          className="absolute -left-10 top-8 h-48 w-48 rotate-6 rounded-lg bg-blue-light/30 blur-3xl"
          animate={{ rotate: 10 }}
          initial={false}
          transition={{ repeat: Infinity, repeatType: 'reverse', duration: 16, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute -right-12 bottom-10 h-56 w-56 -rotate-3 rounded-lg bg-blue-mid/25 blur-3xl"
          animate={{ rotate: -8 }}
          initial={false}
          transition={{ repeat: Infinity, repeatType: 'reverse', duration: 18, ease: 'easeInOut' }}
        />
      </div>

      <div className="relative z-10 mx-auto flex max-w-5xl flex-col gap-10">
        {isMobileLayout ? (
          <div className="flex flex-col items-center text-center">
            <Logo width={260} height={104} className="mb-3 max-w-full" />
            <h1 className="font-ad text-lg uppercase leading-snug text-blue-deep">
              {t('Guess the price, steal the spotlight.', 'Adivinha o preço e prova que és o melhor capitalista!')}
            </h1>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <Logo width={420} height={168} className="-mt-2 -mb-4 max-w-full" />
            <div className="flyer-box mt-6 w-full bg-card px-5 py-5 text-center">
              <p className="font-ad text-[12px] uppercase tracking-[0.45em] text-blue-mid">
                {t('Welcome to Lenka', 'Bem-vindo à Lenka')}
              </p>
              <h1 className="mt-2 font-ad text-xl uppercase leading-snug text-blue-deep sm:text-2xl">
                {t('Guess the price, steal the spotlight.', 'Adivinha o preço e prova que és o melhor capitalista!')}
              </h1>
              <p className="mt-3 font-display text-sm text-blue-deep/80 sm:text-base">
                {t(
                  'Lenka is a price-guessing party. Host a lobby, invite players, then shout the closest total when the items drop.',
                  'A Lenka é um party game de adivinhar preços. Cria um lobby, convida jogadores e grita o total mais próximo quando os artigos aparecem.'
                )}
              </p>
            </div>
          </div>
        )}

        <section className="hidden w-full flyer-box bg-card px-6 py-6 md:block">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <p className="font-ad text-[10px] uppercase tracking-[0.45em] text-blue-mid">
                {t('Single Player', 'Jogo Individual')}
              </p>
              <h2 className="font-display text-3xl font-semibold">
                {t('Play solo, fast and simple.', 'Joga sozinho, rápido e simples.')}
              </h2>
            </div>
          </div>
          {renderSoloForm('desktop')}
        </section>

        <section className="hidden w-full flyer-box bg-card px-6 py-6 md:block">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <p className="font-ad text-[10px] uppercase tracking-[0.45em] text-blue-mid">
                {t('Multiplayer', 'Multijogador')}
              </p>
              <h2 className="font-display text-3xl font-semibold">
                {mode === 'menu'
                  ? t('Pick your coupon', 'Escolhe o cupão')
                  : mode === 'create'
                  ? t('Create a showcase', 'Cria um espetáculo')
                  : t('Join a lobby', 'Entra num lobby')}
              </h2>
            </div>
            {mode !== 'menu' && (
              <button
                className="label-chip flex items-center gap-2 rounded-md bg-blue-light/60 px-3 py-2"
                onClick={() => {
                  setMode('menu');
                  clearError();
                  playTick();
                }}
              >
                <ArrowLeft className="h-4 w-4" />
                {t('Back', 'Voltar')}
              </button>
            )}
          </div>

          <div className="space-y-6">
            {mode === 'menu' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <button
                  onClick={() => {
                    setMode('create');
                    clearError();
                    playTick();
                  }}
                  className="coupon-button flex h-full flex-col justify-between bg-blue-mid px-5 py-5 text-left text-card hover:-translate-y-1"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.35em] text-card/90">
                        {t('Host Mode', 'Modo anfitrião')}
                      </p>
                      <p className="mt-1 font-ad text-2xl uppercase">{t('Create Lobby', 'Criar lobby')}</p>
                      <p className="mt-1 font-display text-sm text-card/90">
                        {t('Pick rounds, invite friends, rule the prices.', 'Escolhe rondas, convida amigos e dita os preços.')}
                      </p>
                    </div>
                    <div className="promo-badge rounded-md px-3 py-2">
                      <Gamepad2 className="h-6 w-6" />
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setMode('join');
                    clearError();
                    playTick();
                  }}
                  className="coupon-button flex h-full flex-col justify-between bg-card px-5 py-5 text-left hover:-translate-y-1"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.35em] text-blue-mid">
                        {t('Contestant', 'Concorrente')}
                      </p>
                      <p className="mt-1 font-ad text-2xl uppercase text-blue-deep">
                        {t('Join Lobby', 'Entrar no lobby')}
                      </p>
                      <p className="mt-1 font-display text-sm text-blue-deep/80">
                        {t('Drop the secret code and take the stage.', 'Introduce o código e sobe ao palco.')}
                      </p>
                    </div>
                    <div className="promo-badge rounded-md bg-blue-light text-blue-deep">
                      <DoorClosed className="h-6 w-6" />
                    </div>
                  </div>
                </button>
              </div>
            )}

            {mode === 'create' && renderCreateForm('desktop')}

            {mode === 'join' && (
              <div className="grid gap-6 lg:grid-cols-[0.9fr,1.1fr]">
                <div className="flyer-panel bg-blue-light/25 px-5 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-blue-mid">
                    {t('Contestant Coupon', 'Cupão de concorrente')}
                  </p>
                  <h3 className="font-ad text-3xl uppercase leading-tight">{t('Join a lobby', 'Entra num lobby')}</h3>
                  <p className="mt-2 font-display text-sm text-blue-deep/80">
                    {t('Punch in the secret code and step onto the showroom floor.', 'Introduz o código secreto e sobe ao palco.')}
                  </p>
                </div>
                {renderJoinForm('desktop')}
              </div>
            )}
          </div>
        </section>
        <section className="flyer-box block w-full bg-card px-4 py-5 md:hidden">
          <div className="space-y-4">
            <div className="flyer-panel bg-card px-4 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.35em] text-blue-mid">{t('Single Player', 'Jogo Individual')}</p>
                </div>
              </div>
              {!showSoloConfig && (
                <div className="mt-3">
                  <button
                    className="coupon-button w-full bg-blue-mid px-4 py-3 text-card hover:-translate-y-1"
                    onClick={() => {
                      setShowSoloConfig(true);
                      setActiveMobileCard(null);
                      clearError();
                      playTick();
                    }}
                  >
                    {t('Start game', 'Começar jogo')}
                  </button>
                </div>
              )}
              {showSoloConfig && (
                <div className="mt-3 space-y-3 border-t border-blue-light/40 pt-3">
                  {renderSoloForm('mobile', false)}
                  <div className="flex items-center gap-2">
                    <button
                      className="coupon-button flex-1 bg-blue-mid px-4 py-3 text-sm text-card hover:-translate-y-0.5"
                      onClick={() => handleStartSolo()}
                      disabled={isLaunching}
                    >
                      {isLaunching ? t('Starting...', 'A iniciar...') : t('Start', 'Começar')}
                    </button>
                    <button
                      className="coupon-button flex-1 bg-card px-4 py-3 text-sm hover:-translate-y-1"
                      onClick={() => setShowSoloConfig(false)}
                      disabled={isLaunching}
                    >
                      {t('Back', 'Voltar')}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flyer-panel bg-card px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.35em] text-blue-mid">{t('Multiplayer', 'Multijogador')}</p>
              <div className="mt-3 space-y-3">
                {mobileActionCards.map(({ key, label, title, icon: Icon }) => {
                  const open = activeMobileCard === key;
                  return (
                    <div key={key} className="flyer-panel bg-card px-3 py-2">
                      <button
                        className="flex w-full items-center justify-between text-left"
                        onClick={() => {
                          setShowSoloConfig(false);
                          handleToggleMobileCard(key);
                        }}
                      >
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.35em] text-blue-mid">{label}</p>
                          <p className="font-ad text-lg uppercase text-blue-deep">{title}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="promo-badge rounded-md bg-blue-light/70 px-2 py-2 text-blue-deep">
                            <Icon className="h-5 w-5" />
                          </div>
                          <ChevronDown className={`h-5 w-5 transition-transform ${open ? 'rotate-180' : ''}`} />
                        </div>
                      </button>
                      {open && (
                        <div className="mt-3 border-t border-blue-light/40 pt-3">
                          {key === 'create' ? renderCreateForm('mobile') : renderJoinForm('mobile')}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="hidden w-full flyer-box bg-card px-5 py-5 md:block">
          <div className="mb-4 text-center">
            <p className="font-ad text-[10px] uppercase tracking-[0.45em] text-blue-mid">
              {t('How it plays', 'Como funciona')}
            </p>
            <h3 className="mt-1 font-display text-2xl font-semibold text-blue-deep">
              {t('Quick rundown before you launch', 'Resumo rápido antes de começar')}
            </h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {heroHighlights.map(({ icon: Icon, label, title, description }) => (
              <div key={label} className="flyer-panel flex items-start gap-3 bg-blue-light/10 px-4 py-4">
                <Icon className="mt-1 h-5 w-5 text-blue-mid" />
                <div>
                  <p className="text-[10px] uppercase tracking-[0.4em] text-blue-mid">{label}</p>
                  <p className="font-ad text-xl uppercase text-blue-deep">{title}</p>
                  <p className="text-sm text-blue-deep/80">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
