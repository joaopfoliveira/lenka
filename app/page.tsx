'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  ChevronDown,
  Coins,
  DoorClosed,
  Gamepad2,
  Settings,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
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
  const [showSettings, setShowSettings] = useState(false);
  const languageOptions: Array<{ value: Language; label: string; flag: string }> = [
    { value: 'pt', label: 'Português', flag: '🇵🇹' },
    { value: 'en', label: 'English', flag: '🇬🇧' },
  ];
  const selectedLanguage = languageOptions.find((option) => option.value === language) ?? languageOptions[0];
  const DEFAULT_ROUNDS = 5;
  const DEFAULT_SOURCE: 'kuantokusta' | 'temu' | 'decathlon' | 'mixed' = 'mixed';
  const t = (en: string, pt: string) => (language === 'pt' ? pt : en);

  useEffect(() => {
    router.prefetch('/lobby/__create__');
    ensurePlayerClientId();
  }, [router]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!settingsCardRef.current) return;
      if (!settingsCardRef.current.contains(event.target as Node)) {
        setShowSettings(false);
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
    <div className="relative min-h-screen overflow-hidden bg-lenka-stage px-4 py-10 text-white">
      {isLaunching && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85 text-center text-white backdrop-blur-sm">
          <p className="text-sm uppercase tracking-[0.4em] text-white/60">
            {t('Showtime prep', 'A preparar o espetáculo')}
          </p>
          <p className="mt-2 text-3xl font-bold text-lenka-gold">
            {t('Opening your private showcase…', 'A abrir o teu showcase privado…')}
          </p>
          <p className="mt-2 text-white/70">
            {t('Hang tight while Lenka polishes the prizes.', 'Espera enquanto a Lenka prepara os prémios.')}
          </p>
        </div>
      )}
      <div className="pointer-events-none absolute inset-0">
        <motion.div
          className="absolute -right-10 top-16 h-72 w-72 rounded-full bg-gradient-to-br from-lenka-gold/40 to-transparent blur-[120px]"
          animate={{ rotate: 360 }}
          initial={false}
          transition={{ repeat: Infinity, duration: 40, ease: 'linear' }}
        />
        <motion.div
          className="absolute -left-16 bottom-10 h-80 w-80 rounded-full bg-gradient-to-tr from-lenka-pink/30 to-transparent blur-[120px]"
          animate={{ rotate: -360 }}
          initial={false}
          transition={{ repeat: Infinity, duration: 55, ease: 'linear' }}
        />
      </div>

      <div className="relative z-10 mx-auto flex max-w-6xl flex-col gap-8 lg:flex-row lg:items-start">
        <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lenka-card backdrop-blur transition-all duration-200">
          <div className="flex flex-col gap-4">
            <div className="flex justify-center">
              <Logo width={220} height={120} className="drop-shadow-lg" />
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.4em] text-white/80">
                {t('Welcome to Lenka', 'Bem-vindo à Lenka')}
              </p>
              <h1 className="text-4xl font-bold leading-tight text-white">
                {t('Guess the price, steal the spotlight.', 'Adivinha o preço e conquista os holofotes.')}
              </h1>
            </div>
            <p className="text-base text-lenka-pearl/80">
              {t(
                'Create a lobby for your crew or join an existing show. Lenka keeps every round fast, loud, and totally unpredictable.',
                'Cria um lobby para a tua equipa ou junta-te a um jogo existente. A Lenka mantém cada ronda rápida, barulhenta e imprevisível.'
              )}
            </p>
            <div className="grid grid-cols-2 gap-4 text-sm text-lenka-pearl">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center gap-2 text-white">
                  <Users className="h-5 w-5 text-lenka-gold" />
                  <span className="font-semibold uppercase tracking-wide">
                    {t('Players', 'Jogadores')}
                  </span>
                </div>
                <p className="mt-2 text-2xl font-bold text-white">{t('1-8 friends', '1-8 amigos')}</p>
                <p className="text-xs text-white/70">
                  {t('Party mode recommended', 'Modo festa recomendado')}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center gap-2 text-white">
                  <Sparkles className="h-5 w-5 text-lenka-teal" />
                  <span className="font-semibold uppercase tracking-wide">
                    {t('Settings', 'Configurações')}
                  </span>
                </div>
                <p className="mt-2 text-2xl font-bold text-white">
                  {t('Pick inside the lobby', 'Escolhe dentro do lobby')}
                </p>
                <p className="text-xs text-white/70">
                  {t('Set rounds and store right before starting.', 'Define rondas e loja antes de começares o jogo.')}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="w-full rounded-3xl border border-white/20 bg-gradient-to-br from-white/15 via-white/10 to-transparent p-6 shadow-lenka-card backdrop-blur-xl transition-all duration-200 lg:max-w-xl">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-white/60">
                {t('Lobby Control', 'Gestão do Lobby')}
              </p>
              <h2 className="text-3xl font-extrabold text-lenka-gold">
                {mode === 'menu'
                  ? t('Choose Your Move', 'Escolhe a jogada')
                  : mode === 'create'
                  ? t('Create a Showcase', 'Cria um espetáculo')
                  : t('Join a Lobby', 'Entra num lobby')}
              </h2>
            </div>
            {mode !== 'menu' && (
              <button
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-colors duration-150 hover:bg-white/20"
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
              <div className="space-y-4">
                <button
                  onClick={() => {
                    setMode('create');
                    setError('');
                    playTick();
                  }}
                  className="w-full rounded-2xl border border-lenka-gold/60 bg-gradient-to-r from-lenka-electric/80 to-lenka-pink/80 p-5 text-left shadow-lenka-glow transition-transform duration-150 hover:scale-[1.005]"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-white/70">
                        {t('Host Mode', 'Modo anfitrião')}
                      </p>
                      <p className="mt-1 text-2xl font-bold text-white">
                        {t('Create Lobby', 'Criar lobby')}
                      </p>
                      <p className="text-sm text-white/80">
                        {t('Pick rounds, invite friends, rule the prices.', 'Escolhe rondas, convida amigos e dita os preços.')}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white/15 p-4">
                      <Gamepad2 className="h-10 w-10 text-lenka-gold" />
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setMode('join');
                    setError('');
                    playTick();
                  }}
                  className="w-full rounded-2xl border border-white/10 bg-white/10 p-5 text-left transition-transform duration-150 hover:scale-[1.005]"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-white/70">
                        {t('Contestant', 'Concorrente')}
                      </p>
                      <p className="mt-1 text-2xl font-bold">{t('Join Lobby', 'Entrar no lobby')}</p>
                      <p className="text-sm text-white/80">
                        {t('Drop the secret code and take the stage.', 'Introduce o código e sobe ao palco.')}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white/15 p-4">
                      <DoorClosed className="h-10 w-10 text-white" />
                    </div>
                  </div>
                </button>
              </div>
            )}

            {mode === 'create' && (
              <div className="space-y-6">
                <div>
                  <label className="text-sm font-semibold uppercase tracking-[0.3em] text-white/70">
                    {t('Your Name', 'O teu nome')}
                  </label>
                  <div className="mt-2 rounded-2xl border border-white/20 bg-white/5 px-4 py-3">
                    <input
                      type="text"
                      value={playerName}
                      onChange={(e) => {
                        setPlayerName(e.target.value);
                        setError('');
                      }}
                      placeholder={t('Show host name', 'Nome do anfitrião')}
                      className="w-full bg-transparent text-lg font-semibold text-white placeholder:text-white/40 focus:outline-none"
                      maxLength={20}
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80">
                  {t(
                    'Adjust rounds and store (KuantoKusta, Temu, Decathlon or mixed) directly inside the lobby before starting the match.',
                    'Ajusta o número de rondas e a loja (KuantoKusta, Temu, Decathlon ou mistura) diretamente no lobby, antes de começar o jogo.'
                  )}
                </div>

                {error && (
                  <div className="rounded-2xl border border-red-400/60 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-200">
                    ⚠️ {error}
                  </div>
                )}

                <div className="space-y-3 pt-2">
                <button
                  onClick={handleCreateLobby}
                  disabled={isLaunching}
                  className={`flex w-full items-center justify-between rounded-2xl border px-6 py-4 text-lg font-bold text-white shadow-lenka-glow transition-transform duration-150 ${
                    isLaunching
                      ? 'cursor-not-allowed border-white/20 bg-white/10 text-white/40'
                      : 'border-lenka-gold bg-gradient-to-r from-lenka-gold/80 to-lenka-pink/80 hover:scale-[1.005]'
                  }`}
                >
                  <span>{t('Launch The Lobby', 'Lançar o lobby')}</span>
                  <Sparkles className="h-6 w-6" />
                </button>
                </div>
              </div>
            )}

            {mode === 'join' && (
              <div className="space-y-6">
                <div>
                  <label className="text-sm font-semibold uppercase tracking-[0.3em] text-white/70">
                    {t('Your Name', 'O teu nome')}
                  </label>
                  <div className="mt-2 rounded-2xl border border-white/20 bg-white/5 px-4 py-3">
                    <input
                      type="text"
                      value={playerName}
                      onChange={(e) => {
                        setPlayerName(e.target.value);
                        setError('');
                      }}
                      placeholder={t('Contestant name', 'Nome do concorrente')}
                      className="w-full bg-transparent text-lg font-semibold text-white placeholder:text-white/40 focus:outline-none"
                      maxLength={20}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold uppercase tracking-[0.3em] text-white/70">
                    {t('Lobby Code', 'Código do lobby')}
                  </label>
                  <div className="mt-2 rounded-2xl border border-white/20 bg-white/5 px-4 py-3 text-center">
                    <input
                      type="text"
                      value={lobbyCode}
                      onChange={(e) => {
                        setLobbyCode(e.target.value.toUpperCase());
                        setError('');
                      }}
                      placeholder="ABC123"
                      className="w-full bg-transparent text-center text-4xl font-black tracking-[0.5em] text-white placeholder:text-white/20 focus:outline-none"
                      maxLength={6}
                    />
                  </div>
                </div>

                {error && (
                  <div className="rounded-2xl border border-red-400/60 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-200">
                    ⚠️ {error}
                  </div>
                )}

                <button
                  onClick={handleJoinLobby}
                  className="flex w-full items-center justify-between rounded-2xl border border-white/30 bg-gradient-to-r from-lenka-electric/80 to-lenka-teal/70 px-6 py-4 text-lg font-bold text-white shadow-lenka-card transition-transform duration-150 hover:scale-[1.005]"
                >
                  <span>{t('Join The Show', 'Entrar no show')}</span>
                  <Coins className="h-6 w-6" />
                </button>
              </div>
            )}
          </div>
        </section>
      </div>
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4 sm:inset-auto sm:left-8 sm:bottom-8 sm:px-0 sm:justify-start">
        <div className="pointer-events-auto flex w-full max-w-sm flex-col items-start gap-3" ref={settingsCardRef}>
          {!showSettings && (
            <button
              onClick={() => setShowSettings(true)}
              className="flex h-12 w-12 items-center justify-center rounded-full border border-white/30 bg-white/10 text-white shadow-lg transition hover:bg-white/20"
              aria-label={t('Open settings', 'Abrir definições')}
            >
              <Settings className="h-5 w-5" />
            </button>
          )}
          {showSettings && (
            <div className="w-full rounded-3xl border border-white/15 bg-white/5 p-4 shadow-lenka-card backdrop-blur">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[10px] uppercase tracking-[0.4em] text-white/60">
                  {t('Settings', 'Definições')}
                </p>
                <button
                  onClick={() => {
                    setShowSettings(false);
                    setIsLanguageMenuOpen(false);
                  }}
                  className="rounded-full border border-white/20 bg-white/5 p-1 text-white transition hover:bg-white/10"
                  aria-label={t('Close settings', 'Fechar definições')}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-3 space-y-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-white/50">
                    {t('Language', 'Idioma')}
                  </p>
                  <div className="mt-2">
                    <button
                      onClick={() => setIsLanguageMenuOpen((prev) => !prev)}
                      className="flex w-full items-center justify-between rounded-2xl border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-lg">{selectedLanguage.flag}</span>
                        <span>{selectedLanguage.label}</span>
                      </span>
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${isLanguageMenuOpen ? 'rotate-180' : ''}`}
                      />
                    </button>
                    {isLanguageMenuOpen && (
                      <div className="mt-2 rounded-2xl border border-white/15 bg-white/10 p-1 text-sm text-white shadow-2xl backdrop-blur">
                        {languageOptions.map((option) => (
                          <button
                            key={option.value}
                            onClick={() => {
                              setLanguage(option.value);
                              setIsLanguageMenuOpen(false);
                            }}
                            className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left font-semibold transition ${
                              option.value === language
                                ? 'bg-white/20 text-white'
                                : 'text-white/70 hover:bg-white/10'
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
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-white/50">
                    {t('Sound Effects', 'Efeitos Sonoros')}
                  </p>
                  <div className="mt-2 flex justify-start">
                    <SfxToggle />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
