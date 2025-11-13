import client from 'prom-client';
import { gameManager, GameStats } from './gameManager';

const register = new client.Registry();
register.setDefaultLabels({
  app: 'lenka-game',
});

client.collectDefaultMetrics({
  register,
  prefix: 'lenka_',
});

const totalLobbiesGauge = new client.Gauge({
  name: 'lenka_active_lobbies',
  help: 'Number of active lobbies currently stored in memory',
  registers: [register],
});

const totalPlayersGauge = new client.Gauge({
  name: 'lenka_active_players',
  help: 'Total number of players connected to any lobby',
  registers: [register],
});

const lobbyStatusGauge = new client.Gauge({
  name: 'lenka_lobbies_by_status',
  help: 'Lobbies grouped by their lifecycle status',
  labelNames: ['status'],
  registers: [register],
});

const lobbyPlayersGauge = new client.Gauge({
  name: 'lenka_lobby_players',
  help: 'Players per lobby',
  labelNames: ['code', 'status'],
  registers: [register],
});

const lobbyRoundGauge = new client.Gauge({
  name: 'lenka_lobby_round',
  help: 'Current round index per lobby (1-based)',
  labelNames: ['code'],
  registers: [register],
});

const lobbyReadyGauge = new client.Gauge({
  name: 'lenka_lobby_ready_players',
  help: 'Ready players per lobby waiting for next round',
  labelNames: ['code'],
  registers: [register],
});

const lobbyGuessGauge = new client.Gauge({
  name: 'lenka_lobby_guesses_submitted',
  help: 'Number of guesses submitted per lobby',
  labelNames: ['code'],
  registers: [register],
});

const lobbyAgeGauge = new client.Gauge({
  name: 'lenka_lobby_age_seconds',
  help: 'Lobby lifetime in seconds',
  labelNames: ['code'],
  registers: [register],
});

function updateGameMetrics(stats: GameStats) {
  totalLobbiesGauge.set(stats.totals.totalLobbies);
  totalPlayersGauge.set(stats.totals.totalPlayers);

  lobbyStatusGauge.reset();
  (Object.keys(stats.totals.statusCounts) as Array<keyof GameStats['totals']['statusCounts']>).forEach(status => {
    lobbyStatusGauge.labels(status).set(stats.totals.statusCounts[status]);
  });

  lobbyPlayersGauge.reset();
  lobbyRoundGauge.reset();
  lobbyReadyGauge.reset();
  lobbyGuessGauge.reset();
  lobbyAgeGauge.reset();

  stats.lobbies.forEach(lobby => {
    lobbyPlayersGauge.labels(lobby.code, lobby.status).set(lobby.players.length);
    lobbyRoundGauge.labels(lobby.code).set(Math.min(lobby.currentRoundIndex + 1, lobby.roundsTotal));
    lobbyReadyGauge.labels(lobby.code).set(lobby.readyPlayersCount);
    lobbyGuessGauge.labels(lobby.code).set(lobby.guessesCount);
    lobbyAgeGauge.labels(lobby.code).set(Math.max(0, (Date.now() - lobby.createdAt) / 1000));
  });
}

export async function getPrometheusMetrics() {
  const stats = gameManager.getStats();
  updateGameMetrics(stats);
  return register.metrics();
}

export const metricsContentType = register.contentType;
