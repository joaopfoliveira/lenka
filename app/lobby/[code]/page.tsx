'use client';

import { useEffect, useState, useRef, useTransition, useCallback, type ReactNode } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Clock3,
  Copy,
  DoorOpen,
  Loader2,
  RadioTower,
  Settings,
  Sparkles,
  Trophy,
  Users,
  X,
} from 'lucide-react';
import {
  connectSocket,
  disconnectSocket,
  createLobby,
  joinLobby,
  leaveLobby,
  startGame,
  submitGuess,
  markPlayerReady,
  resetGame,
  updateLobbySettings,
  removeAllGameListeners,
  onLobbyState,
  onPlayerJoined,
  onPlayerLeft,
  onGameLoading,
  onGameStarted,
  onRoundUpdate,
  onRoundResults,
  onGameEnded,
  onReadyTimeout,
  onError,
  getSocket,
  kickPlayer,
  onPlayerKicked,
} from '@/lib/socketClient';
import { Lobby, Player } from '@/lib/gameManager';
import { Product } from '@/data/products';
import ProductImage from '@/app/components/ProductImage';
import { useSfx } from '@/app/components/sfx/SfxProvider';
import { useLanguage, type Language } from '@/app/hooks/useLanguage';
import { ensurePlayerClientId } from '@/app/utils/playerIdentity';
import SfxToggle from '@/app/components/sfx/SfxToggle';

const wheelSegments = [
  '5€',
  '10€',
  '15€',
  '25€',
  '35€',
  '50€',
  '75€',
  '100€',
  '150€',
  '200€',
  '250€',
  '500€',
];

const wheelColors = [
  '#FF6FD8',
  '#FFE066',
  '#5EEAD4',
  '#A78BFA',
  '#FB923C',
  '#60A5FA',
];

const wheelGradient = wheelSegments
  .map((_, index) => {
    const start = (index / wheelSegments.length) * 360;
    const end = ((index + 1) / wheelSegments.length) * 360;
    const color = wheelColors[index % wheelColors.length];
    return `${color} ${start}deg ${end}deg`;
  })
  .join(', ');

const showtimeQuips: Array<
  (total?: number) => { en: string; pt: string }
> = [
  (total) => {
    const count = total ?? 'a few';
    return {
      en: `Polishing ${count} secret showcase${total && total > 1 ? 's' : ''}...`,
      pt: `A polir ${total ?? 'alguns'} segredos do espetáculo...`,
    };
  },
  () => ({
    en: 'Cue the confetti! Producers are lining up the next prize.',
    pt: 'Confettis prontos! A produção está a alinhar o próximo prémio.',
  }),
  () => ({
    en: 'Backstage crew is whispering prices to the big wheel...',
    pt: 'A equipa de bastidores está a soprar preços à grande roda...',
  }),
  () => ({
    en: 'Cranking the neon lights and unlocking the prize vault...',
    pt: 'A acender as luzes neon e a abrir o cofre dos prémios...',
  }),
];

function getShowtimeMessage(language: Language, total?: number) {
  const pick = showtimeQuips[Math.floor(Math.random() * showtimeQuips.length)];
  const message = pick(total);
  return language === 'pt' ? message.pt : message.en;
}

function StageBackground({
  children,
  maxWidth = 'max-w-5xl',
  disableMotion = false,
}: {
  children: ReactNode;
  maxWidth?: string;
  disableMotion?: boolean;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-lenka-stage px-3 py-6 text-white sm:px-6">
      <div className="pointer-events-none absolute inset-0 opacity-80">
        {disableMotion ? (
          <>
            <div className="absolute -right-10 top-12 h-72 w-72 rounded-full bg-gradient-to-br from-lenka-gold/25 to-transparent blur-[120px]" />
            <div className="absolute -left-16 bottom-6 h-80 w-80 rounded-full bg-gradient-to-tr from-lenka-pink/20 to-transparent blur-[120px]" />
          </>
        ) : (
          <>
            <motion.div
              className="absolute -right-10 top-12 h-72 w-72 rounded-full bg-gradient-to-br from-lenka-gold/30 to-transparent blur-[120px]"
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 45, ease: 'linear' }}
            />
            <motion.div
              className="absolute -left-16 bottom-6 h-80 w-80 rounded-full bg-gradient-to-tr from-lenka-pink/25 to-transparent blur-[120px]"
              animate={{ rotate: -360 }}
              transition={{ repeat: Infinity, duration: 55, ease: 'linear' }}
            />
          </>
        )}
      </div>
      <div className={`relative z-10 mx-auto ${maxWidth}`}>{children}</div>
    </div>
  );
}

function SettingsPanel() {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-white shadow-lenka-card backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.4em] text-white/60">Settings</p>
          <p className="text-sm font-semibold text-white/80">Sound Effects</p>
        </div>
        <SfxToggle />
      </div>
    </div>
  );
}

function LobbyCodeBadge({
  code,
  onCopy,
}: {
  code: string;
  onCopy: () => void;
}) {
  return (
    <div className="mb-4 flex justify-center sm:justify-end">
      <button
        onClick={onCopy}
        className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
      >
        <span className="font-mono tracking-[0.3em]">{code}</span>
        <Copy className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function SafeExitButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="w-full rounded-full border border-white/30 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
    >
      {label}
    </button>
  );
}

