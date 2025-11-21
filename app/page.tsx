'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, ChevronDown, Coins, DoorClosed, Gamepad2, Sparkles, Users } from 'lucide-react';
import Logo from './components/Logo';
import { useSfx } from './components/sfx/SfxProvider';
import SfxToggle from './components/sfx/SfxToggle';
import { ensurePlayerClientId, resolvePlayerName } from './utils/playerIdentity';
import { useLanguage, type Language } from './hooks/useLanguage';

export default function Home() {
  const router = useRouter();
  const [mode, setMode] = useState<'menu' | 'create' | 'join'>('menu');
  const [playerName, setPlayerName] = useState('');
  const [lobbyCode, setLobbyCode] = useState('');
  const [error, setError] = useState('');
  const { playTick, playDing } = useSfx();
  const [isLaunching, setIsLaunching] = useState(false);
  const { language, setLanguage } = useLanguage();
  const settingsCardRef = useRef<HTMLDivElement | null>(null);
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
  const languageOptions: Array<{ value: Language; label: string; flag: string }> = [
    { value: 'pt', label: 'Português', flag: '🇵🇹' },
    { value: 'en', label: 'English', flag: '🇬🇧' },
  ];
  const selectedLanguage = languageOptions.find((option) => option.value === language) ?? languageOptions[0];
  const DEFAULT_ROUNDS = 5;
  const DEFAULT_SOURCE: 'kuantokusta' | 'temu' | 'decathlon' | 'mixed' = 'mixed';
  const t = (en: string, pt: string) => (language === 'pt' ? pt : en);
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
    const handleClickOutside = (event: MouseEvent) => {
      if (!settingsCardRef.current) return;
      if (!settingsCardRef.current.contains(event.target as Node)) {
        setIsLanguageMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCreateLobby = () => {
    setError('');
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
    router.push('/lobby/__create__');
  };

  const handleJoinLobby = () => {
    const { finalName } = resolvePlayerName(playerName, setPlayerName);
    if (!lobbyCode.trim()) {
      setError(t('Please enter the lobby code', 'Introduz o código do lobby'));
      return;
    }

    localStorage.setItem('playerName', finalName);
    ensurePlayerClientId();
    playDing();
    router.push(`/lobby/${lobbyCode.toUpperCase()}`);
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-page px-4 pb-10 pt-4 text-blue-deep">
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
        <div className="flex flex-col items-center">
          <Logo width={420} height={168} className="-mt-2 -mb-4 max-w-full" />
          <div className="flyer-box mt-6 w-full bg-card px-5 py-5 text-center">
            <p className="font-ad text-[12px] uppercase tracking-[0.45em] text-blue-mid">
              {t('Welcome to Lenka', 'Bem-vindo à Lenka')}
            </p>
            <h1 className="mt-2 font-ad text-xl uppercase leading-snug text-blue-deep sm:text-2xl">
              {t('Guess the price, steal the spotlight.', 'Adivinha o preço e conquista os holofotes.')}
            </h1>
            <p className="mt-3 font-display text-sm text-blue-deep/80 sm:text-base">
              {t(
                'Lenka is a price-guessing party. Host a lobby, invite players, then shout the closest total when the items drop.',
                'A Lenka é um party game de adivinhar preços. Cria um lobby, convida jogadores e grita o total mais próximo quando os artigos aparecem.'
              )}
            </p>
          </div>
        </div>

        <section className="flyer-box w-full bg-card px-6 py-6">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <p className="font-ad text-[10px] uppercase tracking-[0.45em] text-blue-mid">
                {t('Lobby Control', 'Gestão do Lobby')}
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
                  setError('');
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
                    setError('');
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
                    setError('');
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

            {mode === 'create' && (
              <div className="space-y-4">
                <div className="flyer-panel bg-card px-4 py-3">
                  <label className="text-[11px] font-semibold uppercase tracking-[0.4em] text-blue-mid">
                    {t('Your Name', 'O teu nome')}
                  </label>
                  <input
                    type="text"
                    value={playerName}
                    onChange={(e) => {
                      setPlayerName(e.target.value);
                      setError('');
                    }}
                    placeholder={t('Show host name', 'Nome do anfitrião')}
                    className="mt-2 w-full bg-transparent text-2xl font-ad uppercase text-blue-deep placeholder:text-blue-deep/40 focus:outline-none"
                    maxLength={20}
                  />
                </div>

                <div className="flyer-panel bg-blue-light/20 px-4 py-3 text-sm font-display text-blue-deep/80">
                  {t(
                    'Lenka will ask rounds and source once inside. Adjust everything in the lobby before you start.',
                    'A Lenka pergunta rondas e fonte já dentro. Ajusta tudo no lobby antes de começar.'
                  )}
                </div>

                {error && (
                  <div className="flyer-panel border-red-500 bg-red-100 px-4 py-3 text-sm font-semibold text-red-700">
                    ⚠️ {error}
                  </div>
                )}

                <button
                  onClick={handleCreateLobby}
                  disabled={isLaunching}
                  className={`coupon-button flex items-center justify-between bg-blue-mid px-6 py-4 text-lg text-card ${
                    isLaunching ? 'cursor-not-allowed opacity-60' : 'hover:-translate-y-1'
                  }`}
                >
                  <span className="font-ad text-xl uppercase">{t('Launch the lobby', 'Lançar o lobby')}</span>
                  <Sparkles className="h-6 w-6" />
                </button>
              </div>
            )}

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
                <div className="space-y-4">
                  <div className="flyer-panel bg-card px-4 py-3">
                    <label className="text-[11px] font-semibold uppercase tracking-[0.4em] text-blue-mid">
                      {t('Your Name', 'O teu nome')}
                    </label>
                    <input
                      type="text"
                      value={playerName}
                      onChange={(e) => {
                        setPlayerName(e.target.value);
                        setError('');
                      }}
                      placeholder={t('Contestant name', 'Nome do concorrente')}
                      className="mt-2 w-full bg-transparent text-2xl font-ad uppercase text-blue-deep placeholder:text-blue-deep/40 focus:outline-none"
                      maxLength={20}
                    />
                  </div>

                  <div className="flyer-panel bg-blue-light/20 px-4 py-3">
                    <label className="text-[11px] font-semibold uppercase tracking-[0.4em] text-blue-mid">
                      {t('Lobby Code', 'Código do lobby')}
                    </label>
                    <input
                      type="text"
                      value={lobbyCode}
                      onChange={(e) => {
                        setLobbyCode(e.target.value.toUpperCase());
                        setError('');
                      }}
                      placeholder="ABC123"
                      className="mt-2 w-full bg-card text-center font-ad text-4xl uppercase tracking-[0.6em] text-blue-deep placeholder:text-blue-deep/30 focus:outline-none"
                      maxLength={6}
                    />
                  </div>

                  {error && (
                    <div className="flyer-panel border-red-500 bg-red-100 px-4 py-3 text-sm font-semibold text-red-700">
                      ⚠️ {error}
                    </div>
                  )}

                  <button
                    onClick={handleJoinLobby}
                    className="coupon-button flex items-center justify-between bg-blue-mid px-6 py-4 text-lg text-card hover:-translate-y-1"
                  >
                    <span className="font-ad text-xl uppercase">{t('Join the show', 'Entrar no show')}</span>
                    <Coins className="h-6 w-6" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
        <section className="flyer-box w-full bg-card px-5 py-5">
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
        <section className="flyer-box w-full bg-card px-5 py-5" ref={settingsCardRef}>
          <div className="mb-4 text-center">
            <p className="font-ad text-[10px] uppercase tracking-[0.45em] text-blue-mid">
              {t('Backstage settings', 'Definições de bastidores')}
            </p>
            <h3 className="mt-1 font-display text-2xl font-semibold text-blue-deep">
              {t('Sound + language, right here.', 'Som e idioma, mesmo aqui.')}
            </h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col">
              <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-blue-mid">
                {t('Sound Effects', 'Efeitos sonoros')}
              </p>
              <div className="mt-2 flex flex-1 items-center gap-3">
                <div className="flyer-panel flex w-full items-center justify-between bg-card px-4 py-2">
                  <p className="text-sm font-display text-blue-deep/80">
                    {t('Mute the buzzers whenever you need.', 'Silencia os efeitos quando quiseres.')}
                  </p>
                  <SfxToggle />
                </div>
              </div>
            </div>
            <div className="flex flex-col">
              <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-blue-mid">
                {t('Language', 'Idioma')}
              </p>
              <div className="relative mt-2 flex-1">
                <button
                  onClick={() => setIsLanguageMenuOpen((prev) => !prev)}
                  className="flyer-panel flex w-full items-center justify-between bg-card px-3 py-2"
                >
                  <span className="flex items-center gap-2 font-display">
                    <span className="text-lg">{selectedLanguage.flag}</span>
                    <span>{selectedLanguage.label}</span>
                  </span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${isLanguageMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                {isLanguageMenuOpen && (
                  <div className="absolute left-0 right-0 top-full z-20 mt-2 space-y-1 rounded-md border-2 border-blue-deep bg-card p-1 shadow-flyer-sm">
                    {languageOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setLanguage(option.value);
                          setIsLanguageMenuOpen(false);
                        }}
                        className={`flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left font-display ${
                          option.value === language
                            ? 'bg-blue-light/40 text-blue-deep font-semibold'
                            : 'text-blue-deep/80 hover:bg-blue-light/25'
                        }`}
                      >
                        <span className="text-lg">{option.flag}</span>
                        <span>{option.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>

    </div>
  );
}
