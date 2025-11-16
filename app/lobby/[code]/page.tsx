'use client';

import { useEffect, useState, useRef, useTransition, type ReactNode } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
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
} from '@/lib/socketClient';
import { Lobby, Player } from '@/lib/gameManager';
import { Product } from '@/data/products';
import ProductImage from '@/app/components/ProductImage';
import { useSfx } from '@/app/components/sfx/SfxProvider';
import { ensurePlayerClientId } from '@/app/utils/playerIdentity';

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

const showtimeQuips = [
  (total?: number) =>
    `Polishing ${total ?? 'a few'} secret showcase${total && total > 1 ? 's' : ''}...`,
  () => 'Cue the confetti! Producers are lining up the next prize.',
  () => 'Backstage crew is whispering prices to the big wheel...',
  () => 'Cranking the neon lights and unlocking the prize vault...',
];

function getShowtimeMessage(total?: number) {
  const pick = showtimeQuips[Math.floor(Math.random() * showtimeQuips.length)];
  return pick(total);
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

function WheelOverlay({
  visible,
  prize,
  spinId,
  targetAngle,
  message,
  onComplete,
  reduceMotion = false,
}: {
  visible: boolean;
  prize: string;
  spinId: number;
  targetAngle: number;
  message: string;
  onComplete: () => void;
  reduceMotion?: boolean;
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
                  {message || 'Preparing next product...'}
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
                      Wheel Prize
                    </p>
                    <p className="text-3xl font-black text-lenka-midnight">{prize}</p>
                  </div>
                </motion.div>
              </div>
            )}
            <div className="text-center">
              <p className="text-xs uppercase tracking-[0.4em] text-white/60">
                Wheel of Lenka
              </p>
              <p className="text-lg font-semibold text-white">{message}</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
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
  const [readyTimeout, setReadyTimeout] = useState(120);
  const [isReady, setIsReady] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isWheelVisible, setIsWheelVisible] = useState(false);
  const [wheelSpinId, setWheelSpinId] = useState(0);
  const [wheelTargetAngle, setWheelTargetAngle] = useState(0);
  const [wheelPrize, setWheelPrize] = useState('50€');
  const [wheelMessage, setWheelMessage] = useState('Spinning the big wheel...');
  const [pendingLoadingState, setPendingLoadingState] = useState<{
    message: string;
    total: number;
  } | null>(null);
  const [pendingRoundPayload, setPendingRoundPayload] = useState<{
    product: Product;
    roundIndex: number;
    totalRounds: number;
  } | null>(null);
  const prefersReducedMotion = useReducedMotion();
  const [isMobileViewport, setIsMobileViewport] = useState(false);
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
  const { playTick, playDing, playBuzzer, playFanfare, playApplause } = useSfx();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(max-width: 768px)');
    const updateViewport = () => setIsMobileViewport(mediaQuery.matches);
    updateViewport();
    mediaQuery.addEventListener('change', updateViewport);
    return () => mediaQuery.removeEventListener('change', updateViewport);
  }, []);

  const disableHeavyEffects = prefersReducedMotion || isMobileViewport;

  useEffect(() => {
    wheelVisibleRef.current = isWheelVisible;
  }, [isWheelVisible]);

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
    setShowResults(false);
    setRoundResults(null);
    setFinalLeaderboard(null);
  };

  const startWheelSpin = (message?: string) => {
    const totalSegments = wheelSegments.length;
    const fullSpins = Math.floor(Math.random() * 3) + 3;
    const selectedIndex = Math.floor(Math.random() * totalSegments);
    const anglePerSegment = 360 / totalSegments;
    const randomOffset = Math.random() * (anglePerSegment - 6);
    const target =
      fullSpins * 360 + selectedIndex * anglePerSegment + randomOffset;

    setWheelTargetAngle(target);
    setWheelPrize(wheelSegments[selectedIndex]);
    setWheelMessage(message ?? 'Showtime!');
    setWheelSpinId((prev) => prev + 1);
    setIsWheelVisible(true);
    wheelTimestampRef.current = Date.now();
  };

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
      setLoadingMessage('Lining up the first item...');
    }
  };

  // Helper to add and track timeouts
  const addTimeout = (callback: () => void, delay: number) => {
    const timeout = setTimeout(() => {
      callback();
      // Remove from active list
      activeTimeouts.current = activeTimeouts.current.filter(t => t !== timeout);
    }, delay);
    activeTimeouts.current.push(timeout);
    return timeout;
  };

  // Helper to clear all timeouts
  const clearAllTimeouts = () => {
    console.log(`🧹 Clearing ${activeTimeouts.current.length} active timeouts`);
    activeTimeouts.current.forEach(timeout => clearTimeout(timeout));
    activeTimeouts.current = [];
  };

  useEffect(() => {
    if (code === '__create__' && typeof window !== 'undefined') {
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
        setReadyTimeout(120);
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
      const funMessage = getShowtimeMessage(total);
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
      setRoundResults(results);
      setShowResults(true);
      setReadyTimeout(120); // Reset ready timeout to 120 seconds
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
          const productSource = (localStorage.getItem('productSource') || 'mixed') as 'kuantokusta' | 'temu' | 'mixed';
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
        setError('Failed to connect to server. Please refresh the page.');
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
  }, [code, router]);

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
    startWheelSpin('Spinning the Wheel of Lenka...');
    playDing();

    // Use server-side API fetch (works!)
    console.log('🛒 [SERVER] Starting game with server-side API fetch...');
    startGame(lobby.code);
  };

  const handleSubmitGuess = () => {
    if (!guess || hasSubmitted || !lobby) return;
    
    const value = parseFloat(guess);
    if (isNaN(value) || value < 0) {
      setError('Please enter a valid price');
      return;
    }

    submitGuess(lobby.code, value);
    setHasSubmitted(true);
    playDing();
  };

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
    />
  );

  if (!lobby) {
    return (
      <StageBackground disableMotion={disableHeavyEffects} maxWidth="max-w-3xl">
        {wheelOverlay}
        <div className="rounded-3xl border border-white/15 bg-white/10 p-10 text-center shadow-lenka-card backdrop-blur">
          {error ? (
            <div className="space-y-4">
              <p className="text-2xl font-bold text-red-200">{error}</p>
              <button
                onClick={() => router.push('/')}
                className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-gradient-to-r from-lenka-electric to-lenka-pink px-6 py-3 text-lg font-semibold text-white shadow-lenka-glow"
              >
                Return Home
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-lenka-gold" />
              <p className="text-xl font-semibold text-white">
                Connecting to your lobby...
              </p>
              <p className="text-sm uppercase tracking-[0.4em] text-white/70">
                Negotiating with Lenka HQ
              </p>
            </div>
          )}
        </div>
      </StageBackground>
    );
  }

  // Loading products screen
  if (isLoadingProducts) {
    return (
      <StageBackground disableMotion={disableHeavyEffects} maxWidth="max-w-4xl">
        {wheelOverlay}
        <div className="rounded-3xl border border-white/15 bg-white/5 p-8 text-center shadow-lenka-card backdrop-blur">
          <div className="mb-8 flex flex-col items-center gap-4">
            <RadioTower className="h-16 w-16 text-lenka-gold drop-shadow-[0_0_25px_rgba(255,215,111,0.6)]" />
            <h1 className="text-4xl font-extrabold text-white">Preparing Your Show</h1>
            <p className="text-lg text-white/80">{loadingMessage}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-left">
            <p className="text-sm uppercase tracking-[0.4em] text-white/60">
              KuantoKusta Search
            </p>
            <p className="mt-2 text-2xl font-bold text-lenka-gold">
              {totalRounds} surprise product(s)
            </p>
            <p className="text-sm text-white/80">
              Fresh data, real-time prices, and plenty of drama.
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
      </StageBackground>
    );
  }

  // Playing - Show results (check FIRST before waiting/finished screens)
  if (showResults && roundResults) {
    return (
      <StageBackground disableMotion={disableHeavyEffects} maxWidth="max-w-5xl">
        {wheelOverlay}
        <div className="space-y-6">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lenka-card backdrop-blur">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-white/60">
                  Round {roundIndex + 1} of {totalRounds}
                </p>
                <h1 className="text-3xl font-bold text-lenka-gold">
                  Showdown Results
                </h1>
                <p className="text-sm text-white/70">
                  The closest guess earns the spotlight and the bonus.
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
                {isLeaving ? 'Leaving...' : 'Leave Show'}
              </button>
            </div>

            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-inner">
                <p className="text-xs uppercase tracking-[0.4em] text-white/60">
                  Real Price
                </p>
                <p className="mt-3 text-4xl font-black text-lenka-gold">
                  €{roundResults.realPrice.toFixed(2)}
                </p>
                {roundResults.productStore && (
                  <p className="text-sm text-white/70">
                    From {roundResults.productStore}
                  </p>
                )}
                {roundResults.productUrl && (
                  <a
                    href={roundResults.productUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center gap-2 rounded-full border border-lenka-gold/40 px-4 py-2 text-sm font-semibold text-lenka-gold transition hover:bg-lenka-gold/10"
                  >
                    View product
                    <Sparkles className="h-4 w-4" />
                  </a>
                )}
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <p className="text-xs uppercase tracking-[0.4em] text-white/60">
                  Current Standings
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
                    <th className="px-3 py-2">Player</th>
                    <th className="px-3 py-2 text-right">Guess</th>
                    <th className="px-3 py-2 text-right">Δ %</th>
                    <th className="px-3 py-2 text-right">Base</th>
                    <th className="px-3 py-2 text-right">Bonus</th>
                    <th className="px-3 py-2 text-right">Round</th>
                    <th className="px-3 py-2 text-right">Total</th>
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
              Base score + podium bonus = round points
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-lenka-card backdrop-blur">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-white/60">
                  Ready Check
                </p>
                <p className="text-2xl font-bold text-white">
                  {Object.keys(lobby.readyPlayers || {}).length} / {lobby.players.length} ready
                </p>
                <p className="text-xs uppercase tracking-[0.3em] text-white/50">
                  Auto-start in {Math.floor(readyTimeout / 60)}:{String(readyTimeout % 60).padStart(2, '0')}
                </p>
              </div>
              {!isReady ? (
                <button
                  onClick={handleMarkReady}
                  className="inline-flex items-center gap-2 rounded-full border border-lenka-teal/60 bg-lenka-teal/20 px-6 py-3 text-sm font-semibold text-white shadow-lenka-card transition hover:bg-lenka-teal/30"
                >
                  <Sparkles className="h-4 w-4" />
                  {roundIndex + 1 === totalRounds
                    ? 'Reveal Final Results'
                    : 'Ready for Next Round'}
                </button>
              ) : (
                <div className="rounded-full border border-lenka-teal px-6 py-3 text-sm font-semibold text-lenka-teal">
                  Waiting for others...
                </div>
              )}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {lobby.players.map((player) => (
                <div
                  key={player.id}
                  className={`rounded-full px-4 py-1 text-xs font-semibold ${
                    lobby.readyPlayers?.[player.id]
                      ? 'bg-lenka-teal/30 text-lenka-teal'
                      : 'bg-white/10 text-white/70'
                  }`}
                >
                  {player.name} {lobby.readyPlayers?.[player.id] && '✓'}
                </div>
              ))}
            </div>
          </div>
        </div>
      </StageBackground>
    );
  }

  // Game finished screen (CHECK BEFORE currentProduct to prevent showing guess screen)
  if (lobby.status === 'finished' && finalLeaderboard) {
    return (
      <StageBackground disableMotion={disableHeavyEffects} maxWidth="max-w-4xl">
        {wheelOverlay}
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center shadow-lenka-card backdrop-blur">
          <div className="flex flex-col items-center gap-3">
            <Trophy className="h-16 w-16 text-lenka-gold drop-shadow-[0_0_25px_rgba(255,215,111,0.6)]" />
            <h1 className="text-4xl font-extrabold text-white">Lenka Grand Finale</h1>
            <p className="text-sm uppercase tracking-[0.4em] text-white/60">
              Thanks for playing!
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
                {isResetting ? 'Resetting...' : 'Play Another Show'}
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
              {isLeaving ? 'Leaving...' : 'Exit to Lobby'}
            </button>
          </div>
        </div>
      </StageBackground>
    );
  }

  // Playing - Guessing phase
  if (currentProduct) {
    return (
      <StageBackground disableMotion={disableHeavyEffects} maxWidth="max-w-5xl">
        {wheelOverlay}
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lenka-card backdrop-blur">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-white/60">
                  Round {roundIndex + 1} / {totalRounds}
                </p>
                <h2 className="text-3xl font-bold text-white">Guess that price!</h2>
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
                <p className="text-xs uppercase tracking-[0.4em] text-white/60">Product</p>
                <h3 className="mt-2 text-2xl font-bold text-white">{currentProduct.name}</h3>
                {currentProduct.store && (
                  <p className="text-sm font-semibold text-white/80">
                    Store: {currentProduct.store}
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
                  <label className="text-xs uppercase tracking-[0.4em] text-white/50">Your Guess (€)</label>
                  <input
                    type="number"
                    value={guess}
                    onChange={(e) => setGuess(e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    disabled={hasSubmitted}
                    className="w-full bg-transparent text-4xl font-black text-white placeholder:text-white/20 focus:outline-none"
                  />
                </div>
                <button
                  onClick={handleSubmitGuess}
                  disabled={hasSubmitted || !guess}
                  className={`rounded-2xl px-8 py-4 text-lg font-bold text-white shadow-lenka-card transition ${
                    hasSubmitted || !guess
                      ? 'cursor-not-allowed bg-white/10 text-white/30'
                      : 'bg-gradient-to-r from-lenka-gold to-lenka-pink hover:scale-[1.01]'
                  }`}
                >
                  {hasSubmitted ? 'Submitted' : 'Lock Guess'}
                </button>
              </div>
              {hasSubmitted && (
                <p className="text-center text-sm uppercase tracking-[0.3em] text-lenka-teal">
                  Guess sent! Waiting for the others...
                </p>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-lenka-card backdrop-blur">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.4em] text-white/60">Contestants</p>
                <span className="text-xs text-white/60">Submissions update live</span>
              </div>
              <div className="mt-3 space-y-2">
                {lobby.players.map((player) => (
                  <div
                    key={player.id}
                    className={`flex items-center justify-between rounded-2xl border px-3 py-2 text-sm font-semibold ${
                      lobby.guesses[player.id] !== undefined
                        ? 'border-lenka-teal/70 bg-lenka-teal/20 text-lenka-teal'
                        : 'border-white/15 bg-white/5 text-white/70'
                    }`}
                  >
                    <span>{player.name}</span>
                    {lobby.guesses[player.id] !== undefined && <span>✓</span>}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-lenka-card backdrop-blur">
              <p className="text-xs uppercase tracking-[0.4em] text-white/60">Leaderboard</p>
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
              {isLeaving ? 'Leaving...' : 'Leave Show'}
            </button>
          </div>
        </div>
      </StageBackground>
    );
  }

  // Waiting screen (default)
  if (lobby.status === 'waiting') {
    return (
      <StageBackground disableMotion={disableHeavyEffects} maxWidth="max-w-5xl">
        {wheelOverlay}
        <div className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lenka-card backdrop-blur">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-white/60">Lobby Code</p>
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
                <p className="text-xs uppercase tracking-[0.4em] text-white/60">Rounds</p>
                <p className="text-2xl font-black text-white">{lobby.roundsTotal}</p>
              </div>
            </div>

            <p className="mt-4 text-sm text-white/70">Invite your friends, set the vibe, and get ready to spin.</p>

            {error && (
              <div className="mt-4 rounded-2xl border border-lenka-pink/50 bg-lenka-pink/10 px-4 py-3 text-sm font-semibold text-lenka-pink">
                {error}
              </div>
            )}

            <div className="mt-6 space-y-3">
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
                  Waiting for the host to spin the wheel...
                </div>
              )}

              <button
                onClick={handleLeaveLobby}
                disabled={isLeaving}
                className={`w-full rounded-2xl border px-6 py-3 text-sm font-semibold ${
                  isLeaving ? 'cursor-not-allowed border-white/20 text-white/40' : 'border-white/30 text-white hover:bg-white/10'
                }`}
              >
                {isLeaving ? 'Leaving...' : 'Leave Lobby'}
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-lenka-card backdrop-blur">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.4em] text-white/60">Contestants ({lobby.players.length})</p>
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
                    <span>{player.name}</span>
                    {player.isHost && <span className="text-xs uppercase tracking-[0.4em]">Host</span>}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-lenka-card backdrop-blur">
              <p className="text-xs uppercase tracking-[0.4em] text-white/60">Showtime Pro Tips</p>
              <ul className="mt-3 space-y-2 text-sm text-white/70">
                <li>• Wheel decides when the show starts. Buckle up!</li>
                <li>• Bonus points reward the boldest guesses.</li>
                <li>• Hover buttons for a tick—Lenka hears you.</li>
              </ul>
            </div>
          </div>
        </div>
      </StageBackground>
    );
  }

  return null;
}
