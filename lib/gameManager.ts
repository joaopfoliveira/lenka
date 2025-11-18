import { Product } from './productTypes';
import { fetchRandomKuantoKustaProductsAPI } from './fetchers/kuantokusta-api.fetcher';
import { fetchRandomTemuProducts } from './fetchers/temu.fetcher';
import { 
  calculateRoundResults as scoringCalculateRoundResults, 
  generateLeaderboard,
  type PlayerGuess,
  type RoundResultEntry 
} from './scoring';
import { getRandomStageName } from './stageNames';

export type Player = {
  id: string;
  name: string;
  isHost: boolean;
  score: number;
  clientId: string;
  isConnected: boolean;
};

export type Lobby = {
  code: string;
  players: Player[];
  hostId: string;
  status: 'waiting' | 'playing' | 'finished' | 'loading'; // Added 'loading' status
  roundsTotal: number;
  currentRoundIndex: number;
  currentProduct?: Product;
  products?: Product[];
  guesses: Record<string, number>;
  readyPlayers: Record<string, boolean>; // Track who is ready for next round
  productSource: 'kuantokusta' | 'temu' | 'mixed'; // Where to fetch products from
  createdAt: number;
};

export type LobbySummary = {
  code: string;
  status: Lobby['status'];
  hostId: string;
  roundsTotal: number;
  currentRoundIndex: number;
  createdAt: number;
  readyPlayersCount: number;
  guessesCount: number;
  currentProductName: string | null;
  currentProductPrice: number | null;
  players: Array<{
    id: string;
    name: string;
    isHost: boolean;
    score: number;
    clientId: string;
    isConnected: boolean;
  }>;
};

export type GameStats = {
  totals: {
    totalLobbies: number;
    totalPlayers: number;
    statusCounts: Record<Lobby['status'], number>;
  };
  lobbies: LobbySummary[];
};

class GameManager {
  private lobbies: Map<string, Lobby> = new Map();
  private readonly maxNameLength = 24;

  private sanitizePlayerName(name?: string): string {
    const trimmed = (name || '').trim();
    if (!trimmed) {
      return getRandomStageName();
    }
    return trimmed.slice(0, this.maxNameLength);
  }

  private generateUniqueName(lobby: Lobby, desiredName: string): string {
    if (!lobby.players.some(player => player.name === desiredName)) {
      return desiredName;
    }

    let counter = 2;
    let candidate = `${desiredName} (${counter})`;
    while (lobby.players.some(player => player.name === candidate)) {
      counter++;
      candidate = `${desiredName} (${counter})`;
    }
    return candidate;
  }

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
  createLobby(
    roundsTotal: number,
    hostName: string,
    hostId: string,
    productSource: 'kuantokusta' | 'temu' | 'mixed' = 'mixed',
    clientId?: string
  ): Lobby {
    const code = this.generateCode();
    const safeName = this.sanitizePlayerName(hostName);
    const resolvedClientId = clientId || hostId;
    
    const lobby: Lobby = {
      code,
      players: [{
        id: hostId,
        name: safeName,
        isHost: true,
        score: 0,
        clientId: resolvedClientId,
        isConnected: true
      }],
      hostId,
      status: 'waiting',
      roundsTotal,
      currentRoundIndex: 0,
      guesses: {},
      readyPlayers: {},
      productSource,
      createdAt: Date.now()
    };

    this.lobbies.set(code, lobby);
    return lobby;
  }

