'use client';

import { useEffect, useState, useRef, useTransition, useCallback, type ReactNode } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  Clock3,
  Copy,
  DoorOpen,
  Loader2,
  RadioTower,
  Sparkles,
  Trophy,
  Users,
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
import TopControls from '@/app/components/TopControls';
import SfxToggle from '@/app/components/sfx/SfxToggle';



function StageBackground({
  children,
  maxWidth = 'max-w-5xl',
  disableMotion = false,
  overlay,
}: {
  children: ReactNode;
  maxWidth?: string;
  disableMotion?: boolean;
  overlay?: ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-page px-3 py-8 text-blue-deep sm:px-6">
      <div className="pointer-events-none absolute inset-0">
        {disableMotion ? (
          <>
            <div className="absolute -left-10 top-8 h-48 w-48 rotate-6 rounded-lg bg-blue-light/30 blur-3xl" />
            <div className="absolute -right-6 bottom-10 h-40 w-40 -rotate-3 rounded-lg bg-blue-mid/25 blur-3xl" />
          </>
        ) : (
          <>
            <motion.div
              className="absolute -left-10 top-8 h-48 w-48 rotate-6 rounded-lg bg-blue-light/30 blur-3xl"
              animate={{ rotate: 12 }}
              transition={{ repeat: Infinity, repeatType: 'reverse', duration: 14, ease: 'easeInOut' }}
            />
            <motion.div
              className="absolute -right-6 bottom-10 h-40 w-40 -rotate-3 rounded-lg bg-blue-mid/25 blur-3xl"
              animate={{ rotate: -10 }}
              transition={{ repeat: Infinity, repeatType: 'reverse', duration: 18, ease: 'easeInOut' }}
            />
          </>
        )}
      </div>
      <div className={`relative z-10 mx-auto ${maxWidth}`}>{children}</div>
      {overlay}
    </div>
  );
}

