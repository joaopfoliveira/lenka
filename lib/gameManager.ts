import { Product, getRandomProducts } from '../data/products';

export type Player = {
  id: string;
  name: string;
  isHost: boolean;
  score: number;
};

export type Lobby = {
  code: string;
  players: Player[];
  hostId: string;
  status: 'waiting' | 'playing' | 'finished';
  roundsTotal: number;
  currentRoundIndex: number;
  currentProduct?: Product;
  products?: Product[];
  guesses: Record<string, number>;
  createdAt: number;
};

class GameManager {
  private lobbies: Map<string, Lobby> = new Map();

  // Generate random lobby code
  private generateCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  // Create new lobby
  createLobby(roundsTotal: number, hostName: string, hostId: string): Lobby {
    const code = this.generateCode();
    
    const lobby: Lobby = {
      code,
      players: [{
        id: hostId,
        name: hostName,
        isHost: true,
        score: 0
      }],
      hostId,
      status: 'waiting',
      roundsTotal,
      currentRoundIndex: 0,
      guesses: {},
      createdAt: Date.now()
    };

    this.lobbies.set(code, lobby);
    return lobby;
  }

  // Join existing lobby
  joinLobby(code: string, playerName: string, playerId: string): Lobby | null {
    const lobby = this.lobbies.get(code);
    
    if (!lobby) {
      return null;
    }

    if (lobby.status !== 'waiting') {
      return null; // Can't join if game already started
    }

    // Check if player already in lobby
    if (lobby.players.some(p => p.id === playerId)) {
      return lobby;
    }

    lobby.players.push({
      id: playerId,
      name: playerName,
      isHost: false,
      score: 0
    });

    return lobby;
  }

  // Leave lobby
  leaveLobby(code: string, playerId: string): { lobby: Lobby | null; shouldDelete: boolean } {
    const lobby = this.lobbies.get(code);
    
    if (!lobby) {
      return { lobby: null, shouldDelete: false };
    }

    // Remove player
    lobby.players = lobby.players.filter(p => p.id !== playerId);

    // If no players left, mark for deletion
    if (lobby.players.length === 0) {
      this.lobbies.delete(code);
      return { lobby: null, shouldDelete: true };
    }

    // If host left, assign new host
    if (lobby.hostId === playerId && lobby.players.length > 0) {
      lobby.hostId = lobby.players[0].id;
      lobby.players[0].isHost = true;
    }

    return { lobby, shouldDelete: false };
  }

  // Start game
  startGame(code: string): Lobby | null {
    const lobby = this.lobbies.get(code);
    
    if (!lobby || lobby.status !== 'waiting') {
      return null;
    }

    // Select random products for this game
    lobby.products = getRandomProducts(lobby.roundsTotal);
    lobby.status = 'playing';
    lobby.currentRoundIndex = 0;
    lobby.currentProduct = lobby.products[0];
    lobby.guesses = {};

    // Reset all player scores
    lobby.players.forEach(p => p.score = 0);

    return lobby;
  }

  // Submit guess
  submitGuess(code: string, playerId: string, guess: number): Lobby | null {
    const lobby = this.lobbies.get(code);
    
    if (!lobby || lobby.status !== 'playing') {
      return null;
    }

    lobby.guesses[playerId] = guess;
    return lobby;
  }

  // Calculate scores and get results
  calculateRoundResults(code: string): {
    realPrice: number;
    results: Array<{
      playerId: string;
      playerName: string;
      guess: number | null;
      difference: number;
      pointsEarned: number;
    }>;
    leaderboard: Array<{ playerId: string; playerName: string; totalScore: number }>;
  } | null {
    const lobby = this.lobbies.get(code);
    
    if (!lobby || !lobby.currentProduct) {
      return null;
    }

    const realPrice = lobby.currentProduct.price;
    const results = lobby.players.map(player => {
      const guess = lobby.guesses[player.id];
      const hasGuessed = guess !== undefined;
      
      let difference = 0;
      let pointsEarned = 0;

      if (hasGuessed) {
        difference = Math.abs(guess - realPrice);
        // Scoring formula: max(0, 1000 - diff * 400)
        pointsEarned = Math.max(0, Math.round(1000 - difference * 400));
        player.score += pointsEarned;
      }

      return {
        playerId: player.id,
        playerName: player.name,
        guess: hasGuessed ? guess : null,
        difference,
        pointsEarned
      };
    });

    const leaderboard = [...lobby.players]
      .sort((a, b) => b.score - a.score)
      .map(p => ({
        playerId: p.id,
        playerName: p.name,
        totalScore: p.score
      }));

    return { realPrice, results, leaderboard };
  }

  // Move to next round
  nextRound(code: string): Lobby | null {
    const lobby = this.lobbies.get(code);
    
    if (!lobby || lobby.status !== 'playing' || !lobby.products) {
      return null;
    }

    lobby.currentRoundIndex++;
    
    if (lobby.currentRoundIndex >= lobby.roundsTotal) {
      // Game finished
      lobby.status = 'finished';
      lobby.currentProduct = undefined;
    } else {
      // Next round
      lobby.currentProduct = lobby.products[lobby.currentRoundIndex];
      lobby.guesses = {};
    }

    return lobby;
  }

  // Reset game (play again)
  resetGame(code: string): Lobby | null {
    const lobby = this.lobbies.get(code);
    
    if (!lobby) {
      return null;
    }

    lobby.status = 'waiting';
    lobby.currentRoundIndex = 0;
    lobby.currentProduct = undefined;
    lobby.products = undefined;
    lobby.guesses = {};
    
    // Reset scores
    lobby.players.forEach(p => p.score = 0);

    return lobby;
  }

  // Get lobby state
  getLobbyState(code: string): Lobby | null {
    return this.lobbies.get(code) || null;
  }

  // Check if all players have guessed
  allPlayersGuessed(code: string): boolean {
    const lobby = this.lobbies.get(code);
    if (!lobby) return false;

    return lobby.players.every(p => lobby.guesses[p.id] !== undefined);
  }

  // Clean up old lobbies (called periodically)
  cleanupOldLobbies(): void {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    
    for (const [code, lobby] of this.lobbies.entries()) {
      if (lobby.createdAt < oneHourAgo) {
        this.lobbies.delete(code);
      }
    }
  }
}

// Singleton instance
export const gameManager = new GameManager();

// Cleanup old lobbies every 10 minutes
setInterval(() => {
  gameManager.cleanupOldLobbies();
}, 10 * 60 * 1000);