  // Join existing lobby
  joinLobby(
    code: string,
    playerName: string,
    playerId: string,
    clientId?: string
  ): { lobby: Lobby; isReconnect: boolean; oldPlayerId?: string } | null {
    const lobby = this.lobbies.get(code);
    
    if (!lobby) {
      return null;
    }
    
    const safeName = this.sanitizePlayerName(playerName);
    let resolvedClientId = clientId || playerId;

    // Check if player with same socket ID already exists
    const existingPlayerById = lobby.players.find(p => p.id === playerId);
    if (existingPlayerById) {
      return { lobby, isReconnect: false };
    }

    // Check if player with same persistent ID already exists (reconnection after refresh)
    const existingPlayerByClient = lobby.players.find(p => p.clientId === resolvedClientId);
    if (existingPlayerByClient && !existingPlayerByClient.isConnected) {
      console.log(`🔄 Reconnection detected: "${existingPlayerByClient.name}" (old ID: ${existingPlayerByClient.id}, new ID: ${playerId})`);
      const oldPlayerId = existingPlayerByClient.id;
      
      existingPlayerByClient.id = playerId;
      existingPlayerByClient.isConnected = true;
      
      if (lobby.hostId === oldPlayerId) {
        lobby.hostId = playerId;
      }
      
      if (lobby.guesses[oldPlayerId] !== undefined) {
        lobby.guesses[playerId] = lobby.guesses[oldPlayerId];
        delete lobby.guesses[oldPlayerId];
      }
      if (lobby.readyPlayers[oldPlayerId]) {
        lobby.readyPlayers[playerId] = true;
        delete lobby.readyPlayers[oldPlayerId];
      }
      
      return { lobby, isReconnect: true, oldPlayerId };
    } else if (existingPlayerByClient) {
      resolvedClientId = `${resolvedClientId}-${playerId}`;
      console.log(`⚠️ Duplicate active client detected for ${existingPlayerByClient.name}. Issuing new session ID ${resolvedClientId}`);
    }

    const finalPlayerName = this.generateUniqueName(lobby, safeName);

    // New player joining
    lobby.players.push({
      id: playerId,
      name: finalPlayerName,
      isHost: false,
      score: 0,
      clientId: resolvedClientId,
      isConnected: true
    });

    return { lobby, isReconnect: false };
  }

  // Leave lobby
  leaveLobby(code: string, playerId: string): { lobby: Lobby | null; shouldDelete: boolean; newHostId?: string } {
    const lobby = this.lobbies.get(code);
    
    if (!lobby) {
      return { lobby: null, shouldDelete: false };
    }

    // Remove player
    const wasHost = lobby.hostId === playerId;
    delete lobby.guesses[playerId];
    delete lobby.readyPlayers[playerId];
    lobby.players = lobby.players.filter(p => p.id !== playerId);

    // If no players left, mark for deletion
    if (lobby.players.length === 0) {
      this.lobbies.delete(code);
      console.log(`🗑️ Lobby ${code} deleted (no players left)`);
      return { lobby: null, shouldDelete: true };
    }

    // If host left, assign new host to the first remaining player
    let newHostId: string | undefined;
    if (wasHost && lobby.players.length > 0) {
      const newHost = lobby.players[0];
      lobby.hostId = newHost.id;
      newHost.isHost = true;
      newHostId = newHost.id;
      console.log(`👑 New host assigned in lobby ${code}: ${newHost.name} (${newHost.id})`);
    }

    return { lobby, shouldDelete: false, newHostId };
  }

  // Start game - Set loading state
  startGame(code: string): Lobby | null {
    const lobby = this.lobbies.get(code);
    
    if (!lobby || lobby.status !== 'waiting') {
      return null;
    }

    // Set loading state
    lobby.status = 'loading';

    return lobby;
  }

