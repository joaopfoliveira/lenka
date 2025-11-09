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
  resetGame,
  onLobbyState,
  onPlayerJoined,
  onPlayerLeft,
  onGameStarted,
  onRoundUpdate,
  onRoundResults,
  onGameEnded,
  onError,
  getSocket,
} from '@/lib/socketClient';
import { Lobby, Player } from '@/lib/gameManager';
import { Product } from '@/data/products';
import Image from 'next/image';

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
  const [nextRoundCountdown, setNextRoundCountdown] = useState(5);
  
  const mountedRef = useRef(false);
  const listenersAttached = useRef(false);

  useEffect(() => {
    console.log('🚀 Lobby page effect running for code:', code);
    mountedRef.current = true;
    
    // Skip if already initialized
    if (listenersAttached.current) {
      console.log('⚠️ Listeners already attached, skipping initialization');
      return;
    }
    listenersAttached.current = true;

    const playerName = localStorage.getItem('playerName');
    if (!playerName) {
      router.push('/');
      return;
    }

    // Set up event listeners FIRST before connecting
    const unsubLobbyState = onLobbyState((lobbyData) => {
      console.log('Received lobby state:', lobbyData);
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

    const unsubGameStarted = onGameStarted(({ product, roundIndex: rIndex, totalRounds: total }) => {
      console.log('🎮 Game started! Product:', product.name);
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
      setRoundResults(results);
      setShowResults(true);
      setNextRoundCountdown(5); // Reset countdown to 5 seconds
    });

    const unsubGameEnded = onGameEnded(({ finalLeaderboard: leaderboard }) => {
      console.log('🏁 Game ended! Final leaderboard:', leaderboard);
      setFinalLeaderboard(leaderboard);
      setCurrentProduct(null);
      setShowResults(false); // Clear round results so game over screen shows
      setRoundResults(null);
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
      setTimeout(() => setError(''), 5000);
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

    return () => {
      console.log('🧹 Cleanup called, mounted:', mountedRef.current);
      mountedRef.current = false;
      
      // Don't detach listeners - they should persist
      // This way they work even after Strict Mode remount
      // unsubLobbyState();
      // unsubPlayerJoined();
      // unsubPlayerLeft();
      // unsubGameStarted();
      // unsubRoundUpdate();
      // unsubRoundResults();
      // unsubGameEnded();
      // unsubError();
    };
  }, [code, router]);

  // Countdown for next round
  useEffect(() => {
    if (!showResults || nextRoundCountdown <= 0) return;

    const timer = setInterval(() => {
      setNextRoundCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [showResults, nextRoundCountdown]);

  const handleStartGame = () => {
    console.log('🎮 Start Game clicked. Lobby:', lobby, 'isStarting:', isStarting);
    
    // Prevent double-clicks
    if (isStarting) {
      console.log('⚠️ Game is already starting, ignoring duplicate click');
      return;
    }
    
    if (lobby) {
      setIsStarting(true);
      console.log('🎮 Starting game with code:', lobby.code);
      startGame(lobby.code);
    } else {
      console.error('❌ No lobby available!');
    }
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
    if (lobby) {
      resetGame(lobby.code);
    }
  };

  const handleLeaveLobby = () => {
    if (lobby) {
      leaveLobby(lobby.code);
    }
    router.push('/');
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

  // Playing - Show results (check FIRST before waiting/finished screens)
  if (showResults && roundResults) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 p-2 sm:p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-4 sm:p-8 w-full max-w-4xl relative">
          <button
            onClick={handleLeaveLobby}
            className="absolute bottom-2 right-2 sm:bottom-4 sm:right-4 bg-red-500 hover:bg-red-600 text-white text-xs sm:text-sm font-semibold px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg transition duration-200 shadow-md z-10"
          >
            Leave
          </button>
          
          <div className="text-center mb-4 sm:mb-6">
            <h1 className="text-xl sm:text-3xl font-bold text-green-600 mb-1 sm:mb-2">Round {roundIndex + 1} Results</h1>
            <p className="text-base sm:text-xl text-gray-700">
              Real Price: <span className="font-bold text-green-600">€{roundResults.realPrice.toFixed(2)}</span>
            </p>
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
                      +{result.pointsEarned}
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

          <div className="text-center mt-4 sm:mt-6">
            {roundIndex + 1 < totalRounds ? (
              <div className="text-gray-600">
                <p className="text-sm sm:text-lg">Next round starting in...</p>
                <p className="text-2xl sm:text-4xl font-bold text-lenka-red mt-1 sm:mt-2">{nextRoundCountdown}s</p>
              </div>
            ) : (
              <div className="text-gray-600">
                <p className="text-sm sm:text-lg">Final results coming in...</p>
                <p className="text-2xl sm:text-4xl font-bold text-lenka-red mt-1 sm:mt-2">{nextRoundCountdown}s</p>
              </div>
            )}
          </div>
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
            className="absolute bottom-2 right-2 sm:bottom-4 sm:right-4 bg-red-500 hover:bg-red-600 text-white text-xs sm:text-sm font-semibold px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg transition duration-200 shadow-md z-10"
          >
            Leave
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

          <div className="mb-4 sm:mb-6 text-center">
            <div className="mb-2 sm:mb-4 bg-gray-100 rounded-lg p-2 sm:p-4 inline-block">
              <Image
                src={currentProduct.imageUrl}
                alt={currentProduct.name}
                width={200}
                height={200}
                className="rounded-lg w-[180px] h-[180px] sm:w-[250px] sm:h-[250px] object-cover"
              />
            </div>
            <h2 className="text-lg sm:text-2xl font-bold text-gray-800 mb-1 sm:mb-2 px-2">{currentProduct.name}</h2>
            {currentProduct.brand && (
              <p className="text-lenka-mustard font-bold mb-0.5 sm:mb-1 text-base sm:text-lg">{currentProduct.brand}</p>
            )}
            <p className="text-gray-600 text-sm sm:text-base">
              Store: <span className="font-semibold">{currentProduct.store}</span>
            </p>
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

  // Game finished screen
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
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2.5 sm:py-3 px-6 rounded-lg transition duration-200 mb-2 text-sm sm:text-base"
            >
              Play Again
            </button>
          )}

          <button
            onClick={handleLeaveLobby}
            className="w-full bg-gray-300 hover:bg-gray-400 text-gray-700 font-semibold py-2.5 sm:py-3 px-6 rounded-lg transition duration-200 text-sm sm:text-base"
          >
            Leave Lobby
          </button>
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
            className="w-full bg-gray-300 hover:bg-gray-400 text-gray-700 font-semibold py-2.5 sm:py-3 px-6 rounded-lg transition duration-200 mt-2 text-sm sm:text-base"
          >
            Leave Lobby
          </button>
        </div>
      </div>
    );
  }

  return null;
}

