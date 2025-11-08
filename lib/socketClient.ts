import { io, Socket } from 'socket.io-client';
import { Lobby } from './gameManager';
import { Product } from '@/data/products';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io('http://localhost:3000', {
      autoConnect: true,
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

// Event emitters
export function createLobby(roundsTotal: number, playerName: string) {
  const socket = getSocket();
  socket.emit('lobby:create', { roundsTotal, playerName });
}

export function joinLobby(code: string, playerName: string) {
  const socket = getSocket();
  socket.emit('lobby:join', { code, playerName });
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

export function submitGuess(code: string, value: number) {
  const socket = getSocket();
  socket.emit('guess:submit', { code, value });
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

export function onError(callback: (data: { message: string }) => void) {
  const socket = getSocket();
  socket.on('error', callback);
  return () => socket.off('error', callback);
}