  // Fetch products and start game (async) - SERVER-SIDE (BACKUP METHOD)
  async fetchProductsAndStart(code: string): Promise<Lobby | null> {
    const lobby = this.lobbies.get(code);
    
    if (!lobby || lobby.status !== 'loading') {
      return null;
    }

    try {
      console.log(`🎮 [SERVER] Fetching ${lobby.roundsTotal} products for lobby ${code} (source: ${lobby.productSource})...`);
      
      let kkProducts: Product[] = [];
      let temuProducts: Product[] = [];
      
      if (lobby.productSource === 'mixed') {
        // Split products 50/50 between KuantoKusta and Temu
        const kkCount = Math.ceil(lobby.roundsTotal / 2);
        const temuCount = Math.floor(lobby.roundsTotal / 2);
        
        console.log(`🛒 [SERVER] Fetching ${kkCount} from KuantoKusta, ${temuCount} from Temu...`);
        
        // Fetch from both sources in parallel
        [kkProducts, temuProducts] = await Promise.all([
          fetchRandomKuantoKustaProductsAPI(kkCount),
          fetchRandomTemuProducts(temuCount),
        ]);
        
        console.log(`✅ [SERVER] Got ${kkProducts.length} from KuantoKusta, ${temuProducts.length} from Temu`);
      } else if (lobby.productSource === 'kuantokusta') {
        // Fetch only from KuantoKusta
        console.log(`🛒 [SERVER] Fetching ${lobby.roundsTotal} from KuantoKusta only...`);
        kkProducts = await fetchRandomKuantoKustaProductsAPI(lobby.roundsTotal);
        console.log(`✅ [SERVER] Got ${kkProducts.length} from KuantoKusta`);
      } else if (lobby.productSource === 'temu') {
        // Fetch only from Temu
        console.log(`🛒 [SERVER] Fetching ${lobby.roundsTotal} from Temu only...`);
        temuProducts = await fetchRandomTemuProducts(lobby.roundsTotal);
        console.log(`✅ [SERVER] Got ${temuProducts.length} from Temu`);
      }
      
      // Combine and shuffle products
      const allProducts = [...kkProducts, ...temuProducts];
      lobby.products = allProducts.sort(() => Math.random() - 0.5).slice(0, lobby.roundsTotal);
      
      // Validate we have enough products
      if (lobby.products.length < lobby.roundsTotal) {
        throw new Error(`Insufficient products: got ${lobby.products.length}, needed ${lobby.roundsTotal}`);
      }
      
      console.log(`✅ [SERVER] Combined ${lobby.products.length} products for game`);
      console.log(`📊 [SERVER] Sources: ${lobby.products.filter(p => p.source === 'kuantokusta').length} KuantoKusta, ${lobby.products.filter(p => p.source === 'temu').length} Temu`);
      
      // Start the game
      lobby.status = 'playing';
      lobby.currentRoundIndex = 0;
      lobby.currentProduct = lobby.products[0];
      lobby.guesses = {};
      lobby.readyPlayers = {};

      // Reset all player scores
      lobby.players.forEach(p => p.score = 0);

      return lobby;
    } catch (error) {
      console.error(`❌ [SERVER] Error fetching products for lobby ${code}:`, error);
      
      // Volta ao lobby se API falhar
      lobby.status = 'waiting';
      lobby.products = undefined;
      
      throw new Error('Failed to fetch products from APIs. Please try again.');
    }
  }

  // Start game with products from client (NEW - PRIMARY METHOD)
  startGameWithClientProducts(code: string, products: Product[]): Lobby | null {
    const lobby = this.lobbies.get(code);
    
    if (!lobby || lobby.status !== 'loading') {
      console.error(`❌ Cannot start game: lobby ${code} not in loading state`);
      return null;
    }

    // Validate products count
    if (!products || products.length < lobby.roundsTotal) {
      console.error(`❌ Invalid products count: expected ${lobby.roundsTotal}, got ${products?.length || 0}`);
      lobby.status = 'waiting';
      return null;
    }

    // Validate each product structure (anti-cheating)
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      if (!product.id || !product.name || typeof product.price !== 'number' || product.price <= 0) {
        console.error(`❌ Invalid product ${i + 1}: ${product.name} (price: ${product.price})`);
        lobby.status = 'waiting';
        return null;
      }
    }

    console.log(`✅ [CLIENT] Received ${products.length} valid products for lobby ${code}`);

    // Store products and start game
    lobby.products = products.slice(0, lobby.roundsTotal); // Limit to required rounds
    lobby.status = 'playing';
    lobby.currentRoundIndex = 0;
    lobby.currentProduct = lobby.products[0];
    lobby.guesses = {};
    lobby.readyPlayers = {};

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