function WheelOverlay({
  visible,
  prize,
  spinId,
  targetAngle,
  message,
  onComplete,
  reduceMotion = false,
  language,
}: {
  visible: boolean;
  prize: string;
  spinId: number;
  targetAngle: number;
  message: string;
  onComplete: () => void;
  reduceMotion?: boolean;
  language: Language;
}) {
  useEffect(() => {
    if (!reduceMotion || !visible) return;
    const fallbackTimer = setTimeout(() => {
      onComplete();
    }, 800);
    return () => clearTimeout(fallbackTimer);
  }, [reduceMotion, visible, onComplete]);
  
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 px-4 py-8 backdrop-blur"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="flex flex-col items-center gap-6 rounded-3xl border border-white/10 bg-white/5 px-6 py-8 shadow-lenka-card backdrop-blur-xl"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
          >
            {reduceMotion ? (
              <div className="flex flex-col items-center gap-4">
                <div className="flex h-20 w-20 items-center justify-center rounded-full border border-white/20 bg-white/10">
                  <Sparkles className="h-10 w-10 text-lenka-gold" />
                </div>
                <p className="text-base font-semibold text-white">
                  {message || (language === 'pt' ? 'A preparar o próximo produto...' : 'Preparing next product...')}
                </p>
              </div>
            ) : (
              <div className="relative flex items-center justify-center">
                <div className="absolute -top-10 left-1/2 h-16 w-10 -translate-x-1/2 rounded-b-full bg-gradient-to-b from-white to-lenka-gold shadow-lg" />
                <motion.div
                  key={spinId}
                  className="relative h-[320px] w-[320px] rounded-full border-4 border-white/50 p-4 shadow-lenka-glow sm:h-[420px] sm:w-[420px]"
                  style={{
                    backgroundImage: `conic-gradient(${wheelGradient})`,
                  }}
                  initial={{ rotate: 0 }}
                  animate={{ rotate: targetAngle }}
                  transition={{ duration: 4.6, ease: [0.12, 0.67, 0.22, 0.99] }}
                  onAnimationComplete={onComplete}
                >
                  {wheelSegments.map((label, index) => {
                    const angle = (360 / wheelSegments.length) * index;
                    return (
                      <div
                        key={`${label}-${index}`}
                        className="absolute left-1/2 top-1/2 origin-top text-xs font-black uppercase tracking-widest text-white"
                        style={{
                          transform: `rotate(${angle}deg) translate(-50%, -82%)`,
                        }}
                      >
                        <span className="drop-shadow-lg">{label}</span>
                      </div>
                    );
                  })}
                  <div className="absolute inset-6 rounded-full border-4 border-white/10 bg-lenka-midnight/70 backdrop-blur" />
                  <div className="absolute inset-[32%] flex flex-col items-center justify-center rounded-full border border-white/20 bg-white/90 text-center text-lenka-midnight shadow-inner">
                  <p className="text-xs uppercase tracking-[0.4em] text-lenka-midnight/60">
                    {language === 'pt' ? 'Prémio da roda' : 'Wheel Prize'}
                  </p>
                    <p className="text-3xl font-black text-lenka-midnight">{prize}</p>
                  </div>
                </motion.div>
              </div>
            )}
            <div className="text-center">
              <p className="text-xs uppercase tracking-[0.4em] text-white/60">
                {language === 'pt' ? 'Roda da Lenka' : 'Wheel of Lenka'}
              </p>
              <p className="text-lg font-semibold text-white">{message}</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function SettingsHeader({ code, onCopy }: { code: string; onCopy: () => void }) {
  return (
    <div className="mb-6 flex justify-end">
      <LobbyCodeBadge code={code} onCopy={onCopy} />
    </div>
  );
}

export default function LobbyPage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;
  
  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
  const [roundIndex, setRoundIndex] = useState(0);
  const [totalRounds, setTotalRounds] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const [guess, setGuess] = useState('');
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [roundResults, setRoundResults] = useState<any>(null);
  const [finalLeaderboard, setFinalLeaderboard] = useState<any>(null);
  const [error, setError] = useState('');
  const [isStarting, setIsStarting] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [readyTimeout, setReadyTimeout] = useState(45);
  const [isReady, setIsReady] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isWheelVisible, setIsWheelVisible] = useState(false);
  const [wheelSpinId, setWheelSpinId] = useState(0);
  const [wheelTargetAngle, setWheelTargetAngle] = useState(0);
  const [wheelPrize, setWheelPrize] = useState('50€');
  const [wheelMessage, setWheelMessage] = useState('');
  const [pendingLoadingState, setPendingLoadingState] = useState<{
    message: string;
    total: number;
  } | null>(null);
  const [pendingRoundPayload, setPendingRoundPayload] = useState<{
    product: Product;
    roundIndex: number;
    totalRounds: number;
  } | null>(null);
  const [kickingPlayerId, setKickingPlayerId] = useState<string | null>(null);
  const [, startLobbyTransition] = useTransition();
  
  const mountedRef = useRef(false);
  const activeTimeouts = useRef<NodeJS.Timeout[]>([]); // Track all active timeouts
  const cleanupFunctionsRef = useRef<(() => void)[]>([]); // Track cleanup functions
  const wheelTimestampRef = useRef<number | null>(null);
  const prevTimeLeftRef = useRef(timeLeft);
  const wheelVisibleRef = useRef(isWheelVisible);
  const previousLobbyStatusRef = useRef<Lobby['status'] | null>(null);
  const playerNameRef = useRef<string>('');
  const clientIdRef = useRef<string>('');
  const activeLobbyCodeRef = useRef<string | null>(code !== '__create__' ? code : null);
  const kickingPlayerIdRef = useRef<string | null>(null);
  const safeReturnRef = useRef<() => void>(() => {});
  const shouldConfirmExitRef = useRef(true);
  const lastAppliedResultRoundRef = useRef<number | null>(null);
  const lastSubmittedGuessRef = useRef<string>('');
  const autoSubmitRoundRef = useRef<number | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsMenuRef = useRef<HTMLDivElement | null>(null);
  const { playTick, playDing, playBuzzer, playFanfare, playApplause } = useSfx();
  const { language } = useLanguage();
  const t = useCallback((en: string, pt: string) => (language === 'pt' ? pt : en), [language]);
  const languageRef = useRef(language);

  useEffect(() => {
    languageRef.current = language;
  }, [language]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!settingsMenuRef.current) {
        return;
      }
      if (!settingsMenuRef.current.contains(event.target as Node)) {
        setIsSettingsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (lobby) {
      setTotalRounds(lobby.roundsTotal);
    }
  }, [lobby]);
  const roundOptions = [5, 8, 10] as const;
  const productSourceOptions: Array<{
    value: 'mixed' | 'kuantokusta' | 'temu' | 'decathlon';
    label: { en: string; pt: string };
    description: { en: string; pt: string };
  }> = [
    {
      value: 'mixed',
      label: { en: 'Mixed', pt: 'Mistura' },
      description: { en: 'KuantoKusta + Temu + Decathlon', pt: 'KuantoKusta + Temu + Decathlon' },
    },
    {
      value: 'kuantokusta',
      label: { en: 'KuantoKusta', pt: 'KuantoKusta' },
      description: { en: 'Portuguese supermarket lineup', pt: 'Seleção de supermercados portugueses' },
    },
    {
      value: 'temu',
      label: { en: 'Temu', pt: 'Temu' },
      description: { en: 'International marketplace chaos', pt: 'Marketplace internacional' },
    },
    {
      value: 'decathlon',
      label: { en: 'Decathlon', pt: 'Decathlon' },
      description: { en: 'Sports gear roulette', pt: 'Roleta de artigos desportivos' },
    },
  ];
  const getProductSourceLabel = (source: Lobby['productSource']) => {
    switch (source) {
      case 'kuantokusta':
        return t('KuantoKusta', 'KuantoKusta');
      case 'temu':
        return t('Temu', 'Temu');
      case 'decathlon':
        return t('Decathlon', 'Decathlon');
      default:
        return t('Mixed', 'Mistura');
    }
  };

  const disableHeavyEffects = true;

  useEffect(() => {
    wheelVisibleRef.current = isWheelVisible;
  }, [isWheelVisible]);

  useEffect(() => {
    kickingPlayerIdRef.current = kickingPlayerId;
  }, [kickingPlayerId]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!shouldConfirmExitRef.current) {
        return;
      }
      event.preventDefault();
      event.returnValue = '';
    };

    const handlePopState = () => {
      if (!shouldConfirmExitRef.current) {
        return;
      }
      const message =
        languageRef.current === 'pt'
          ? 'Tens a certeza que queres sair do lobby?'
          : 'Are you sure you want to leave the lobby?';
      const confirmLeave = window.confirm(message);
      if (confirmLeave) {
        shouldConfirmExitRef.current = false;
        safeReturnRef.current();
      } else {
        window.history.pushState(null, '', window.location.href);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);
    window.history.pushState(null, '', window.location.href);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const revealProduct = (payload: {
    product: Product;
    roundIndex: number;
    totalRounds: number;
  }) => {
    setCurrentProduct(null);
    setIsLoadingProducts(false);
    setLoadingMessage('');
    setIsStarting(false);
    setCurrentProduct(payload.product);
    setRoundIndex(payload.roundIndex);
    setTotalRounds(payload.totalRounds);
    setTimeLeft(15);
    setGuess('');
    setHasSubmitted(false);
    lastSubmittedGuessRef.current = '';
    autoSubmitRoundRef.current = null;
    lastSubmittedGuessRef.current = '';
    setShowResults(false);
    setRoundResults(null);
    setFinalLeaderboard(null);
  };

  const startWheelSpin = useCallback((message: string) => {
    const totalSegments = wheelSegments.length;
    const fullSpins = Math.floor(Math.random() * 3) + 3;
    const selectedIndex = Math.floor(Math.random() * totalSegments);
    const anglePerSegment = 360 / totalSegments;
    const randomOffset = Math.random() * (anglePerSegment - 6);
    const target =
      fullSpins * 360 + selectedIndex * anglePerSegment + randomOffset;

    setWheelTargetAngle(target);
    setWheelPrize(wheelSegments[selectedIndex]);
    setWheelMessage(message);
    setWheelSpinId((prev) => prev + 1);
    setIsWheelVisible(true);
    wheelTimestampRef.current = Date.now();
  }, []);

  const handleWheelComplete = () => {
    playFanfare();
    setIsWheelVisible(false);

    if (pendingRoundPayload) {
      revealProduct(pendingRoundPayload);
      setPendingRoundPayload(null);
      setPendingLoadingState(null);
      return;
    }

    if (pendingLoadingState) {
      setIsLoadingProducts(true);
      setLoadingMessage(pendingLoadingState.message);
      setTotalRounds(pendingLoadingState.total);
      setPendingLoadingState(null);
    } else {
      setIsLoadingProducts(true);
      setLoadingMessage(t('Lining up the first item...', 'A alinhar o primeiro item...'));
    }
  };

  // Helper to add and track timeouts
  const addTimeout = useCallback((callback: () => void, delay: number) => {
    const timeout = setTimeout(() => {
      callback();
      // Remove from active list
      activeTimeouts.current = activeTimeouts.current.filter(t => t !== timeout);
    }, delay);
    activeTimeouts.current.push(timeout);
    return timeout;
  }, []);

  // Helper to clear all timeouts
  const clearAllTimeouts = () => {
    console.log(`🧹 Clearing ${activeTimeouts.current.length} active timeouts`);
    activeTimeouts.current.forEach(timeout => clearTimeout(timeout));
    activeTimeouts.current = [];
  };

  useEffect(() => {
    const isCreatingNewLobby =
      typeof window !== 'undefined' && localStorage.getItem('createLobby') === 'true';
    if (code === '__create__' && typeof window !== 'undefined' && !isCreatingNewLobby) {
      const lastCode = window.sessionStorage.getItem('lenka:lastLobbyCode');
      if (lastCode) {
        router.replace(`/lobby/${lastCode}`);
        return;
      }
    }
    
    console.log('🚀 Lobby page effect running for code:', code);
    mountedRef.current = true;
    activeLobbyCodeRef.current = code !== '__create__' ? code : null;

    const playerName = localStorage.getItem('playerName');
    if (!playerName) {
      shouldConfirmExitRef.current = false;
      router.push('/');
      return;
    }
    playerNameRef.current = playerName;
    const ensuredClientId = ensurePlayerClientId();
    clientIdRef.current = ensuredClientId;
    
    console.log('🔌 Setting up fresh event listeners...');

    // Store cleanup functions
    const cleanupFunctions: (() => void)[] = [];

    // Set up event listeners FIRST before connecting
    const unsubLobbyState = onLobbyState((lobbyData) => {
      console.log('Received lobby state:', lobbyData);
      activeLobbyCodeRef.current = lobbyData.code;

      // CRITICAL: If status changed to 'waiting', clear ALL game-related state
      const previousStatus = previousLobbyStatusRef.current;
      if (lobbyData.status === 'waiting' && previousStatus && previousStatus !== 'waiting') {
        console.log('🔄 Lobby reset detected - clearing all game state');

        // Clear all state (listeners remain active for next game)
        setCurrentProduct(null);
        setRoundIndex(0);
        setTotalRounds(lobbyData.roundsTotal);
        setTimeLeft(15);
        setGuess('');
        setHasSubmitted(false);
        setShowResults(false);
        setRoundResults(null);
        setFinalLeaderboard(null);
        setIsReady(false);
        lastAppliedResultRoundRef.current = null;
        lastSubmittedGuessRef.current = '';
        autoSubmitRoundRef.current = null;
        setReadyTimeout(45);
        setIsStarting(false);
        setIsLoadingProducts(false);
        setLoadingMessage('');
        setIsResetting(false);
        setPendingRoundPayload(null);
        setPendingLoadingState(null);
        setIsWheelVisible(false);
      }

      startLobbyTransition(() => {
        setLobby(lobbyData);
        if (typeof window !== 'undefined') {
          window.sessionStorage.setItem('lenka:lastLobbyCode', lobbyData.code);
        }
        const socket = getSocket();
        const player = lobbyData.players.find((p: Player) => p.id === socket.id);
        if (player) {
          setCurrentPlayer(player);
        }
        const lastKicked = kickingPlayerIdRef.current;
        if (lastKicked && !lobbyData.players.some(p => p.id === lastKicked)) {
          kickingPlayerIdRef.current = null;
          setKickingPlayerId(null);
        }
        previousLobbyStatusRef.current = lobbyData.status;
      });
      
      // Update URL if we just created
      if (code === '__create__') {
        router.replace(`/lobby/${lobbyData.code}`);
      }
    });

    const unsubPlayerJoined = onPlayerJoined(({ player }) => {
      setLobby((prev) => {
        if (!prev) return prev;
        return { ...prev, players: [...prev.players, player] };
      });
    });

    const unsubPlayerLeft = onPlayerLeft(({ playerId }) => {
      setLobby((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          players: prev.players.filter((p) => p.id !== playerId),
        };
      });
    });

    const unsubGameLoading = onGameLoading(({ message, totalRounds: total }) => {
      console.log('⏳ Loading products:', message);
      const funMessage = getShowtimeMessage(languageRef.current, total);
      setIsStarting(false);
      setPendingLoadingState({ message: funMessage, total });
      setWheelMessage(funMessage);
      setIsLoadingProducts(false);

      if (!wheelVisibleRef.current) {
        startWheelSpin(funMessage);
      }
    });

    const unsubGameStarted = onGameStarted(({ product, roundIndex: rIndex, totalRounds: total }) => {
      console.log('🎮 Game started! Product:', product.name);
      const payload = { product, roundIndex: rIndex, totalRounds: total };
      setIsStarting(false);
      setPendingLoadingState(null);
      if (wheelVisibleRef.current) {
        setPendingRoundPayload(payload);
      } else {
        revealProduct(payload);
      }
    });

    const unsubRoundUpdate = onRoundUpdate(({ timeLeft: time }) => {
      setTimeLeft(time);
    });

    const unsubRoundResults = onRoundResults((results) => {
      console.log('📊 Round results received:', results);
      console.log('📊 Points breakdown:', results.results.map((r: any) => ({
        player: r.playerName,
        points: r.pointsEarned,
        guess: r.guess,
        diff: r.difference
      })));
      lastAppliedResultRoundRef.current = results.roundIndex;
      setRoundResults(results);
      setShowResults(true);
      setReadyTimeout(45); // Reset ready timeout to 45 seconds
      setIsReady(false); // Reset ready state
    });

    const unsubReadyTimeout = onReadyTimeout(({ timeLeft }) => {
      setReadyTimeout(timeLeft);
    });

    const unsubGameEnded = onGameEnded(({ finalLeaderboard: leaderboard }) => {
      console.log('🏁 Game ended! Final leaderboard:', leaderboard);
      setFinalLeaderboard(leaderboard);
      setCurrentProduct(null);
      setShowResults(false); // Clear round results so game over screen shows
      setRoundResults(null);
      setIsReady(false);
      // Update lobby status to finished
      setLobby((prev) => {
        if (!prev) return prev;
        return { ...prev, status: 'finished' as const };
      });
    });

    const unsubPlayerKicked = onPlayerKicked(({ code: kickedCode }) => {
      if (activeLobbyCodeRef.current && kickedCode !== activeLobbyCodeRef.current) {
        return;
      }
      console.log('⛔️ You have been removed from the lobby');
      setError(
        languageRef.current === 'pt'
          ? 'Foste removido do lobby pelo host.'
          : 'You were removed from the lobby by the host.'
      );
      safeReturnRef.current();
    });

    const unsubError = onError(({ message }) => {
      console.error('❌ Error received:', message);
      setError(message);
      setIsStarting(false); // Reset starting flag on error
      setIsLoadingProducts(false); // Reset loading products flag on error
      setLoadingMessage(''); // Clear loading message
      addTimeout(() => setError(''), 5000);
    });

    // NOW connect and initialize after all listeners are set up
    const socketInstance = getSocket();
    const handleReconnect = () => {
      const lobbyCode = activeLobbyCodeRef.current || (code !== '__create__' ? code : null);
      const storedName = localStorage.getItem('playerName') || playerNameRef.current;
      if (!lobbyCode || !storedName) {
        return;
      }
      console.log(`🔁 Socket reconnected. Rejoining lobby ${lobbyCode}`);
      joinLobby(lobbyCode, storedName, clientIdRef.current);
    };
    socketInstance.on('reconnect', handleReconnect);
    cleanupFunctions.push(() => socketInstance.off('reconnect', handleReconnect));

    const initializeSocket = async () => {
      try {
        await connectSocket();
        console.log('Socket connected successfully');

        // Check if this is a create or join
        const shouldCreate = localStorage.getItem('createLobby') === 'true';
        
        if (shouldCreate && code === '__create__') {
          const roundsTotal = parseInt(localStorage.getItem('roundsTotal') || '5');
          const productSource = (localStorage.getItem('productSource') || 'mixed') as 'kuantokusta' | 'temu' | 'decathlon' | 'mixed';
          console.log('Creating lobby with', roundsTotal, 'rounds, source:', productSource);
          createLobby(roundsTotal, playerName, productSource, clientIdRef.current);
          localStorage.removeItem('createLobby');
          localStorage.removeItem('roundsTotal');
          localStorage.removeItem('productSource');
        } else {
          console.log('Joining lobby', code);
          joinLobby(code, playerName, clientIdRef.current);
        }
      } catch (error) {
        console.error('Failed to connect socket:', error);
        setError(
          languageRef.current === 'pt'
            ? 'Falha na ligação ao servidor. Atualiza a página.'
            : 'Failed to connect to server. Please refresh the page.'
        );
      }
    };

    initializeSocket();

    // Store all cleanup functions
    cleanupFunctions.push(unsubLobbyState);
    cleanupFunctions.push(unsubPlayerJoined);
    cleanupFunctions.push(unsubPlayerLeft);
    cleanupFunctions.push(unsubGameLoading);
    cleanupFunctions.push(unsubGameStarted);
    cleanupFunctions.push(unsubRoundUpdate);
    cleanupFunctions.push(unsubRoundResults);
    cleanupFunctions.push(unsubReadyTimeout);
    cleanupFunctions.push(unsubGameEnded);
    cleanupFunctions.push(unsubPlayerKicked);
    cleanupFunctions.push(unsubError);

    return () => {
      console.log('🧹 Cleanup: Removing all event listeners and timeouts');
      mountedRef.current = false;
      
      // Clear all pending timeouts
      clearAllTimeouts();
      
      // Remove all game-related listeners (extra safety)
      try {
        removeAllGameListeners();
      } catch (error) {
        console.error('Error removing game listeners:', error);
      }
      
      // Call all cleanup functions
      console.log(`🧹 Calling ${cleanupFunctions.length} cleanup functions`);
      cleanupFunctions.forEach(cleanup => {
        try {
          cleanup();
        } catch (error) {
          console.error('Error during cleanup:', error);
        }
      });
    };
  }, [addTimeout, code, router, startWheelSpin]);

  useEffect(() => {
    if (!currentProduct) {
      prevTimeLeftRef.current = timeLeft;
      return;
    }

    if (timeLeft < prevTimeLeftRef.current) {
      playTick();
      if (timeLeft === 0) {
        playBuzzer();
      }
    }
    prevTimeLeftRef.current = timeLeft;
  }, [currentProduct, playBuzzer, playTick, timeLeft]);


  useEffect(() => {
    if (showResults && roundResults) {
      playFanfare();
    }
  }, [playFanfare, roundResults, showResults]);

  useEffect(() => {
    if (lobby?.status === 'finished' && finalLeaderboard) {
      playApplause();
    }
  }, [finalLeaderboard, lobby?.status, playApplause]);

  useEffect(() => {
    if (readyTimeout === 0) {
      playBuzzer();
    }
  }, [playBuzzer, readyTimeout]);

  useEffect(() => {
    if (!lobby?.lastRoundResults) {
      return;
    }
    if (lastAppliedResultRoundRef.current === lobby.lastRoundResults.roundIndex) {
      return;
    }
    lastAppliedResultRoundRef.current = lobby.lastRoundResults.roundIndex;
    setRoundResults(lobby.lastRoundResults);
    setShowResults(true);
    setRoundIndex(lobby.lastRoundResults.roundIndex);
    setIsLoadingProducts(false);
    setPendingRoundPayload(null);
    setPendingLoadingState(null);
  }, [lobby?.lastRoundResults]);

  const handleStartGame = async () => {
    console.log('🎮 Start Game clicked. Lobby:', lobby, 'isStarting:', isStarting);
    
    // Prevent double-clicks
    if (isStarting) {
      console.log('⚠️ Game is already starting, ignoring duplicate click');
      return;
    }
    
    if (!lobby) {
      console.error('❌ No lobby available!');
      return;
    }

    setIsStarting(true);
    setIsLoadingProducts(false);
    setLoadingMessage('');
    setPendingLoadingState(null);
    setPendingRoundPayload(null);
    startWheelSpin(t('Spinning the Wheel of Lenka...', 'A rodar a Roda da Lenka...'));
    playDing();

    // Use server-side API fetch (works!)
    console.log('🛒 [SERVER] Starting game with server-side API fetch...');
    startGame(lobby.code);
  };

  const submitGuessValue = useCallback(
    (value: string, { auto }: { auto?: boolean } = {}) => {
      if (!value || !lobby) {
        return false;
      }
  
      const parsed = parseFloat(value);
      if (isNaN(parsed) || parsed < 0) {
        if (!auto) {
          setError(t('Please enter a valid price', 'Introduz um preço válido'));
          addTimeout(() => setError(''), 3000);
        }
        return false;
      }
  
      submitGuess(lobby.code, parsed);
      lastSubmittedGuessRef.current = value;
      if (!hasSubmitted) {
        setHasSubmitted(true);
      }
      if (!auto) {
        playDing();
      }
      return true;
    },
    [addTimeout, hasSubmitted, lobby, playDing, t]
  );

  const handleSubmitGuess = () => {
    submitGuessValue(guess);
  };

  useEffect(() => {
    if (!lobby) {
      return;
    }
    if (timeLeft > 1) {
      return;
    }
    if (!guess || !guess.trim()) {
      return;
    }
    const activeRound = lobby.currentRoundIndex ?? roundIndex;
    if (autoSubmitRoundRef.current === activeRound) {
      return;
    }
    if (guess === lastSubmittedGuessRef.current) {
      return;
    }
    const submitted = submitGuessValue(guess, { auto: true });
    if (submitted) {
      autoSubmitRoundRef.current = activeRound;
    }
  }, [guess, lobby, roundIndex, submitGuessValue, timeLeft]);

  const handlePlayAgain = () => {
    if (isResetting || !lobby) {
      console.log('⚠️ Play Again already in progress or no lobby');
      return;
    }
    
    console.log('🔄 Play Again clicked');
    setIsResetting(true);
    
    try {
      resetGame(lobby.code);
      playDing();
      // Reset flag after a delay to prevent spam
      addTimeout(() => setIsResetting(false), 1000);
    } catch (error) {
      console.error('Failed to reset game:', error);
      setIsResetting(false);
    }
  };

  const handleKickPlayer = (playerId: string) => {
    if (!lobby || !currentPlayer?.isHost || kickingPlayerId) {
      return;
    }
    console.log(`🥾 Kicking player ${playerId} from lobby ${lobby.code}`);
    setKickingPlayerId(playerId);
    kickPlayer(lobby.code, playerId);
    addTimeout(() => setKickingPlayerId(null), 2000);
  };

  const handleLobbySettingsChange = (settings: {
    roundsTotal?: number;
    productSource?: 'kuantokusta' | 'temu' | 'decathlon' | 'mixed';
  }) => {
    if (!lobby || !currentPlayer?.isHost) {
      return;
    }
    const nextRounds = settings.roundsTotal ?? lobby.roundsTotal;
    const nextSource = settings.productSource ?? lobby.productSource;
    if (nextRounds === lobby.roundsTotal && nextSource === lobby.productSource) {
      return;
    }
    playTick();
    updateLobbySettings(lobby.code, nextRounds, nextSource);
  };

  const renderKickButton = (player: Player) => {
    if (!currentPlayer?.isHost || player.id === currentPlayer.id) {
      return null;
    }
    return (
      <button
        onClick={() => handleKickPlayer(player.id)}
        disabled={kickingPlayerId === player.id}
        className="text-[10px] font-bold uppercase tracking-widest text-red-300 transition hover:text-red-200 disabled:opacity-50"
      >
        {kickingPlayerId === player.id ? '...' : 'Kick'}
      </button>
    );
  };

  const handleSafeReturn = () => {
    console.log('🛟 Safe return triggered');
    shouldConfirmExitRef.current = false;
    if (lobby) {
      try {
        leaveLobby(lobby.code);
      } catch (error) {
        console.error('Failed to send leave event during safe exit:', error);
      }
    }
    clearAllTimeouts();
    removeAllGameListeners();
    disconnectSocket();
    setLobby(null);
    setCurrentProduct(null);
    setRoundResults(null);
    setFinalLeaderboard(null);
    setIsReady(false);
    setHasSubmitted(false);
    lastAppliedResultRoundRef.current = null;
    lastSubmittedGuessRef.current = '';
    autoSubmitRoundRef.current = null;
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem('lenka:lastLobbyCode');
    }
    router.push('/');
  };
  safeReturnRef.current = handleSafeReturn;

  const handleMarkReady = () => {
    if (lobby && !isReady) {
      setIsReady(true);
      playDing();
      markPlayerReady(lobby.code);
    }
  };

  const handleLeaveLobby = () => {
    if (isLeaving || !lobby) {
      console.log('⚠️ Leave already in progress or no lobby');
      return;
    }
    
    console.log('👋 Leaving lobby');
    setIsLeaving(true);
    playBuzzer();
    shouldConfirmExitRef.current = false;
    
    try {
      leaveLobby(lobby.code);
      if (typeof window !== 'undefined') {
        window.sessionStorage.removeItem('lenka:lastLobbyCode');
      }
      // Small delay before navigation to ensure socket message is sent
      addTimeout(() => {
        router.push('/');
      }, 100);
    } catch (error) {
      console.error('Failed to leave lobby:', error);
      setIsLeaving(false);
      router.push('/');
    }
  };

  const copyLobbyCode = () => {
    if (lobby) {
      navigator.clipboard.writeText(lobby.code);
      playDing();
    }
  };

  const wheelOverlay = (
    <WheelOverlay
      visible={isWheelVisible}
      prize={wheelPrize}
      spinId={wheelSpinId}
      targetAngle={wheelTargetAngle}
      message={wheelMessage}
      onComplete={handleWheelComplete}
      reduceMotion={disableHeavyEffects}
      language={language}
    />
  );
  const floatingSettings = (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4 sm:inset-auto sm:left-6 sm:bottom-6 sm:px-0 sm:justify-start">
      <div className="pointer-events-auto flex w-full max-w-sm flex-col items-start gap-3" ref={settingsMenuRef}>
        {!isSettingsOpen && (
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="flex h-12 w-12 items-center justify-center rounded-full border border-white/30 bg-white/10 text-white shadow-lg transition hover:bg-white/20"
            aria-label={t('Open settings', 'Abrir definições')}
          >
            <Settings className="h-5 w-5" />
          </button>
        )}
        {isSettingsOpen && (
          <div className="w-full rounded-3xl border border-white/15 bg-white/5 p-4 text-white shadow-2xl backdrop-blur">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.4em] text-white/60">
                {t('Settings', 'Definições')}
              </p>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="rounded-full border border-white/20 bg-white/5 p-1 text-white transition hover:bg-white/10"
                aria-label={t('Close settings', 'Fechar definições')}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <SettingsPanel />
          </div>
        )}
      </div>
    </div>
  );

  if (!lobby) {
    return (
      <>
        <StageBackground disableMotion={disableHeavyEffects} maxWidth="max-w-3xl">
          {wheelOverlay}
        <div className="rounded-3xl border border-white/15 bg-white/10 p-10 text-center shadow-lenka-card backdrop-blur">
          {error ? (
            <div className="space-y-4">
              <p className="text-2xl font-bold text-red-200">{error}</p>
              <button
                onClick={() => {
                  shouldConfirmExitRef.current = false;
                  router.push('/');
                }}
                className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-gradient-to-r from-lenka-electric to-lenka-pink px-6 py-3 text-lg font-semibold text-white shadow-lenka-glow"
              >
                {t('Return Home', 'Voltar ao início')}
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-lenka-gold" />
              <p className="text-xl font-semibold text-white">
                {t('Connecting to your lobby...', 'A ligar ao teu lobby...')}
              </p>
              <p className="text-sm uppercase tracking-[0.4em] text-white/70">
                {t('Negotiating with Lenka HQ', 'A negociar com a Lenka HQ')}
              </p>
            </div>
          )}
        </div>
        </StageBackground>
        {floatingSettings}
      </>
    );
  }
  const settingsHeader = <SettingsHeader code={lobby.code} onCopy={copyLobbyCode} />;

  // Loading products screen
  if (isLoadingProducts || lobby.status === 'loading') {
    const loadingCopy =
      loadingMessage ||
      pendingLoadingState?.message ||
      t('Lenka is curating new products...', 'A Lenka está a preparar novos produtos...');
    const totalToShow = totalRounds || lobby.roundsTotal;
    return (
      <>
        <StageBackground disableMotion={disableHeavyEffects} maxWidth="max-w-4xl">
          {wheelOverlay}
          {settingsHeader}
        <div className="rounded-3xl border border-white/15 bg-white/5 p-8 text-center shadow-lenka-card backdrop-blur">
          <div className="mb-8 flex flex-col items-center gap-4">
            <RadioTower className="h-16 w-16 text-lenka-gold drop-shadow-[0_0_25px_rgba(255,215,111,0.6)]" />
            <h1 className="text-4xl font-extrabold text-white">{t('Preparing Your Show', 'A preparar o espetáculo')}</h1>
            <p className="text-lg text-white/80">{loadingCopy}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-left">
            <p className="text-sm uppercase tracking-[0.4em] text-white/60">
              {t('Fetching surprises', 'A buscar surpresas')}
            </p>
            <p className="mt-2 text-2xl font-bold text-lenka-gold">
              {language === 'pt'
                ? `${totalToShow} produtos surpresa`
                : `${totalToShow} surprise product(s)`}
            </p>
            <p className="text-sm text-white/80">
              {t('Fresh data, real-time prices, and plenty of drama.', 'Dados frescos, preços em tempo real e muito drama.')}
            </p>
          </div>
          <div className="mt-8 flex justify-center gap-2">
            {[0, 150, 300].map((delay) => (
              <span
                key={delay}
                className="h-3 w-3 rounded-full bg-lenka-gold animate-bounce"
                style={{ animationDelay: `${delay}ms` }}
              />
            ))}
          </div>
        </div>
        <div className="mt-6">
          <SafeExitButton onClick={handleSafeReturn} label={t('Exit to Main Menu', 'Voltar ao menu principal')} />
        </div>
        </StageBackground>
        {floatingSettings}
      </>
    );
  }

  const resolvedTotalRounds = totalRounds || lobby.roundsTotal;
  const resolvedRoundIndex = roundResults?.roundIndex ?? lobby.currentRoundIndex ?? roundIndex;

  // Playing - Show results (check FIRST before waiting/finished screens)
  if (showResults && roundResults) {
    return (
      <>
        <StageBackground disableMotion={disableHeavyEffects} maxWidth="max-w-5xl">
          {wheelOverlay}
          {settingsHeader}
        <div className="space-y-6">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lenka-card backdrop-blur">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-white/60">
                  {language === 'pt'
                    ? `Ronda ${resolvedRoundIndex + 1} de ${resolvedTotalRounds}`
                    : `Round ${resolvedRoundIndex + 1} of ${resolvedTotalRounds}`}
                </p>
                <h1 className="text-3xl font-bold text-lenka-gold">
                  {t('Showdown Results', 'Resultados da ronda')}
                </h1>
                <p className="text-sm text-white/70">
                  {t('The closest guess earns the spotlight and the bonus.', 'Quem acerta mais aproxima-se dos holofotes e do bónus.')}
                </p>
              </div>
              <button
                onClick={handleLeaveLobby}
                disabled={isLeaving}
                className={`inline-flex items-center gap-2 rounded-full border px-5 py-2 text-sm font-semibold ${
                  isLeaving
                    ? 'cursor-not-allowed border-white/20 text-white/40'
                    : 'border-white/30 text-white hover:bg-white/10'
                }`}
              >
                <DoorOpen className="h-4 w-4" />
                {isLeaving ? t('Leaving...', 'A sair...') : t('Leave Show', 'Sair do show')}
              </button>
            </div>

            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-inner">
                <p className="text-xs uppercase tracking-[0.4em] text-white/60">
                  {t('Real Price', 'Preço real')}
                </p>
                <p className="mt-3 text-4xl font-black text-lenka-gold">
                  €{roundResults.realPrice.toFixed(2)}
                </p>
                {roundResults.productStore && (
                  <p className="text-sm text-white/70">
                    {t('From', 'Loja')} {roundResults.productStore}
                  </p>
                )}
                {roundResults.productUrl && (
                  <a
                    href={roundResults.productUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center gap-2 rounded-full border border-lenka-gold/40 px-4 py-2 text-sm font-semibold text-lenka-gold transition hover:bg-lenka-gold/10"
                  >
                    {t('View product', 'Ver produto')}
                    <Sparkles className="h-4 w-4" />
                  </a>
                )}
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <p className="text-xs uppercase tracking-[0.4em] text-white/60">
                  {t('Current Standings', 'Classificação atual')}
                </p>
                <div className="mt-3 space-y-2">
                  {roundResults.leaderboard.map((player: any, index: number) => (
                    <div
                      key={player.playerId}
                      className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white"
                    >
                      <span className="font-semibold">
                        {index === 0 && '🥇 '}
                        {index === 1 && '🥈 '}
                        {index === 2 && '🥉 '}
                        {player.playerName}
                      </span>
                      <span className="font-bold text-lenka-gold">
                        {player.totalScore} pts
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-lenka-card backdrop-blur">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-white/80">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-[0.3em] text-white/50">
                    <th className="px-3 py-2">{t('Player', 'Jogador')}</th>
                    <th className="px-3 py-2 text-right">{t('Guess', 'Palpite')}</th>
                    <th className="px-3 py-2 text-right">Δ %</th>
                    <th className="px-3 py-2 text-right">{t('Base', 'Base')}</th>
                    <th className="px-3 py-2 text-right">{t('Bonus', 'Bónus')}</th>
                    <th className="px-3 py-2 text-right">{t('Round', 'Ronda')}</th>
                    <th className="px-3 py-2 text-right">{t('Total', 'Total')}</th>
                  </tr>
                </thead>
                <tbody>
                  {roundResults.results.map((result: any, index: number) => (
                    <tr
                      key={result.playerId}
                      className={`border-t border-white/10 ${
                        index === 0 ? 'bg-white/5' : ''
                      }`}
                    >
                      <td className="px-3 py-3 font-semibold text-white">
                        {result.playerName}
                      </td>
                      <td className="px-3 py-3 text-right">
                        {result.guess !== null ? `€${result.guess.toFixed(2)}` : '-'}
                      </td>
                      <td className="px-3 py-3 text-right">
                        {result.guess !== null
                          ? `${(result.errorPercentage * 100).toFixed(1)}%`
                          : '-'}
                      </td>
                      <td className="px-3 py-3 text-right text-teal-300 font-semibold">
                        {result.baseScore}
                      </td>
                      <td className="px-3 py-3 text-right text-lenka-pink font-semibold">
                        {result.bonus}
                      </td>
                      <td className="px-3 py-3 text-right text-lenka-gold font-bold">
                        {result.pointsEarned}
                      </td>
                      <td className="px-3 py-3 text-right font-semibold text-white">
                        {result.totalScore}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-center text-xs uppercase tracking-[0.3em] text-white/60">
              {t('Base score + podium bonus = round points', 'Pontuação base + bónus do pódio = pontos da ronda')}
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-lenka-card backdrop-blur">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.4em] text-white/60">
                    {t('Ready Check', 'Prontos?')}
                  </p>
                  <p className="text-2xl font-bold text-white">
                    {t('Ready', 'Prontos')} {Object.keys(lobby.readyPlayers || {}).length} / {lobby.players.length}
                  </p>
                  <p className="text-[11px] uppercase tracking-[0.3em] text-white/50">
                    {t('Auto-start in', 'Começa automaticamente em')}{' '}
                    {Math.floor(readyTimeout / 60)}:{String(readyTimeout % 60).padStart(2, '0')}
                  </p>
                </div>
                {!isReady ? (
                  <button
                    onClick={handleMarkReady}
                    className="inline-flex items-center gap-2 rounded-full border border-lenka-teal/70 bg-lenka-teal/30 px-6 py-3 text-base font-semibold text-white shadow-lenka-card transition hover:bg-lenka-teal/40"
                  >
                    <Sparkles className="h-4 w-4" />
                    {resolvedRoundIndex + 1 === resolvedTotalRounds
                      ? t('Final Reveal', 'Revelar final')
                      : t('Ready Up', 'Estou pronto')}
                  </button>
                ) : (
                  <div className="rounded-full border border-lenka-teal bg-lenka-teal/10 px-6 py-3 text-sm font-semibold text-lenka-teal">
                    {t('Ready! Waiting for others...', 'Pronto! À espera dos restantes...')}
                  </div>
                )}
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <p className="text-[10px] uppercase tracking-[0.4em] text-white/50">
                  {t('Players', 'Jogadores')}
                </p>
                <div className="mt-2 flex max-h-36 flex-wrap gap-2 overflow-y-auto pr-1">
                  {lobby.players.map((player) => (
                    <div
                      key={player.id}
                      className={`flex items-center gap-2 rounded-full px-4 py-1 text-xs font-semibold ${
                        lobby.readyPlayers?.[player.id]
                          ? 'bg-lenka-teal/30 text-lenka-teal'
                          : 'bg-white/10 text-white/70'
                      }`}
                    >
                      <span>
                        {player.name} {lobby.readyPlayers?.[player.id] && '✓'}
                      </span>
                      {renderKickButton(player)}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-6">
          <SafeExitButton onClick={handleSafeReturn} label={t('Exit to Main Menu', 'Voltar ao menu principal')} />
        </div>
        </StageBackground>
        {floatingSettings}
      </>
    );
  }

  // Game finished screen (CHECK BEFORE currentProduct to prevent showing guess screen)
  if (lobby.status === 'finished' && finalLeaderboard) {
    return (
      <>
        <StageBackground disableMotion={disableHeavyEffects} maxWidth="max-w-4xl">
          {wheelOverlay}
          {settingsHeader}
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center shadow-lenka-card backdrop-blur">
          <div className="flex flex-col items-center gap-3">
            <Trophy className="h-16 w-16 text-lenka-gold drop-shadow-[0_0_25px_rgba(255,215,111,0.6)]" />
            <h1 className="text-4xl font-extrabold text-white">{t('Lenka Grand Finale', 'Grande final Lenka')}</h1>
            <p className="text-sm uppercase tracking-[0.4em] text-white/60">
              {t('Thanks for playing!', 'Obrigado por jogares!')}
            </p>
          </div>

          <div className="mt-6 space-y-3 text-left">
            {finalLeaderboard.map((player: any, index: number) => (
              <div
                key={player.playerId}
                className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-white ${
                  index === 0
                    ? 'border-lenka-gold bg-gradient-to-r from-lenka-gold/40 to-transparent'
                    : index === 1
                    ? 'border-white/20 bg-white/10'
                    : 'border-white/10 bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-black">#{index + 1}</span>
                  <span className="text-lg font-semibold">{player.playerName}</span>
                </div>
                <span className="text-lg font-bold text-lenka-gold">{player.totalScore} pts</span>
              </div>
            ))}
          </div>

          <div className="mt-8 space-y-3">
            {currentPlayer?.isHost && (
              <button
                onClick={handlePlayAgain}
                disabled={isResetting || isLeaving}
                className={`w-full rounded-full border px-6 py-3 text-sm font-semibold ${
                  isResetting || isLeaving
                    ? 'cursor-not-allowed border-white/20 text-white/40'
                    : 'border-lenka-gold text-white hover:bg-lenka-gold/10'
                }`}
              >
                {isResetting ? t('Resetting...', 'A reiniciar...') : t('Play Another Show', 'Jogar novamente')}
              </button>
            )}
            <button
              onClick={handleLeaveLobby}
              disabled={isLeaving || isResetting}
              className={`w-full rounded-full border px-6 py-3 text-sm font-semibold ${
                isLeaving || isResetting
                  ? 'cursor-not-allowed border-white/20 text-white/40'
                  : 'border-white/30 text-white hover:bg-white/10'
              }`}
            >
              {isLeaving ? t('Leaving...', 'A sair...') : t('Exit to Lobby', 'Sair para o lobby')}
            </button>
          </div>
        </div>
        </StageBackground>
        {floatingSettings}
      </>
    );
  }

  // Playing - Guessing phase
  if (currentProduct) {
    return (
      <>
        <StageBackground disableMotion={disableHeavyEffects} maxWidth="max-w-5xl">
          {wheelOverlay}
          {settingsHeader}
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lenka-card backdrop-blur">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-white/60">
                  {language === 'pt'
                    ? `Ronda ${resolvedRoundIndex + 1} / ${resolvedTotalRounds}`
                    : `Round ${resolvedRoundIndex + 1} / ${resolvedTotalRounds}`}
                </p>
                <h2 className="text-3xl font-bold text-white">
                  {t('Guess that price!', 'Adivinha esse preço!')}
                </h2>
              </div>
              <div className={`flex items-center gap-3 rounded-2xl border px-4 py-2 ${
                timeLeft <= 5 ? 'border-lenka-pink text-lenka-pink' : 'border-white/20 text-white'
              }`}>
                <Clock3 className="h-5 w-5" />
                <span className="text-2xl font-black">{timeLeft}s</span>
              </div>
            </div>

            <div className="mt-6 grid gap-6 md:grid-cols-[1fr,0.9fr]">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <p className="text-xs uppercase tracking-[0.4em] text-white/60">{t('Product', 'Produto')}</p>
                <h3 className="mt-2 text-2xl font-bold text-white">{currentProduct.name}</h3>
                {currentProduct.store && (
                  <p className="text-sm font-semibold text-white/80">
                    {t('Store', 'Loja')}: {currentProduct.store}
                  </p>
                )}
                {currentProduct.description && (
                  <p className="text-xs text-white/60">{currentProduct.description}</p>
                )}
              </div>
              <div className="flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 p-2">
                <ProductImage
                  src={currentProduct.imageUrl}
                  alt={currentProduct.name}
                  width={240}
                  height={240}
                  className="rounded-2xl bg-white/10 p-2"
                />
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {error && (
                <div className="rounded-2xl border border-lenka-pink/50 bg-lenka-pink/10 px-4 py-3 text-sm font-semibold text-lenka-pink">
                  {error}
                </div>
              )}
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="flex-1 rounded-2xl border border-white/15 bg-white/5 px-4 py-3">
                  <label className="text-xs uppercase tracking-[0.4em] text-white/50">
                    {t('Your Guess (€)', 'O teu palpite (€)')}
                  </label>
                  <input
                    type="number"
                    value={guess}
                    onChange={(e) => setGuess(e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="w-full bg-transparent text-4xl font-black text-white placeholder:text-white/20 focus:outline-none"
                  />
                </div>
                <button
                  onClick={handleSubmitGuess}
                  disabled={!guess}
                  className={`rounded-2xl px-8 py-4 text-lg font-bold text-white shadow-lenka-card transition ${
                    !guess
                      ? 'cursor-not-allowed bg-white/10 text-white/30'
                      : 'bg-gradient-to-r from-lenka-gold to-lenka-pink hover:scale-[1.01]'
                  }`}
                >
                  {hasSubmitted ? t('Update Guess', 'Atualizar palpite') : t('Lock Guess', 'Bloquear palpite')}
                </button>
              </div>
              {hasSubmitted && (
                <p className="text-center text-sm uppercase tracking-[0.3em] text-lenka-teal">
                  {t('Guess sent! You can still edit before the round closes.', 'Palpite enviado! Podes editar até a ronda fechar.')}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-lenka-card backdrop-blur">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.4em] text-white/60">{t('Contestants', 'Concorrentes')}</p>
                <span className="text-xs text-white/60">
                  {t('Submissions update live', 'Envios atualizados em tempo real')}
                </span>
              </div>
              <div className="mt-3 space-y-2">
                {lobby.players.map((player) => (
                  <div
                    key={player.id}
                    className={`flex items-center justify-between rounded-2xl border px-3 py-2 text-sm font-semibold ${
                      lobby.currentRoundIndex === roundIndex && lobby.guesses[player.id] !== undefined
                        ? 'border-lenka-teal/70 bg-lenka-teal/20 text-lenka-teal'
                        : 'border-white/15 bg-white/5 text-white/70'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span>{player.name}</span>
                      {renderKickButton(player)}
                    </div>
                    {lobby.guesses[player.id] !== undefined && <span>✓</span>}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-lenka-card backdrop-blur">
              <p className="text-xs uppercase tracking-[0.4em] text-white/60">{t('Leaderboard', 'Classificação')}</p>
              <div className="mt-3 space-y-2">
                {[...lobby.players]
                  .sort((a, b) => b.score - a.score)
                  .map((player, index) => (
                    <div
                      key={player.id}
                      className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white"
                    >
                      <span>
                        {index === 0 && '🥇 '}
                        {index === 1 && '🥈 '}
                        {index === 2 && '🥉 '}
                        {player.name}
                      </span>
                      <span className="font-bold text-lenka-gold">{player.score} pts</span>
                    </div>
                  ))}
              </div>
            </div>

            <button
              onClick={handleLeaveLobby}
              disabled={isLeaving}
              className={`w-full rounded-full border px-6 py-3 text-sm font-semibold ${
                isLeaving ? 'cursor-not-allowed border-white/20 text-white/40' : 'border-white/30 text-white hover:bg-white/10'
              }`}
            >
              {isLeaving ? t('Leaving...', 'A sair...') : t('Leave Show', 'Sair do show')}
            </button>
          </div>
        </div>
        </StageBackground>
        {floatingSettings}
      </>
    );
  }

  // Waiting screen (default)
  if (lobby.status === 'waiting') {
    return (
      <>
        <StageBackground disableMotion={disableHeavyEffects} maxWidth="max-w-5xl">
          {wheelOverlay}
        <div className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lenka-card backdrop-blur">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-white/60">{t('Lobby Code', 'Código do lobby')}</p>
                <div className="mt-1 inline-flex items-center gap-3 rounded-2xl border border-white/20 bg-white/5 px-4 py-2 font-mono text-3xl font-black tracking-[0.3em]">
                  {lobby.code}
                  <button
                    onClick={copyLobbyCode}
                    className="text-sm font-semibold text-lenka-gold hover:text-white"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-center">
                <p className="text-xs uppercase tracking-[0.4em] text-white/60">{t('Rounds', 'Rondas')}</p>
                <p className="text-2xl font-black text-white">{lobby.roundsTotal}</p>
              </div>
            </div>

            <p className="mt-4 text-sm text-white/70">
              {t('Invite your friends, set the vibe, and get ready to spin.', 'Convida os amigos, prepara o ambiente e fica pronto para rodar.')}
            </p>

            <div className="mt-6 space-y-4">
              <div className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3">
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-white/60">
                  <span>{t('Game settings', 'Definições do jogo')}</span>
                  <span>
                    {currentPlayer?.isHost
                      ? t('Host controls', 'Controlado pelo anfitrião')
                      : t('Host is selecting', 'O anfitrião está a escolher')}
                  </span>
                </div>
                <p className="mt-2 text-sm text-white/80">
                  {t('Rounds', 'Rondas')}: <span className="font-semibold text-white">{lobby.roundsTotal}</span> •{' '}
                  {t('Store', 'Loja')}: <span className="font-semibold text-white">{getProductSourceLabel(lobby.productSource)}</span>
                </p>
                {currentPlayer?.isHost && (
                  <div className="mt-4 space-y-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-white/60">
                        {t('Pick the number of rounds', 'Escolhe o número de rondas')}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {roundOptions.map((option) => (
                          <button
                            key={option}
                            type="button"
                            onClick={() => handleLobbySettingsChange({ roundsTotal: option })}
                            className={`rounded-full border px-4 py-2 text-sm font-semibold ${
                              lobby.roundsTotal === option
                                ? 'border-lenka-gold bg-lenka-gold/20 text-lenka-gold'
                                : 'border-white/15 bg-white/5 text-white/70 hover:text-white'
                            }`}
                          >
                            {language === 'pt' ? `${option} rondas` : `${option} rounds`}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-white/60">
                        {t('Product source', 'Fonte de produtos')}
                      </p>
                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        {productSourceOptions.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => handleLobbySettingsChange({ productSource: option.value })}
                            className={`rounded-2xl border p-3 text-left text-sm ${
                              lobby.productSource === option.value
                                ? 'border-lenka-teal bg-lenka-teal/15 text-white'
                                : 'border-white/15 bg-white/5 text-white/70 hover:text-white'
                            }`}
                          >
                            <p className="font-semibold text-white">{language === 'pt' ? option.label.pt : option.label.en}</p>
                            <p className="text-xs text-white/70">
                              {language === 'pt' ? option.description.pt : option.description.en}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <div className="rounded-2xl border border-lenka-pink/50 bg-lenka-pink/10 px-4 py-3 text-sm font-semibold text-lenka-pink">
                  {error}
                </div>
              )}

              {currentPlayer?.isHost ? (
                <button
                  onClick={handleStartGame}
                  disabled={lobby.players.length < 1 || isStarting}
                  className={`w-full rounded-2xl px-6 py-4 text-lg font-bold text-white shadow-lenka-card transition ${
                    lobby.players.length < 1 || isStarting
                      ? 'cursor-not-allowed bg-white/10 text-white/30'
                      : 'bg-gradient-to-r from-lenka-gold to-lenka-pink hover:scale-[1.01]'
                  }`}
                >
                  {isStarting ? 'Calling the wheel...' : 'Start The Show'}
                </button>
              ) : (
                <div className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-center text-sm text-white/70">
                  {t('Waiting for the host to spin the wheel...', 'À espera que o anfitrião rode a roda...')}
                </div>
              )}

              <button
                onClick={handleLeaveLobby}
                disabled={isLeaving}
                className={`w-full rounded-2xl border px-6 py-3 text-sm font-semibold ${
                  isLeaving ? 'cursor-not-allowed border-white/20 text-white/40' : 'border-white/30 text-white hover:bg-white/10'
                }`}
              >
                {isLeaving ? t('Leaving...', 'A sair...') : t('Leave Lobby', 'Sair do lobby')}
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-lenka-card backdrop-blur">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.4em] text-white/60">
                  {t('Contestants', 'Concorrentes')} ({lobby.players.length})
                </p>
                <Users className="h-5 w-5 text-lenka-gold" />
              </div>
              <div className="mt-3 space-y-2">
                {lobby.players.map((player) => (
                  <div
                    key={player.id}
                    className={`flex items-center justify-between rounded-2xl border px-4 py-2 text-sm font-semibold ${
                      player.isHost
                        ? 'border-lenka-gold/60 bg-lenka-gold/10 text-lenka-gold'
                        : 'border-white/15 bg-white/5 text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span>{player.name}</span>
                      {renderKickButton(player)}
                    </div>
                    {player.isHost && <span className="text-xs uppercase tracking-[0.4em]">Host</span>}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-lenka-card backdrop-blur">
              <p className="text-xs uppercase tracking-[0.4em] text-white/60">
                {t('Showtime Pro Tips', 'Dicas do espetáculo')}
              </p>
              <ul className="mt-3 space-y-2 text-sm text-white/70">
                <li>• {t('Lock your guess early — Lenka auto-saves the last price if the buzzer hits.', 'Bloqueia o palpite cedo — a Lenka guarda o último preço caso o buzzer toque.')}</li>
                <li>• {t('Auto-submit kicks in with 1 second left, so stay calm if you’re finishing a value.', 'O envio automático acontece a 1 segundo do fim, por isso mantém a calma se estiveres a terminar um valor.')}</li>
                <li>• {t('Ready up between rounds to keep the show moving — the wheel only spins once everyone clicks Ready.', 'Marca-te pronto entre rondas para manter o show a andar — a roda só gira quando todos clicam em Pronto.')}</li>
              </ul>
            </div>
          </div>
        </div>
        <div className="mt-6">
          <SafeExitButton onClick={handleSafeReturn} label={t('Exit to Main Menu', 'Voltar ao menu principal')} />
        </div>
        </StageBackground>
        {floatingSettings}
      </>
    );
  }

  return null;
}
