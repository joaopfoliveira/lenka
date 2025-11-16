import { io, Socket } from 'socket.io-client';
import { Lobby } from './gameManager';
import { Product } from './productTypes';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    // Use window.location.origin in production, localhost in dev
    const socketUrl = typeof window !== 'undefined' && window.location.origin.includes('localhost')
      ? 'http://localhost:3000'
      : typeof window !== 'undefined' 
        ? window.location.origin 
        : 'http://localhost:3000';
    
    console.log('🔌 Connecting to Socket.IO at:', socketUrl);
    
    socket = io(socketUrl, {
      autoConnect: true,
      transports: ['websocket', 'polling'], // Try websocket first, fallback to polling
    });
    
    // Debug logging
    socket.on('connect', () => {
      console.log('Socket.IO connected with ID:', socket?.id);
    });
    
    socket.on('connect_error', (error) => {
      console.error('Socket.IO connection error:', error);
    });
    
    socket.on('disconnect', (reason) => {
      console.log('Socket.IO disconnected:', reason);
    });
  }
  return socket;
}

export function connectSocket() {
  const socket = getSocket();
  if (!socket.connected) {
    socket.connect();
  }
  return new Promise<void>((resolve) => {
    if (socket.connected) {
      resolve();
    } else {
      socket.once('connect', () => resolve());
    }
  });
}

export function disconnectSocket() {
  if (socket && socket.connected) {
    console.log('🔌 Disconnecting socket');
    socket.disconnect();
    socket = null; // Clear the socket so a new one can be created
  }
}

// Remove all game-related listeners (called when leaving lobby or resetting)
export function removeAllGameListeners() {
  const socket = getSocket();
  console.log('🧹 Removing all game-related listeners');
  
  // Remove all listeners for game events
  socket.removeAllListeners('game:loading');
  socket.removeAllListeners('game:started');
  socket.removeAllListeners('round:update');
  socket.removeAllListeners('round:results');
  socket.removeAllListeners('game:ended');
  socket.removeAllListeners('ready:timeout');
}

// Event emitters
export function createLobby(
  roundsTotal: number,
  playerName: string,
  productSource: 'kuantokusta' | 'temu' | 'mixed' = 'mixed',
  clientId: string
) {
  const socket = getSocket();
  socket.emit('lobby:create', { roundsTotal, playerName, productSource, clientId });
}

export function joinLobby(code: string, playerName: string, clientId: string) {
  const socket = getSocket();
  socket.emit('lobby:join', { code, playerName, clientId });
}

export function leaveLobby(code: string) {
  const socket = getSocket();
  socket.emit('lobby:leave', { code });
}

export function startGame(code: string) {
  const socket = getSocket();
  console.log('🎮 Emitting game:start for lobby:', code, 'socket connected:', socket.connected);
  socket.emit('game:start', { code });
}

export function startGameWithProducts(code: string, products: any[]) {
  const socket = getSocket();
  console.log('🎮 [CLIENT] Emitting game:start-with-products for lobby:', code, 'products:', products.length);
  socket.emit('game:start-with-products', { code, products });
}

export function submitGuess(code: string, value: number) {
  const socket = getSocket();
  socket.emit('guess:submit', { code, value });
}

export function markPlayerReady(code: string) {
  const socket = getSocket();
  socket.emit('player:ready', { code });
}

export function resetGame(code: string) {
  const socket = getSocket();
  socket.emit('game:reset', { code });
}

// Event listeners
export function onLobbyState(callback: (lobby: Lobby) => void) {
  const socket = getSocket();
  console.log('🎧 Attaching lobby:state listener to socket:', socket.id);
  socket.on('lobby:state', (data) => {
    console.log('📥 Received lobby:state event:', data);
    callback(data);
  });
  return () => {
    console.log('🔌 Detaching lobby:state listener');
    socket.off('lobby:state', callback);
  };
}

export function onPlayerJoined(callback: (data: { player: any }) => void) {
  const socket = getSocket();
  socket.on('player:joined', callback);
  return () => socket.off('player:joined', callback);
}

export function onPlayerLeft(callback: (data: { playerId: string }) => void) {
  const socket = getSocket();
  socket.on('player:left', callback);
  return () => socket.off('player:left', callback);
}

export function onGameLoading(callback: (data: { message: string; totalRounds: number }) => void) {
  const socket = getSocket();
  socket.on('game:loading', callback);
  return () => socket.off('game:loading', callback);
}

export function onGameStarted(callback: (data: { product: Product; roundIndex: number; totalRounds: number }) => void) {
  const socket = getSocket();
  socket.on('game:started', callback);
  return () => socket.off('game:started', callback);
}

export function onRoundUpdate(callback: (data: { timeLeft: number }) => void) {
  const socket = getSocket();
  socket.on('round:update', callback);
  return () => socket.off('round:update', callback);
}

export function onRoundResults(callback: (data: {
  realPrice: number;
  results: Array<{
    playerId: string;
    playerName: string;
    guess: number | null;
    difference: number;
    pointsEarned: number;
  }>;
  leaderboard: Array<{ playerId: string; playerName: string; totalScore: number }>;
}) => void) {
  const socket = getSocket();
  socket.on('round:results', callback);
  return () => socket.off('round:results', callback);
}

export function onGameEnded(callback: (data: {
  finalLeaderboard: Array<{ playerId: string; playerName: string; totalScore: number }>;
}) => void) {
  const socket = getSocket();
  socket.on('game:ended', callback);
  return () => socket.off('game:ended', callback);
}

export function onReadyTimeout(callback: (data: { timeLeft: number }) => void) {
  const socket = getSocket();
  socket.on('ready:timeout', callback);
  return () => socket.off('ready:timeout', callback);
}

export function onError(callback: (data: { message: string }) => void) {
  const socket = getSocket();
  socket.on('error', callback);
  return () => socket.off('error', callback);
}