  // Calculate scores and get results using new scoring system
  calculateRoundResults(code: string): {
    realPrice: number;
    productName: string;
    productUrl: string;
    productStore: string;
    results: RoundResultEntry[];
    leaderboard: Array<{ playerId: string; playerName: string; totalScore: number }>;
  } | null {
    const lobby = this.lobbies.get(code);
    
    if (!lobby || !lobby.currentProduct) {
      return null;
    }

    const realPrice = lobby.currentProduct.price;
    const productName = lobby.currentProduct.name;
    const productUrl = lobby.currentProduct.storeUrl || '';
    const productStore = lobby.currentProduct.store || 'Unknown';
    
    // Prepare guesses for scoring calculation
    const guesses: PlayerGuess[] = lobby.players.map(player => ({
      playerId: player.id,
      playerName: player.name,
      guess: lobby.guesses[player.id] !== undefined ? lobby.guesses[player.id] : null,
    }));

    // Get previous totals before this round
    const previousTotals: Record<string, number> = {};
    lobby.players.forEach(player => {
      previousTotals[player.id] = player.score;
    });

    // Calculate round results using centralized scoring system
    const results = scoringCalculateRoundResults(guesses, realPrice, previousTotals);

    // Update player scores with new totals from this round
    results.forEach(result => {
      const player = lobby.players.find(p => p.id === result.playerId);
      if (player) {
        player.score = result.totalScore;
      }
    });

    // Generate leaderboard
    const leaderboard = generateLeaderboard(results);

    return { realPrice, productName, productUrl, productStore, results, leaderboard };
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
      lobby.readyPlayers = {}; // Reset ready status for new round
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
    lobby.readyPlayers = {};
    
    // Reset scores
    lobby.players.forEach(p => p.score = 0);

    return lobby;
  }

  // Mark player as ready for next round
  setPlayerReady(code: string, playerId: string, isReady: boolean = true): Lobby | null {
    const lobby = this.lobbies.get(code);
    
    if (!lobby) {
      return null;
    }

    if (isReady) {
      lobby.readyPlayers[playerId] = true;
    } else {
      delete lobby.readyPlayers[playerId];
    }

    return lobby;
  }

  // Check if all players are ready
  allPlayersReady(code: string): boolean {
    const lobby = this.lobbies.get(code);
    if (!lobby) return false;

    return lobby.players.every(p => lobby.readyPlayers[p.id] === true);
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

  // Find which lobby a player is in
  findPlayerLobby(playerId: string): { code: string; lobby: Lobby } | null {
    for (const [code, lobby] of this.lobbies.entries()) {
      if (lobby.players.some(p => p.id === playerId)) {
        return { code, lobby };
      }
    }
    return null;
  }

  getStats(): GameStats {
    const lobbiesArray = Array.from(this.lobbies.values());

    const lobbySummaries: LobbySummary[] = lobbiesArray.map(lobby => ({
      code: lobby.code,
      status: lobby.status,
      hostId: lobby.hostId,
      roundsTotal: lobby.roundsTotal,
      currentRoundIndex: lobby.currentRoundIndex,
      createdAt: lobby.createdAt,
      readyPlayersCount: Object.keys(lobby.readyPlayers).length,
      guessesCount: Object.keys(lobby.guesses).length,
      currentProductName: lobby.currentProduct?.name ?? null,
      currentProductPrice: lobby.currentProduct?.price ?? null,
      players: lobby.players.map(player => ({
        id: player.id,
        name: player.name,
        isHost: player.isHost,
        score: player.score,
        clientId: player.clientId,
        isConnected: player.isConnected
      }))
    }));

    const totals = lobbySummaries.reduce(
      (acc, lobby) => {
        acc.totalLobbies += 1;
        acc.totalPlayers += lobby.players.length;
        acc.statusCounts[lobby.status] = (acc.statusCounts[lobby.status] || 0) + 1;
        return acc;
      },
      {
        totalLobbies: 0,
        totalPlayers: 0,
        statusCounts: {
          waiting: 0,
          playing: 0,
          finished: 0,
          loading: 0
        } as Record<Lobby['status'], number>
      }
    );

    return {
      totals,
      lobbies: lobbySummaries
    };
  }

  // Clean up old lobbies (called periodically)
  cleanupOldLobbies(): Array<{ code: string; playerClientIds: string[] }> {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    const expired: Array<{ code: string; playerClientIds: string[] }> = [];
    
    for (const [code, lobby] of this.lobbies.entries()) {
      if (lobby.createdAt < oneHourAgo) {
        expired.push({
          code,
          playerClientIds: lobby.players.map(player => player.clientId),
        });
        this.lobbies.delete(code);
      }
    }
    
    return expired;
  }
}

// Singleton instance
export const gameManager = new GameManager();
