import assert from 'assert';
import { GameManager, type Lobby } from '../lib/gameManager';
import { type Product } from '../lib/productTypes';

function makeProduct(id: number): Product {
  return {
    id: `test-${id}`,
    source: 'supermarket',
    category: 'Outros',
    name: `Product ${id}`,
    price: 10 + id,
    imageUrl: `https://example.com/${id}.jpg`,
    store: 'Test Store',
  };
}

function setupLobby(playerCount = 3) {
  const gm = new GameManager();
  const lobby = gm.createLobby(3, 'Host', 'host-id', 'mixed');

  for (let i = 1; i < playerCount; i++) {
    gm.joinLobby(lobby.code, `Player ${i + 1}`, `p${i + 1}`);
  }

  const products = [makeProduct(1), makeProduct(2), makeProduct(3)];
  gm.startGame(lobby.code);
  gm.startGameWithClientProducts(lobby.code, products);

  return { gm, lobbyCode: lobby.code, products };
}

function getLobby(gm: GameManager, code: string): Lobby {
  const lobby = gm.getLobbyState(code);
  assert(lobby, 'Lobby should exist');
  return lobby;
}

// Test 1: guesses and ready flags are cleared when moving to a new round
(function testGuessesResetPerRound() {
  const { gm, lobbyCode } = setupLobby(3);
  gm.submitGuess(lobbyCode, 'host-id', 10);
  gm.submitGuess(lobbyCode, 'p2', 11);
  gm.submitGuess(lobbyCode, 'p3', 12);

  gm.calculateRoundResults(lobbyCode);
  gm.setPlayerReady(lobbyCode, 'host-id', true);
  gm.setPlayerReady(lobbyCode, 'p2', true);
  gm.setPlayerReady(lobbyCode, 'p3', true);
  gm.nextRound(lobbyCode);

  const lobby = getLobby(gm, lobbyCode);
  assert.strictEqual(Object.keys(lobby.guesses).length, 0, 'Guesses should be cleared on next round');
  assert.strictEqual(Object.keys(lobby.readyPlayers).length, 0, 'Ready flags should reset on next round');
  assert.strictEqual(lobby.currentRoundIndex, 1, 'Should advance to next round');
})();

// Test 2: scores/leaderboard accumulate across rounds and results carry updated totals
(function testLeaderboardUpdatesEachRound() {
  const { gm, lobbyCode } = setupLobby(2);

  // Round 1
  gm.submitGuess(lobbyCode, 'host-id', 10);
  gm.submitGuess(lobbyCode, 'p2', 20);
  const results1 = gm.calculateRoundResults(lobbyCode);
  assert(results1, 'Should produce round 1 results');
  const hostScoreAfterR1 = getLobby(gm, lobbyCode).players.find(p => p.id === 'host-id')?.score ?? 0;

  gm.nextRound(lobbyCode);

  // Round 2 with different guesses
  gm.submitGuess(lobbyCode, 'host-id', 30);
  gm.submitGuess(lobbyCode, 'p2', 15);
  const results2 = gm.calculateRoundResults(lobbyCode);
  assert(results2, 'Should produce round 2 results');

  const lobby = getLobby(gm, lobbyCode);
  const hostScoreAfterR2 = lobby.players.find(p => p.id === 'host-id')?.score ?? 0;
  const leaderboardIds = (results2?.leaderboard || []).map(entry => entry.playerId);

  assert(hostScoreAfterR2 !== hostScoreAfterR1, 'Scores should update between rounds');
  assert(leaderboardIds.includes('host-id') && leaderboardIds.includes('p2'), 'Leaderboard should include both players');
})();

// Test 3: ready flags reflect only current round state (not sticky)
(function testReadyFlagsReset() {
  const { gm, lobbyCode } = setupLobby(2);
  gm.setPlayerReady(lobbyCode, 'host-id', true);
  gm.setPlayerReady(lobbyCode, 'p2', true);
  gm.calculateRoundResults(lobbyCode);
  gm.nextRound(lobbyCode);

  const lobby = getLobby(gm, lobbyCode);
  assert.strictEqual(Object.keys(lobby.readyPlayers).length, 0, 'Ready flags should clear after advancing');
})();

// Test 4: full game flow advances to finished and clears current product
(function testFullGameFinishes() {
  const { gm, lobbyCode } = setupLobby(2);

  // Round 1
  gm.submitGuess(lobbyCode, 'host-id', 10);
  gm.submitGuess(lobbyCode, 'p2', 12);
  gm.calculateRoundResults(lobbyCode);
  gm.nextRound(lobbyCode);

  // Round 2
  gm.submitGuess(lobbyCode, 'host-id', 14);
  gm.submitGuess(lobbyCode, 'p2', 15);
  gm.calculateRoundResults(lobbyCode);
  gm.nextRound(lobbyCode);

  // Round 3 (final)
  gm.submitGuess(lobbyCode, 'host-id', 16);
  gm.submitGuess(lobbyCode, 'p2', 17);
  gm.calculateRoundResults(lobbyCode);
  gm.nextRound(lobbyCode);

  const lobby = getLobby(gm, lobbyCode);
  assert.strictEqual(lobby.status, 'finished', 'Game should be finished after final round');
  assert.strictEqual(lobby.currentProduct, undefined, 'No current product after game ends');
})();

console.log('✅ multiplayer flow tests passed');
