'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
  
  const mountedRef = useRef(false);
  const activeTimeouts = useRef<NodeJS.Timeout[]>([]); // Track all active timeouts
  const cleanupFunctionsRef = useRef<(() => void)[]>([]); // Track cleanup functions

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
    console.log('🚀 Lobby page effect running for code:', code);
    mountedRef.current = true;

    const playerName = localStorage.getItem('playerName');
    if (!playerName) {
      router.push('/');
      return;
    }
    
    console.log('🔌 Setting up fresh event listeners...');

    // Store cleanup functions
    const cleanupFunctions: (() => void)[] = [];

    // Set up event listeners FIRST before connecting
    const unsubLobbyState = onLobbyState((lobbyData) => {
      console.log('Received lobby state:', lobbyData);
      
      // CRITICAL: If status changed to 'waiting', clear ALL game-related state
      if (lobbyData.status === 'waiting' && lobby && lobby.status !== 'waiting') {
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
      }
      
      setLobby(lobbyData);
      const socket = getSocket();
      const player = lobbyData.players.find((p: Player) => p.id === socket.id);
      if (player) {
        setCurrentPlayer(player);
      }
      
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
      setIsLoadingProducts(true);
      setLoadingMessage(message);
      setTotalRounds(total);
      setIsStarting(false); // Clear starting flag
    });

    const unsubGameStarted = onGameStarted(({ product, roundIndex: rIndex, totalRounds: total }) => {
      console.log('🎮 Game started! Product:', product.name);
      setIsLoadingProducts(false); // Clear loading state
      setLoadingMessage('');
      setIsStarting(false); // Reset the starting flag
      setCurrentProduct(product);
      setRoundIndex(rIndex);
      setTotalRounds(total);
      setTimeLeft(15);
      setGuess('');
      setHasSubmitted(false);
      setShowResults(false);
      setRoundResults(null);
      setFinalLeaderboard(null);
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
    const initializeSocket = async () => {
      try {
        await connectSocket();
        console.log('Socket connected successfully');

        // Check if this is a create or join
        const shouldCreate = localStorage.getItem('createLobby') === 'true';
        
        if (shouldCreate && code === '__create__') {
          const roundsTotal = parseInt(localStorage.getItem('roundsTotal') || '5');
          console.log('Creating lobby with', roundsTotal, 'rounds');
          createLobby(roundsTotal, playerName);
          localStorage.removeItem('createLobby');
          localStorage.removeItem('roundsTotal');
        } else {
          console.log('Joining lobby', code);
          joinLobby(code, playerName);
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
    setIsLoadingProducts(true);
    setLoadingMessage('A buscar produtos da API do KuantoKusta...');

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
      
      // If it's the last round, skip to final results immediately
      const isLastRound = roundIndex + 1 === totalRounds;
      if (isLastRound) {
        console.log('🏁 Last round - showing final results immediately');
        // Show final leaderboard
        if (lobby.players) {
          const leaderboard = lobby.players
            .map(p => ({ playerId: p.id, playerName: p.name, totalScore: p.score }))
            .sort((a, b) => b.totalScore - a.totalScore);
          setFinalLeaderboard(leaderboard);
          setShowResults(false);
          setRoundResults(null);
          setCurrentProduct(null); // Clear current product
          
          // Update lobby status to 'finished' so UI shows final screen
          setLobby((prev) => {
            if (!prev) return prev;
            return { ...prev, status: 'finished' };
          });
        }
      } else {
        // Normal ready for next round
        markPlayerReady(lobby.code);
      }
    }
  };

  const handleLeaveLobby = () => {
    if (isLeaving || !lobby) {
      console.log('⚠️ Leave already in progress or no lobby');
      return;
    }
    
    console.log('👋 Leaving lobby');
    setIsLeaving(true);
    
    try {
      leaveLobby(lobby.code);
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
    }
  };

  if (!lobby) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
          {error ? (
            <div>
              <p className="text-xl text-red-600 mb-4">{error}</p>
              <button
                onClick={() => router.push('/')}
                className="bg-lenka-red hover:bg-lenka-red/90 text-white font-semibold py-2 px-6 rounded-lg transition duration-200"
              >
                Go Home
              </button>
            </div>
          ) : (
            <div>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
              <p className="text-xl text-gray-600">Connecting to lobby...</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Loading products screen
  if (isLoadingProducts) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-2xl text-center">
          <div className="mb-6">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-500 border-t-transparent mx-auto mb-4"></div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Preparing Game...</h1>
            <p className="text-lg text-gray-600 mb-4">{loadingMessage}</p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-gray-700">
              <p className="mb-2">🔍 Searching KuantoKusta.pt for {totalRounds} random products</p>
              <p className="text-xs text-gray-500">This ensures fresh, real-time prices!</p>
            </div>
          </div>
          <div className="flex justify-center gap-2">
            <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      </div>
    );
  }

  // Playing - Show results (check FIRST before waiting/finished screens)
  if (showResults && roundResults) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 p-2 sm:p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-4 sm:p-8 w-full max-w-4xl relative">
          <button
            onClick={handleLeaveLobby}
            disabled={isLeaving}
            className={`absolute bottom-2 right-2 sm:bottom-4 sm:right-4 text-white text-xs sm:text-sm font-semibold px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg transition duration-200 shadow-md z-10 ${
              isLeaving ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-500 hover:bg-red-600'
            }`}
          >
            {isLeaving ? '...' : 'Leave'}
          </button>
          
          <div className="text-center mb-4 sm:mb-6">
            <h1 className="text-xl sm:text-3xl font-bold text-green-600 mb-2 sm:mb-3">Round {roundIndex + 1} Results</h1>
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-500 rounded-xl p-3 sm:p-4 inline-block">
              <p className="text-xs sm:text-sm text-gray-600 mb-1">Real Price</p>
              <p className="text-3xl sm:text-5xl font-bold text-green-600 mb-2">
                €{roundResults.realPrice.toFixed(2)}
              </p>
              {roundResults.productUrl && (
                <a
                  href={roundResults.productUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 bg-white hover:bg-gray-50 border-2 border-green-500 text-green-700 font-semibold rounded-lg text-xs sm:text-sm transition-colors"
                >
                  <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Ver em {roundResults.productStore}
                </a>
              )}
            </div>
          </div>

          <div className="mb-4 sm:mb-6 overflow-x-auto">
            <table className="w-full text-sm sm:text-base">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-left font-semibold text-gray-700 text-xs sm:text-base">Player</th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-right font-semibold text-gray-700 text-xs sm:text-base">Guess</th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-right font-semibold text-gray-700 text-xs sm:text-base">Diff</th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-right font-semibold text-gray-700 text-xs sm:text-base">Points</th>
                </tr>
              </thead>
              <tbody>
                {roundResults.results.map((result: any) => (
                  <tr key={result.playerId} className="border-b">
                    <td className="px-2 sm:px-4 py-2 sm:py-3 font-medium text-gray-800 text-xs sm:text-base">{result.playerName}</td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-right text-gray-700 text-xs sm:text-base">
                      {result.guess !== null ? `€${result.guess.toFixed(2)}` : 'No guess'}
                    </td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-right text-gray-700 text-xs sm:text-base">
                      {result.guess !== null ? `€${result.difference.toFixed(2)}` : '-'}
                    </td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-right font-bold text-green-600 text-xs sm:text-base">
                      {result.pointsEarned !== undefined && result.pointsEarned !== null 
                        ? `+${Math.round(result.pointsEarned)}` 
                        : '+0'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-lenka-cream rounded-lg p-3 sm:p-4 border-2 border-lenka-mustard/20">
            <h3 className="font-semibold text-gray-700 mb-2 text-sm sm:text-base">Current Standings</h3>
            <div className="space-y-1">
              {roundResults.leaderboard.map((player: any, index: number) => (
                <div key={player.playerId} className="flex justify-between text-sm sm:text-base">
                  <span className="text-gray-800">
                    {index + 1}. {player.playerName}
                  </span>
                  <span className="font-bold text-lenka-red">{player.totalScore} pts</span>
                </div>
              ))}
            </div>
          </div>

          {/* Ready System */}
          <div className="mt-4 sm:mt-6 space-y-3">
            {/* Ready Button */}
            <div className="flex justify-center">
              {!isReady ? (
                <button
                  onClick={handleMarkReady}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg transition duration-200 text-base sm:text-lg shadow-lg"
                >
                  {roundIndex + 1 === totalRounds ? '🏁 Check Final Results' : '✓ Ready for Next Round'}
                </button>
              ) : (
                <div className="bg-green-100 border-2 border-green-500 text-green-700 font-bold py-3 px-8 rounded-lg text-center text-base sm:text-lg">
                  {roundIndex + 1 === totalRounds ? '🏁 Going to Results...' : '✓ You are ready!'}
                </div>
              )}
            </div>

            {/* Ready Status */}
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm sm:text-base text-gray-700 font-medium">
                  Ready Players: {lobby?.readyPlayers ? Object.keys(lobby.readyPlayers).length : 0} / {lobby?.players.length || 0}
                </span>
                <span className="text-xs sm:text-sm text-gray-600">
                  Auto-start: {Math.floor(readyTimeout / 60)}:{String(readyTimeout % 60).padStart(2, '0')}
                </span>
              </div>
              
              {/* Player Pills */}
              <div className="flex flex-wrap gap-1.5">
                {lobby?.players.map((player) => (
                  <div
                    key={player.id}
                    className={`px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-xs sm:text-sm transition-colors ${
                      lobby.readyPlayers?.[player.id]
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    {player.name} {lobby.readyPlayers?.[player.id] && '✓'}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Game finished screen (CHECK BEFORE currentProduct to prevent showing guess screen)
  if (lobby.status === 'finished' && finalLeaderboard) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 p-2 sm:p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-4 sm:p-8 w-full max-w-2xl">
          <div className="text-center mb-4 sm:mb-6">
            <h1 className="text-2xl sm:text-4xl font-bold text-lenka-red mb-1 sm:mb-2">Game Over!</h1>
            <p className="text-gray-600 text-sm sm:text-base">Final Results</p>
          </div>

          <div className="mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-semibold mb-3 sm:mb-4 text-gray-700">Leaderboard</h2>
            <div className="space-y-1.5 sm:space-y-2">
              {finalLeaderboard.map((player: any, index: number) => (
                <div
                  key={player.playerId}
                  className={`flex items-center justify-between p-3 sm:p-4 rounded-lg ${
                    index === 0
                      ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-white'
                      : index === 1
                      ? 'bg-gradient-to-r from-gray-300 to-gray-400 text-gray-800'
                      : index === 2
                      ? 'bg-gradient-to-r from-orange-300 to-orange-400 text-gray-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  <div className="flex items-center gap-2 sm:gap-3">
                    <span className="text-lg sm:text-2xl font-bold">#{index + 1}</span>
                    <span className="font-semibold text-sm sm:text-base">{player.playerName}</span>
                  </div>
                  <span className="text-base sm:text-xl font-bold">{player.totalScore} pts</span>
                </div>
              ))}
            </div>
          </div>

          {currentPlayer?.isHost && (
            <button
              onClick={handlePlayAgain}
              disabled={isResetting || isLeaving}
              className={`w-full font-semibold py-2.5 sm:py-3 px-6 rounded-lg transition duration-200 mb-2 text-sm sm:text-base ${
                isResetting || isLeaving
                  ? 'bg-gray-400 cursor-not-allowed text-gray-600'
                  : 'bg-lenka-red hover:bg-red-700 text-white'
              }`}
            >
              {isResetting ? 'Resetting...' : 'Play Again'}
            </button>
          )}

          <button
            onClick={handleLeaveLobby}
            disabled={isLeaving || isResetting}
            className={`w-full font-semibold py-2.5 sm:py-3 px-6 rounded-lg transition duration-200 text-sm sm:text-base ${
              isLeaving || isResetting
                ? 'bg-gray-400 cursor-not-allowed text-gray-600'
                : 'bg-gray-300 hover:bg-gray-400 text-gray-700'
            }`}
          >
            {isLeaving ? 'Leaving...' : 'Leave Lobby'}
          </button>
        </div>
      </div>
    );
  }

  // Playing - Guessing phase
  if (currentProduct) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 p-2 sm:p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-4 sm:p-8 w-full max-w-2xl relative">
          <button
            onClick={handleLeaveLobby}
            disabled={isLeaving}
            className={`absolute bottom-2 right-2 sm:bottom-4 sm:right-4 text-white text-xs sm:text-sm font-semibold px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg transition duration-200 shadow-md z-10 ${
              isLeaving ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-500 hover:bg-red-600'
            }`}
          >
            {isLeaving ? '...' : 'Leave'}
          </button>
          
          <div className="text-center mb-3 sm:mb-6">
            <div className="flex items-center justify-center gap-2 sm:gap-4 mb-1 sm:mb-2">
              <h1 className="text-xl sm:text-3xl font-bold text-lenka-red">
                Round {roundIndex + 1} / {totalRounds}
              </h1>
              <div className={`text-xl sm:text-3xl font-bold ${timeLeft <= 5 ? 'text-red-600' : 'text-gray-700'}`}>
                {timeLeft}s
              </div>
            </div>
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-1.5 sm:px-4 sm:py-2 rounded text-xs sm:text-sm">
                {error}
              </div>
            )}
          </div>

          {/* Product Section - Compact and well-separated */}
          <div className="mb-6 sm:mb-8">
            {/* Product Image Container - Strict dimensions */}
            <div className="w-full flex justify-center mb-5 sm:mb-7">
              <div className="bg-gray-100 rounded-lg p-3 sm:p-4 shadow-sm overflow-hidden">
                <div className="w-[140px] h-[140px] sm:w-[180px] sm:h-[180px] flex items-center justify-center">
                  <ProductImage
                    src={currentProduct.imageUrl}
                    alt={currentProduct.name}
                    width={140}
                    height={140}
                    className="max-w-[140px] max-h-[140px] sm:max-w-[180px] sm:max-h-[180px]"
                  />
                </div>
              </div>
            </div>
            
            {/* Product Info - Below image with clear gap */}
            <div className="w-full text-center px-4 sm:px-6">
              <h2 className="text-xs sm:text-lg md:text-xl font-bold text-gray-800 mb-1 sm:mb-2 break-words leading-tight max-w-full overflow-hidden">
                {currentProduct.name}
              </h2>
              {currentProduct.brand && (
                <p className="text-lenka-mustard font-bold mb-1 text-xs sm:text-sm md:text-base">
                  {currentProduct.brand}
                </p>
              )}
              <p className="text-gray-600 text-xs sm:text-sm">
                Store: <span className="font-semibold">{currentProduct.store}</span>
              </p>
            </div>
          </div>

          <div className="mb-4 sm:mb-6">
            <label className="block text-gray-700 font-medium mb-1.5 sm:mb-2 text-sm sm:text-base">Your Guess (€)</label>
            <div className="flex gap-2">
              <input
                type="number"
                value={guess}
                onChange={(e) => setGuess(e.target.value)}
                placeholder="0.00"
                step="0.01"
                min="0"
                disabled={hasSubmitted}
                className="flex-1 px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 text-base sm:text-lg"
              />
              <button
                onClick={handleSubmitGuess}
                disabled={hasSubmitted || !guess}
                className="bg-lenka-red hover:bg-lenka-red/90 disabled:bg-gray-400 text-white font-semibold px-4 py-2 sm:px-6 sm:py-3 rounded-lg transition duration-200 border-2 border-lenka-red disabled:border-gray-400 text-sm sm:text-base"
              >
                {hasSubmitted ? 'Sent' : 'Submit'}
              </button>
            </div>
          </div>

          {hasSubmitted && (
            <div className="bg-green-100 border-2 border-green-400 text-green-700 px-3 py-2 sm:px-4 sm:py-3 rounded text-center text-xs sm:text-base">
              Guess submitted! Waiting for other players...
            </div>
          )}

          <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t">
            <h3 className="font-semibold text-gray-700 mb-1.5 sm:mb-2 text-sm sm:text-base">Players</h3>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {lobby.players.map((player) => (
                <div
                  key={player.id}
                  className={`px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-xs sm:text-sm ${
                    lobby.guesses[player.id] !== undefined
                      ? 'bg-lenka-red text-white'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {player.name}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Waiting screen (default)
  if (lobby.status === 'waiting') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 p-2 sm:p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-4 sm:p-8 w-full max-w-2xl">
          <div className="text-center mb-4 sm:mb-6">
            <h1 className="text-2xl sm:text-4xl font-bold text-lenka-red mb-1 sm:mb-2">Lenka</h1>
            <div className="flex items-center justify-center gap-2 mb-2 sm:mb-4">
              <p className="text-xl sm:text-2xl font-mono font-bold text-gray-800">{lobby.code}</p>
              <button
                onClick={copyLobbyCode}
                className="text-lenka-red hover:text-lenka-red/80 text-xs sm:text-sm underline"
              >
                Copy
              </button>
            </div>
            <p className="text-gray-600 text-sm sm:text-base">Rounds: {lobby.roundsTotal}</p>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 sm:px-4 sm:py-3 rounded mb-4 text-sm">
              {error}
            </div>
          )}

          <div className="mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-3 text-gray-700">Players ({lobby.players.length})</h2>
            <div className="space-y-1.5 sm:space-y-2">
              {lobby.players.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between bg-gray-50 rounded-lg p-2.5 sm:p-3"
                >
                  <span className="font-medium text-gray-800 text-sm sm:text-base">{player.name}</span>
                  {player.isHost && (
                    <span className="bg-lenka-mustard text-lenka-dark text-xs px-2 py-1 rounded font-bold">HOST</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {currentPlayer?.isHost ? (
            <button
              onClick={handleStartGame}
              disabled={lobby.players.length < 1 || isStarting}
              className="w-full bg-lenka-red hover:bg-lenka-red/90 disabled:bg-gray-400 text-white font-semibold py-2.5 sm:py-3 px-6 rounded-lg transition duration-200 mb-2 border-2 border-lenka-red disabled:border-gray-400 text-sm sm:text-base"
            >
              {isStarting ? 'Starting...' : 'Start Game'}
            </button>
          ) : (
            <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-3 py-2.5 sm:px-4 sm:py-3 rounded text-center text-sm sm:text-base">
              Waiting for host to start...
            </div>
          )}

          <button
            onClick={handleLeaveLobby}
            disabled={isLeaving}
            className={`w-full font-semibold py-2.5 sm:py-3 px-6 rounded-lg transition duration-200 mt-2 text-sm sm:text-base ${
              isLeaving
                ? 'bg-gray-400 cursor-not-allowed text-gray-600'
                : 'bg-gray-300 hover:bg-gray-400 text-gray-700'
            }`}
          >
            {isLeaving ? 'Leaving...' : 'Leave Lobby'}
          </button>
        </div>
      </div>
    );
  }

  return null;
}