function SettingsPanel() {
  return (
    <div className="flyer-panel bg-card px-4 py-3 text-blue-deep">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.4em] text-blue-mid">Settings</p>
          <p className="text-sm font-display text-blue-deep/80">Sound Effects</p>
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
        className="coupon-button inline-flex items-center gap-2 rounded-full bg-blue-light px-4 py-2 text-xs text-blue-deep hover:-translate-y-1"
      >
        <span className="font-mono text-sm font-black tracking-[0.35em]">{code}</span>
        <Copy className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function SafeExitButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="coupon-button w-full justify-center bg-card px-6 py-3 text-sm text-blue-deep hover:-translate-y-1"
    >
      {label}
    </button>
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
  const [isMobileLayout, setIsMobileLayout] = useState(false);
  const [layoutReady, setLayoutReady] = useState(false);
  const [readyTimeout, setReadyTimeout] = useState(45);
  const [isReady, setIsReady] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

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
  const [showSettings, setShowSettings] = useState(false);

  const mountedRef = useRef(false);
  const activeTimeouts = useRef<NodeJS.Timeout[]>([]); // Track all active timeouts
  const cleanupFunctionsRef = useRef<(() => void)[]>([]); // Track cleanup functions
  const prevTimeLeftRef = useRef(timeLeft);

  const previousLobbyStatusRef = useRef<Lobby['status'] | null>(null);
  const playerNameRef = useRef<string>('');
  const clientIdRef = useRef<string>('');
  const activeLobbyCodeRef = useRef<string | null>(code !== '__create__' ? code : null);
  const kickingPlayerIdRef = useRef<string | null>(null);
  const safeReturnRef = useRef<() => void>(() => { });
  const shouldConfirmExitRef = useRef(true);
  const lastAppliedResultRoundRef = useRef<number | null>(null);
  const lastSubmittedGuessRef = useRef<string>('');
  const autoSubmitRoundRef = useRef<number | null>(null);
  const { playTick, playDing, playBuzzer, playFanfare, playApplause } = useSfx();
  const { language, setLanguage } = useLanguage();
  const t = useCallback((en: string, pt: string) => (language === 'pt' ? pt : en), [language]);
  const languageRef = useRef(language);

  useEffect(() => {
    languageRef.current = language;
  }, [language]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => setIsMobileLayout(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    setLayoutReady(true);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    document.body.style.overflow = showSettings ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [showSettings]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => setIsMobileLayout(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
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
        label: { en: 'Random', pt: 'Aleatório' },
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
        return t('Random', 'Aleatório');
    }
  };

  const disableHeavyEffects = true;



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
      setIsStarting(false);
      setPendingLoadingState(null);
      setPendingRoundPayload(null);
      setIsLoadingProducts(true);
      setLoadingMessage(message || t('Loading products...', 'A carregar produtos...'));
      setTotalRounds(total);
      setLobby((prev) => (prev ? { ...prev, status: 'loading' } : prev));
    });

    const unsubGameStarted = onGameStarted(({ product, roundIndex: rIndex, totalRounds: total }) => {
      console.log('🎮 Game started! Product:', product.name);
      const payload = { product, roundIndex: rIndex, totalRounds: total };
      setIsStarting(false);
      setPendingLoadingState(null);
      setPendingRoundPayload(null);
      setIsLoadingProducts(false);
      setLoadingMessage('');
      setLobby((prev) =>
        prev
          ? {
            ...prev,
            status: 'playing',
            currentRoundIndex: rIndex,
            roundsTotal: total,
            currentProduct: product,
          }
          : prev
      );
      revealProduct(payload);
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
      setIsLoadingProducts(false); // Ensure loading state is cleared
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
  }, [addTimeout, code, router]);

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


  const topControls = (
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
  );
  const settingsModal = showSettings ? (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center bg-blue-deep/40 px-4 py-5 backdrop-blur-sm"
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
              {(['pt', 'en'] as Language[]).map((lng) => (
                <button
                  key={lng}
                  onClick={() => {
                    setLanguage(lng);
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
  ) : null;

  if (!layoutReady) {
    return null;
  }

  if (!lobby) {
    return (
      <>
        <StageBackground disableMotion={disableHeavyEffects} maxWidth="max-w-3xl" overlay={settingsModal}>

          <div className="flyer-box bg-card p-10 text-center">
            {error ? (
              <div className="space-y-4">
                <p className="font-ad text-2xl uppercase text-red-700">{error}</p>
                <button
                  onClick={() => {
                    shouldConfirmExitRef.current = false;
                    router.push('/');
                  }}
                  className="coupon-button inline-flex items-center justify-center bg-blue-mid px-6 py-3 text-lg text-card hover:-translate-y-1"
                >
                  {t('Return Home', 'Voltar ao início')}
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-blue-deep" />
                <p className="font-ad text-xl uppercase text-blue-deep">
                  {t('Connecting to your lobby...', 'A ligar ao teu lobby...')}
                </p>
                <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-blue-mid">
                  {t('Negotiating with Lenka HQ', 'A negociar com a Lenka HQ')}
                </p>
              </div>
            )}
          </div>
        </StageBackground>
      </>
    );
  }
  const settingsHeader = lobby.status === 'finished' ? null : <SettingsHeader code={lobby.code} onCopy={copyLobbyCode} />;

  // Loading products screen
  if ((isLoadingProducts || (lobby.status === 'loading' && !currentProduct)) && lobby.status !== 'finished') {
    const loadingCopy =
      loadingMessage ||
      pendingLoadingState?.message ||
      t('Fetching products...', 'A buscar produtos...');
    const totalToShow = totalRounds || lobby.roundsTotal;
    return (
      <>
        <StageBackground disableMotion={disableHeavyEffects} maxWidth="max-w-4xl" overlay={settingsModal}>
          {settingsHeader}
          <div className="flyer-box bg-card p-8 text-center mt-10">
            <div className="flex flex-col items-center gap-3">
              <div className="promo-badge rounded-full bg-blue-mid text-card shadow-flyer">
                <RadioTower className="h-10 w-10" />
              </div>
              <h1 className="font-ad text-3xl uppercase text-blue-deep">
                {language === 'pt' ? 'A buscar produtos...' : 'Fetching products...'}
              </h1>
              <p className="font-display text-base text-blue-deep/80">
                {language === 'pt'
                  ? `A tentar ir buscar ${totalToShow} produtos`
                  : `Trying to fetch ${totalToShow} products`}
              </p>
              <p className="font-display text-sm text-blue-deep/70">{loadingCopy}</p>
              <div className="mt-6 flex justify-center gap-2">
                {[0, 150, 300].map((delay) => (
                  <span
                    key={delay}
                    className="h-3 w-3 rounded-full bg-blue-deep opacity-80 animate-bounce"
                    style={{ animationDelay: `${delay}ms` }}
                  />
                ))}
              </div>
              <div className="mt-6 flex justify-center">
                <button
                  onClick={handleSafeReturn}
                  className="coupon-button inline-flex items-center gap-2 bg-card px-5 py-3 text-sm text-blue-deep hover:-translate-y-1"
                >
                  <DoorOpen className="h-4 w-4" />
                  {t('Exit to Home', 'Sair para o início')}
                </button>
              </div>
            </div>
          </div>
        </StageBackground>
      </>
    );
  }

  const resolvedTotalRounds = totalRounds || lobby.roundsTotal;
  const resolvedRoundIndex = roundResults?.roundIndex ?? lobby.currentRoundIndex ?? roundIndex;

  // Playing - Show results (check FIRST before waiting/finished screens)
  if (showResults && roundResults) {
    const guessEntries = roundResults.results
      .filter((result: any) => typeof result.guess === 'number')
      .map((result: any, index: number) => ({
        playerName: result.playerName,
        guess: result.guess as number,
        difference: Math.abs((result.guess as number) - roundResults.realPrice),
        signedDifference: (result.guess as number) - roundResults.realPrice,
      }));
    const maxDifference = guessEntries.reduce(
      (max: number, entry: typeof guessEntries[number]) => Math.max(max, entry.difference),
      0
    );
    const targetPoints = guessEntries.map((entry: typeof guessEntries[number], index: number) => {
      const angle =
        guessEntries.length > 0 ? -Math.PI / 2 + (index / guessEntries.length) * Math.PI * 2 : 0;
      const baseRadius = 32;
      const radiusRange = 88;
      const radius = baseRadius + (maxDifference === 0 ? 0 : (entry.difference / maxDifference) * radiusRange);
      return { ...entry, angle, radius };
    });
    const sortedGuessEntries = [...guessEntries].sort((a, b) => a.difference - b.difference);

    if (isMobileLayout) {
      return (
        <>
          {topControls}
          <StageBackground disableMotion={disableHeavyEffects} maxWidth="max-w-md" overlay={settingsModal}>
            <div className="space-y-3 mt-12">
              <div className="flyer-box bg-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-blue-mid">
                      {language === 'pt'
                        ? `Ronda ${resolvedRoundIndex + 1} de ${resolvedTotalRounds}`
                        : `Round ${resolvedRoundIndex + 1} of ${resolvedTotalRounds}`}
                    </p>
                    <h1 className="font-ad text-2xl uppercase text-blue-deep">
                      {t('Round Results', 'Resultados da ronda')}
                    </h1>
                  </div>
                </div>
                <div className="flyer-panel bg-blue-light/15 px-4 py-3 text-center">
                  <p className="text-[10px] uppercase tracking-[0.4em] text-blue-mid">
                    {t('Real Price', 'Preço real')}
                  </p>
                  <p className="font-ad text-3xl uppercase text-blue-deep">€{roundResults.realPrice.toFixed(2)}</p>
                  {roundResults.productStore && (
                    <p className="mt-1 text-sm text-blue-deep/80">
                      {t('From', 'Loja')} {roundResults.productStore}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  {sortedGuessEntries.map((entry) => {
                    const directionLabel =
                      entry.signedDifference === 0
                        ? t('Exact', 'Certo')
                        : entry.signedDifference > 0
                          ? t('Over', 'Acima')
                          : t('Under', 'Abaixo');
                    return (
                      <div
                        key={`mobile-result-${entry.playerName}-${entry.guess}`}
                        className="flex items-center justify-between rounded-md border border-blue-deep/40 bg-card px-3 py-2 text-sm"
                      >
                        <div>
                          <p className="font-display font-semibold text-blue-deep">{entry.playerName}</p>
                          <p className="text-xs text-blue-deep/70">
                            {directionLabel}
                            {entry.signedDifference === 0
                              ? ''
                              : ` €${Math.abs(entry.signedDifference).toFixed(2)}`}
                          </p>
                        </div>
                        <span className="font-ad text-lg text-blue-deep">€{entry.guess.toFixed(2)}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="space-y-2">
                  {!isReady ? (
                    <button
                      onClick={handleMarkReady}
                      className="coupon-button w-full bg-blue-mid px-5 py-3 text-card"
                    >
                      {resolvedRoundIndex + 1 === resolvedTotalRounds
                        ? t('See Final Results', 'Ver Resultados Finais')
                        : t('Ready for next round', 'Pronto para a próxima ronda')}
                    </button>
                  ) : (
                    <div className="text-center text-sm font-semibold uppercase tracking-[0.3em] text-blue-mid">
                      {t('Ready! Waiting for others...', 'Pronto! A aguardar os restantes...')}
                    </div>
                  )}
                  <button
                    onClick={handleLeaveLobby}
                    disabled={isLeaving}
                    className={`coupon-button w-full bg-card px-5 py-3 text-sm ${isLeaving ? 'cursor-not-allowed opacity-60' : 'hover:-translate-y-1'
                      }`}
                  >
                    {isLeaving ? t('Leaving...', 'A sair...') : t('Leave Game', 'Sair do jogo')}
                  </button>
                </div>
              </div>

              <div className="flyer-box bg-card p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.4em] text-blue-mid">
                  {t('Leaderboard', 'Classificação')}
                </p>
                <div className="mt-3 space-y-2">
                  {[...lobby.players]
                    .sort((a, b) => b.score - a.score)
                    .map((player, index) => (
                      <div
                        key={`m-lead-${player.id}`}
                        className={`flex items-center justify-between rounded-md border-2 px-4 py-2 text-sm shadow-flyer-xs ${index === 0 ? 'border-blue-deep bg-blue-light/40' : 'border-blue-deep/60 bg-card'
                          }`}
                      >
                        <span className="font-display text-blue-deep">
                          {index === 0 && '🥇 '}
                          {index === 1 && '🥈 '}
                          {index === 2 && '🥉 '}
                          {player.name}
                        </span>
                        <span className="font-ad text-blue-deep">{player.score} pts</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </StageBackground>
        </>
      );
    }
    return (
      <>
        <StageBackground disableMotion={disableHeavyEffects} maxWidth="max-w-5xl" overlay={settingsModal}>

          {settingsHeader}
          <div className="space-y-6">
            <div className="flyer-box bg-card p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.45em] text-blue-mid">
                    {language === 'pt'
                      ? `Ronda ${resolvedRoundIndex + 1} de ${resolvedTotalRounds}`
                      : `Round ${resolvedRoundIndex + 1} of ${resolvedTotalRounds}`}
                  </p>
                  <h1 className="font-ad text-3xl uppercase text-blue-deep">
                    {t('Round Results', 'Resultados da ronda')}
                  </h1>
                  <p className="font-display text-sm text-blue-deep/80">
                    {t('The closest guess earns the spotlight and the bonus.', 'Quem acerta mais aproxima-se dos holofotes e do bónus.')}
                  </p>
                </div>
                <button
                  onClick={handleLeaveLobby}
                  disabled={isLeaving}
                  className={`coupon-button inline-flex items-center gap-2 bg-card px-5 py-2 text-sm ${isLeaving ? 'cursor-not-allowed opacity-60' : 'hover:-translate-y-1'
                    }`}
                >
                  <DoorOpen className="h-4 w-4" />
                  {isLeaving ? t('Leaving...', 'A sair...') : t('Leave Game', 'Sair do jogo')}
                </button>
              </div>

              <div className="mt-6 grid gap-6 md:grid-cols-2">
                <div className="flyer-panel bg-blue-light/20 p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.4em] text-blue-mid">
                    {t('Real Price', 'Preço real')}
                  </p>
                  <div className="mt-3 rounded-md border-2 border-blue-deep bg-blue-mid px-4 py-3 text-card shadow-flyer-sm">
                    <p className="font-ad text-4xl uppercase">€{roundResults.realPrice.toFixed(2)}</p>
                  </div>
                  {roundResults.productStore && (
                    <p className="mt-2 font-display text-sm text-blue-deep/80">
                      {t('From', 'Loja')} {roundResults.productStore}
                    </p>
                  )}
                  {roundResults.productUrl && (
                    <a
                      href={roundResults.productUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-flex items-center gap-2 rounded-md border-2 border-blue-deep bg-card px-4 py-2 font-ad text-sm uppercase text-blue-deep shadow-flyer-xs transition hover:-translate-y-0.5"
                    >
                      {t('View product', 'Ver produto')}
                      <Sparkles className="h-4 w-4" />
                    </a>
                  )}
                  <div className="mt-6 space-y-3 rounded-md border border-blue-light/60 bg-blue-light/10 p-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.4em] text-blue-mid">
                        {t('Ready Check', 'Prontos?')}
                      </p>
                      <p className="font-ad text-xl uppercase text-blue-deep">
                        {t('Ready', 'Prontos')} {Object.keys(lobby.readyPlayers || {}).length} / {lobby.players.length}
                      </p>
                      <p className="text-[10px] uppercase tracking-[0.35em] text-blue-deep/70">
                        {t('Auto-start in', 'Começa automaticamente em')}{' '}
                        {Math.floor(readyTimeout / 60)}:{String(readyTimeout % 60).padStart(2, '0')}
                      </p>
                    </div>
                    {!isReady ? (
                      <button
                        onClick={handleMarkReady}
                        className="coupon-button inline-flex w-full items-center justify-center gap-2 bg-blue-mid px-4 py-2 text-sm text-card hover:-translate-y-1"
                      >
                        <Sparkles className="h-4 w-4" />
                        {resolvedRoundIndex + 1 === resolvedTotalRounds
                          ? t('See Final Results', 'Ver Resultados Finais')
                          : t('Mark Ready', 'Marcar pronto')}
                      </button>
                    ) : (
                      <div className="rounded-md border border-blue-mid/40 bg-blue-mid/10 px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-[0.3em] text-blue-deep">
                        {t('You are marked ready', 'Estás pronto')}
                      </div>
                    )}
                    <div className="mt-3 flex max-h-32 flex-wrap gap-2 overflow-y-auto">
                      {lobby.players.map((player) => (
                        <div
                          key={`ready-pill-${player.id}`}
                          className={`label-chip flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold ${lobby.readyPlayers?.[player.id]
                            ? 'bg-blue-light text-blue-deep'
                            : 'bg-card text-blue-deep/70'
                            }`}
                        >
                          <span>{player.name}</span>
                          {lobby.readyPlayers?.[player.id] && <span>✓</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flyer-panel bg-card p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.4em] text-blue-mid">
                    {t('Guess spread', 'Nuvem de palpites')}
                  </p>
                  {targetPoints.length === 0 ? (
                    <p className="mt-3 text-sm text-blue-deep/70">
                      {t('No guesses landed this round.', 'Não houve palpites nesta ronda.')}
                    </p>
                  ) : (
                    <>
                      <div className="mx-auto mt-4 flex items-center justify-center">
                        <div className="relative h-64 w-64">
                          <div className="absolute inset-0 rounded-full border-2 border-blue-deep/40" />
                          <div className="absolute inset-4 rounded-full border border-blue-deep/30" />
                          <div className="absolute inset-8 rounded-full border border-blue-deep/20" />
                          <div className="absolute inset-12 rounded-full border border-blue-deep/10" />
                          <div className="absolute left-1/2 top-1/2 flex h-24 w-24 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full bg-blue-mid text-card shadow-flyer">
                            <p className="text-[10px] uppercase tracking-[0.4em]">{t('Target', 'Alvo')}</p>
                            <p className="font-ad text-xl">€{roundResults.realPrice.toFixed(2)}</p>
                          </div>
                          {targetPoints.map((entry: (typeof targetPoints)[number]) => {
                            const translateX = Math.cos(entry.angle) * entry.radius;
                            const translateY = Math.sin(entry.angle) * entry.radius;
                            return (
                              <div
                                key={`${entry.playerName}-${entry.guess}`}
                                className="absolute left-1/2 top-1/2"
                                style={{
                                  transform: `translate(-50%, -50%) translate(${translateX}px, ${translateY}px)`,
                                }}
                              >
                                <div className="flex flex-col items-center gap-1 text-center">
                                  <span className="rounded-full bg-card px-2 py-0.5 text-[10px] font-semibold uppercase text-blue-deep shadow-flyer-xs">
                                    {entry.playerName}
                                  </span>
                                  <span className="rounded-full bg-blue-light/70 px-2 py-0.5 text-[11px] font-display text-blue-deep">
                                    €{entry.guess.toFixed(0)}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      <div className="mt-5 space-y-2">
                        {sortedGuessEntries.map((entry) => {
                          const directionLabel =
                            entry.signedDifference === 0
                              ? t('Perfect match', 'Acerto perfeito')
                              : entry.signedDifference > 0
                                ? t('Over by', 'Acima por')
                                : t('Under by', 'Abaixo por');
                          return (
                            <div
                              key={`list-${entry.playerName}-${entry.guess}`}
                              className="flex items-center justify-between rounded-md border border-blue-light/60 bg-blue-light/10 px-3 py-2"
                            >
                              <div>
                                <p className="font-display font-semibold text-blue-deep">{entry.playerName}</p>
                                <p className="text-xs text-blue-deep/70">
                                  {directionLabel}
                                  {entry.signedDifference === 0
                                    ? ''
                                    : ` €${Math.abs(entry.signedDifference).toFixed(2)}`}
                                </p>
                              </div>
                              <span className="font-ad text-lg text-blue-deep">€{entry.guess.toFixed(2)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flyer-box bg-card p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.4em] text-blue-mid">
                {t('Leaderboard', 'Classificação')}
              </p>
              <div className="mt-3 space-y-2">
                {[...lobby.players]
                  .sort((a, b) => b.score - a.score)
                  .map((player, index) => (
                    <div
                      key={player.id}
                      className={`flex items-center justify-between rounded-md border-2 px-4 py-2 text-sm shadow-flyer-xs ${index === 0 ? 'border-blue-deep bg-blue-light/40' : 'border-blue-deep/60 bg-card'
                        }`}
                    >
                      <span className="font-display text-blue-deep">
                        {index === 0 && '🥇 '}
                        {index === 1 && '🥈 '}
                        {index === 2 && '🥉 '}
                        {player.name}
                      </span>
                      <span className="font-ad text-blue-deep">{player.score} pts</span>
                    </div>
                  ))}
              </div>
            </div>

          </div>
        </StageBackground>
      </>
    );
  }

  // Game finished screen (CHECK BEFORE currentProduct to prevent showing guess screen)
  if (lobby.status === 'finished' && finalLeaderboard) {
    return (
      <>
        {topControls}
        <StageBackground disableMotion={disableHeavyEffects} maxWidth="max-w-md" overlay={settingsModal}>

          <div className="flyer-box bg-card p-3 space-y-2.5 mt-12">
            <div className="flex flex-col items-center gap-3">
              <div className="promo-badge rounded-full bg-blue-mid text-card shadow-flyer">
                <Trophy className="h-10 w-10" />
              </div>
              <h1 className="font-display text-4xl font-semibold text-blue-deep">
                {t('Lenka Grand Finale', 'Grande final Lenka')}
              </h1>
              <p className="font-ad text-sm uppercase tracking-[0.4em] text-blue-mid">
                {t('Thanks for playing!', 'Obrigado por jogares!')}
              </p>
            </div>

            <div className="mt-6 space-y-3 text-left">
              {finalLeaderboard.map((player: any, index: number) => (
                <div
                  key={player.playerId}
                  className={`flex items-center justify-between rounded-md border-2 px-4 py-3 shadow-flyer-xs ${index === 0
                    ? 'border-blue-deep bg-blue-light/40'
                    : 'border-blue-deep/70 bg-card'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-ad text-2xl uppercase text-blue-deep">#{index + 1}</span>
                    <span className="font-display text-lg text-blue-deep">{player.playerName}</span>
                  </div>
                  <span className="font-ad text-lg uppercase text-blue-deep">{player.totalScore} pts</span>
                </div>
              ))}
            </div>

            <div className="mt-8 space-y-3">
              {currentPlayer?.isHost && (
                <button
                  onClick={handlePlayAgain}
                  disabled={isResetting || isLeaving}
                  className={`coupon-button w-full bg-blue-mid px-6 py-3 text-sm text-card ${isResetting || isLeaving ? 'cursor-not-allowed opacity-60' : 'hover:-translate-y-1'
                    }`}
                >
                  {isResetting ? t('Resetting...', 'A reiniciar...') : t('Play Another Show', 'Jogar novamente')}
                </button>
              )}
              <button
                onClick={handleLeaveLobby}
                disabled={isLeaving || isResetting}
                className={`coupon-button w-full bg-card px-6 py-3 text-sm ${isLeaving || isResetting ? 'cursor-not-allowed opacity-60' : 'hover:-translate-y-1'
                  }`}
              >
                {isLeaving ? t('Leaving...', 'A sair...') : t('Exit to Lobby', 'Sair para o lobby')}
              </button>
            </div>
          </div>
        </StageBackground>
      </>
    );
  }

  // Playing - Guessing phase
  if (currentProduct) {
    if (isMobileLayout) {
      const productImageSize = 140;
      return (
        <>
          {topControls}
          <StageBackground disableMotion={disableHeavyEffects} maxWidth="max-w-md" overlay={settingsModal}>

            <div className="flyer-box bg-card p-3 space-y-2.5 mt-12">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-0.5">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.35em] text-blue-mid">
                    {language === 'pt'
                      ? `Ronda ${resolvedRoundIndex + 1} / ${resolvedTotalRounds}`
                      : `Round ${resolvedRoundIndex + 1} / ${resolvedTotalRounds}`}
                  </p>

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

              {error && (
                <div className="flyer-panel border-red-500 bg-red-100 px-2.5 py-2 text-[11px] font-semibold text-red-700">
                  {error}
                </div>
              )}
              <br></br>
              <h2 className="font-ad text-lg uppercase leading-tight text-blue-deep">
                {t('Guess that price!', 'Adivinha esse preço!')}
              </h2>

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
                  onClick={handleSubmitGuess}
                  disabled={!guess}
                  className={`coupon-button self-stretch px-4 text-sm ${!guess ? 'cursor-not-allowed opacity-60' : 'bg-blue-mid text-card hover:-translate-y-1'
                    }`}
                >
                  {hasSubmitted ? t('Update', 'Atualizar') : t('Submit', 'Submeter')}
                </button>
              </div>

              <div className="flyer-panel bg-blue-light/10 px-2.5 py-2">
                <div className="flex items-center justify-between text-[9px] font-semibold uppercase tracking-[0.3em] text-blue-mid">
                  <span>{t('Contestants', 'Concorrentes')}</span>
                  <span className="font-ad text-[11px] uppercase text-blue-deep">{lobby.players.length}</span>
                </div>
                <div className="mt-1.5 max-h-16 space-y-1 overflow-y-auto">
                  {lobby.players.map((player) => {
                    const hasGuess = lobby.guesses[player.id] !== undefined;
                    return (
                      <div
                        key={`mob-player-${player.id}`}
                        className={`flex items-center justify-between rounded border border-blue-deep/50 px-2 py-1 text-[12px] font-semibold ${hasGuess ? 'bg-blue-light/40 text-blue-deep' : 'bg-card text-blue-deep'
                          }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="truncate">{player.name}</span>
                          {player.isHost && (
                            <span className="text-[9px] font-ad uppercase tracking-[0.3em] text-blue-mid">
                              {t('Host', 'Host')}
                            </span>
                          )}
                        </div>
                        {hasGuess && <span className="font-ad text-sm text-blue-deep">✓</span>}
                      </div>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={handleLeaveLobby}
                disabled={isLeaving}
                className={`coupon-button w-full bg-card px-4 py-2 text-sm ${isLeaving ? 'cursor-not-allowed opacity-60' : 'hover:-translate-y-1'
                  }`}
              >
                {isLeaving ? t('Leaving...', 'A sair...') : t('Leave Game', 'Sair do jogo')}
              </button>
            </div>
          </StageBackground>
        </>
      );
    }

    return (
      <>
        {topControls}
        <StageBackground disableMotion={disableHeavyEffects} maxWidth="max-w-5xl" overlay={settingsModal}>

          {settingsHeader}
          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <div className="flyer-box bg-card p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.45em] text-blue-mid">
                    {language === 'pt'
                      ? `Ronda ${resolvedRoundIndex + 1} / ${resolvedTotalRounds}`
                      : `Round ${resolvedRoundIndex + 1} / ${resolvedTotalRounds}`}
                  </p>
                  <h2 className="font-ad text-3xl uppercase text-blue-deep">
                    {t('Guess that price!', 'Adivinha esse preço!')}
                  </h2>
                </div>
                <div className="promo-badge rounded-full bg-blue-mid px-4 py-3 text-card shadow-flyer">
                  <Clock3 className="h-5 w-5" />
                  <span className="ml-2 text-2xl">{timeLeft}s</span>
                </div>
              </div>

              <div className="mt-6 grid gap-6 md:grid-cols-[1fr,0.9fr]">
                <div className="flyer-panel bg-card p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.4em] text-blue-mid">{t('Product', 'Produto')}</p>
                  <h3 className="mt-2 font-ad text-2xl uppercase text-blue-deep">{currentProduct.name}</h3>
                  {currentProduct.store && (
                    <p className="font-display text-sm text-blue-deep/80">
                      {t('Store', 'Loja')}: {currentProduct.store}
                    </p>
                  )}
                  {currentProduct.description && (
                    <p className="text-xs text-blue-deep/70">{currentProduct.description}</p>
                  )}
                </div>
                <div className="flex items-center justify-center rounded-md border-2 border-blue-deep bg-card p-2 shadow-flyer-sm">
                  <ProductImage
                    src={currentProduct.imageUrl}
                    alt={currentProduct.name}
                    width={240}
                    height={240}
                    className="rounded-md border-2 border-blue-deep bg-blue-light/30 p-2 shadow-flyer-xs"
                  />
                </div>
              </div>

              <div className="mt-6 space-y-4">
                {error && (
                  <div className="flyer-panel border-red-500 bg-red-100 px-4 py-3 text-sm font-semibold text-red-700">
                    {error}
                  </div>
                )}
                <div className="flex flex-col gap-3 sm:flex-row">
                  <div className="flyer-panel flex-1 bg-card px-4 py-3">
                    <label className="text-[11px] font-semibold uppercase tracking-[0.4em] text-blue-mid">
                      {t('Your Guess (€)', 'O teu palpite (€)')}
                    </label>
                    <input
                      type="number"
                      value={guess}
                      onChange={(e) => setGuess(e.target.value)}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      className="mt-2 w-full bg-transparent font-ad text-4xl uppercase text-blue-deep placeholder:text-blue-deep/30 focus:outline-none"
                    />
                  </div>
                  <button
                    onClick={handleSubmitGuess}
                    disabled={!guess}
                    className={`coupon-button px-7 py-4 text-lg ${!guess ? 'cursor-not-allowed opacity-60' : 'bg-blue-mid text-card hover:-translate-y-1'
                      }`}
                  >
                    {hasSubmitted ? t('Update Guess', 'Atualizar palpite') : t('Submit guess', 'Submeter palpite')}
                  </button>
                </div>
                {hasSubmitted && (
                  <p className="text-center text-sm font-semibold uppercase tracking-[0.3em] text-blue-mid">
                    {t('Guess sent! You can still edit before the round closes.', 'Palpite enviado! Podes editar até a ronda fechar.')}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div className="flyer-box bg-card p-5">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.4em] text-blue-mid">{t('Contestants', 'Concorrentes')}</p>
                  <span className="text-[11px] uppercase tracking-[0.3em] text-blue-deep/70">
                    {t('Submissions update live', 'Envios atualizados em tempo real')}
                  </span>
                </div>
                <div className="mt-3 space-y-2">
                  {lobby.players.map((player) => (
                    <div
                      key={player.id}
                      className={`flex items-center justify-between rounded-md border-2 px-3 py-2 text-sm font-semibold shadow-flyer-xs ${lobby.currentRoundIndex === roundIndex && lobby.guesses[player.id] !== undefined
                        ? 'border-blue-deep bg-blue-light/40 text-blue-deep'
                        : 'border-blue-deep/60 bg-card text-blue-deep'
                        }`}
                    >
                      <div className="flex items-center gap-2">
                        <span>{player.name}</span>
                        {renderKickButton(player)}
                      </div>
                      {lobby.guesses[player.id] !== undefined && <span className="font-ad text-blue-deep">✓</span>}
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={handleLeaveLobby}
                disabled={isLeaving}
                className={`coupon-button w-full bg-card px-6 py-3 text-sm ${isLeaving ? 'cursor-not-allowed opacity-60' : 'hover:-translate-y-1'
                  }`}
              >
                {isLeaving ? t('Leaving...', 'A sair...') : t('Leave Game', 'Sair do jogo')}
              </button>
            </div>
          </div>
        </StageBackground>
      </>
    );
  }

  // Waiting screen (default)
  if (lobby.status === 'waiting') {
    if (isMobileLayout) {
      return (
        <>
          {topControls}
          <StageBackground disableMotion={disableHeavyEffects} maxWidth="max-w-md" overlay={settingsModal}>
            <div className="flyer-box bg-card p-4 space-y-4 mt-12">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-[0.4em] text-blue-mid">
                  {t('Lobby Code', 'Código do lobby')}
                </p>
                <LobbyCodeBadge code={lobby.code} onCopy={copyLobbyCode} />
              </div>
              <p className="font-display text-sm text-blue-deep/80">
                {t('Waiting for players…', 'À espera de jogadores…')}
              </p>
              <div className="flyer-panel bg-blue-light/15 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-blue-mid">
                  {t('Players', 'Jogadores')}
                </p>
                <div className="mt-2 space-y-2 max-h-48 overflow-y-auto pr-1">
                  {lobby.players.map((player) => (
                    <div
                      key={`waiting-mobile-${player.id}`}
                      className="flex items-center justify-between rounded-md border border-blue-deep/40 bg-card px-3 py-2 text-sm"
                    >
                      <span>{player.name}</span>
                      {player.isHost && (
                        <span className="text-[10px] font-ad uppercase tracking-[0.3em] text-blue-mid">
                          {t('Host', 'Host')}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              {currentPlayer?.isHost && (
                <div className="flyer-panel bg-blue-light/10 px-4 py-3 space-y-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-blue-mid">
                      {t('Rounds', 'Rondas')}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {roundOptions.map((option) => (
                        <button
                          key={`m-rou-${option}`}
                          onClick={() => handleLobbySettingsChange({ roundsTotal: option })}
                          className={`label-chip px-3 py-2 ${lobby.roundsTotal === option ? 'bg-blue-light text-blue-deep' : 'bg-card text-blue-deep/80'
                            }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-blue-mid">
                      {t('Store', 'Loja')}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {productSourceOptions.map((option) => (
                        <button
                          key={`m-src-${option.value}`}
                          onClick={() => handleLobbySettingsChange({ productSource: option.value })}
                          className={`label-chip px-3 py-2 ${lobby.productSource === option.value ? 'bg-blue-light text-blue-deep' : 'bg-card text-blue-deep/80'
                            }`}
                        >
                          {language === 'pt' ? option.label.pt : option.label.en}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {currentPlayer?.isHost ? (
                <button
                  onClick={handleStartGame}
                  disabled={lobby.players.length < 1 || isStarting}
                  className={`coupon-button w-full bg-blue-mid px-5 py-3 text-card ${lobby.players.length < 1 || isStarting ? 'cursor-not-allowed opacity-60' : 'hover:-translate-y-1'
                    }`}
                >
                  {isStarting ? t('Starting...', 'A iniciar...') : t('Start Game', 'Começar jogo')}
                </button>
              ) : (
                <div className="text-center text-sm text-blue-deep/80">
                  {t('Waiting for host to start the game.', 'À espera que o anfitrião comece o jogo.')}
                </div>
              )}
              <button
                onClick={handleLeaveLobby}
                disabled={isLeaving}
                className={`coupon-button w-full bg-card px-5 py-3 text-sm ${isLeaving ? 'cursor-not-allowed opacity-60' : 'hover:-translate-y-1'
                  }`}
              >
                {isLeaving ? t('Leaving...', 'A sair...') : t('Leave Lobby', 'Sair do lobby')}
              </button>
            </div>
          </StageBackground>
        </>
      );
    }
    return (
      <>
        <StageBackground disableMotion={disableHeavyEffects} maxWidth="max-w-5xl" overlay={settingsModal}>

          <div className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
            <div className="flyer-box bg-card p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.4em] text-blue-mid">{t('Lobby Code', 'Código do lobby')}</p>
                  <div className="mt-1 inline-flex items-center gap-3 rounded-md border-2 border-blue-deep bg-blue-light/40 px-4 py-2 font-mono text-3xl font-black tracking-[0.3em] shadow-flyer-sm">
                    {lobby.code}
                    <button
                      onClick={copyLobbyCode}
                      className="text-sm font-semibold text-blue-deep"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              <p className="mt-4 font-display text-sm text-blue-deep/80">
                {t('Invite your friends, set the vibe, and get ready to spin.', 'Convida os amigos, prepara o ambiente e fica pronto para rodar.')}
              </p>

              <div className="mt-6 space-y-4">
                <div className="flyer-panel bg-blue-light/15 px-4 py-3">
                  <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.3em] text-blue-mid">
                    <span>{t('Game settings', 'Definições do jogo')}</span>
                    <span>
                      {currentPlayer?.isHost
                        ? t('Host controls', 'Controlado pelo anfitrião')
                        : t('Host is selecting', 'O anfitrião está a escolher')}
                    </span>
                  </div>
                  <p className="mt-2 font-display text-[14px] text-blue-deep/80">
                    {t('Rounds', 'Rondas')}: <span className="font-ad text-sm uppercase text-blue-deep">{lobby.roundsTotal}</span> •{' '}
                    {t('Store', 'Loja')}: <span className="font-ad text-sm uppercase text-blue-deep">{getProductSourceLabel(lobby.productSource)}</span>
                  </p>
                  {currentPlayer?.isHost && (
                    <div className="mt-4 space-y-4">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-blue-mid">
                          {t('Pick the number of rounds', 'Escolhe o número de rondas')}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {roundOptions.map((option) => (
                            <button
                              key={option}
                              type="button"
                              onClick={() => handleLobbySettingsChange({ roundsTotal: option })}
                              className={`label-chip ${lobby.roundsTotal === option
                                ? 'bg-blue-light text-blue-deep'
                                : 'bg-card text-blue-deep/80'
                                }`}
                            >
                              {language === 'pt' ? `${option} rondas` : `${option} rounds`}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-blue-mid">
                          {t('Product source', 'Fonte de produtos')}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {productSourceOptions.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => handleLobbySettingsChange({ productSource: option.value })}
                              className={`label-chip ${lobby.productSource === option.value
                                ? 'bg-blue-light text-blue-deep'
                                : 'bg-card text-blue-deep/80'
                                }`}
                            >
                              {language === 'pt' ? option.label.pt : option.label.en}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {error && (
                  <div className="flyer-panel border-red-500 bg-red-100 px-4 py-3 text-sm font-semibold text-red-700">
                    {error}
                  </div>
                )}

                {currentPlayer?.isHost ? (
                  <button
                    onClick={handleStartGame}
                    disabled={lobby.players.length < 1 || isStarting}
                    className={`coupon-button w-full bg-blue-mid px-6 py-4 text-lg text-card ${lobby.players.length < 1 || isStarting ? 'cursor-not-allowed opacity-60' : 'hover:-translate-y-1'
                      }`}
                  >
                    {isStarting ? 'Calling the wheel...' : 'Start The Show'}
                  </button>
                ) : (
                  <div className="flyer-panel bg-blue-light/20 px-4 py-3 text-center font-display text-sm text-blue-deep/80">
                    {t('Waiting for the host to spin the wheel...', 'À espera que o anfitrião rode a roda...')}
                  </div>
                )}

                <button
                  onClick={handleLeaveLobby}
                  disabled={isLeaving}
                  className={`coupon-button w-full bg-card px-6 py-3 text-sm ${isLeaving ? 'cursor-not-allowed opacity-60' : 'hover:-translate-y-1'
                    }`}
                >
                  {isLeaving ? t('Leaving...', 'A sair...') : t('Leave Lobby', 'Sair do lobby')}
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flyer-box bg-card p-5">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.4em] text-blue-mid">
                    {t('Contestants', 'Concorrentes')} ({lobby.players.length})
                  </p>
                  <Users className="h-5 w-5 text-blue-deep" />
                </div>
                <div className="mt-3 space-y-2">
                  {lobby.players.map((player) => (
                    <div
                      key={player.id}
                      className={`flex items-center justify-between rounded-md border-2 px-4 py-2 text-sm font-semibold shadow-flyer-xs ${player.isHost
                        ? 'border-blue-deep bg-blue-light/40 text-blue-deep'
                        : 'border-blue-deep/60 bg-card text-blue-deep'
                        }`}
                    >
                      <div className="flex items-center gap-2">
                        <span>{player.name}</span>
                        {renderKickButton(player)}
                      </div>
                      {player.isHost && <span className="text-[10px] font-ad uppercase tracking-[0.35em]">Host</span>}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flyer-box bg-blue-light/20 p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.4em] text-blue-mid">
                  {t('Showtime Pro Tips', 'Dicas do espetáculo')}
                </p>
                <ul className="mt-3 space-y-2 text-sm font-sans text-blue-deep/80">
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
      </>
    );
  }

  return null;
}
