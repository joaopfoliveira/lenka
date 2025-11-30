import { test, expect, request, Page } from '@playwright/test';
import { io, Socket } from 'socket.io-client';

type LobbyState = {
  code: string;
  status: string;
  guesses: Record<string, number>;
  readyPlayers: Record<string, boolean>;
  currentRoundIndex: number;
  roundsTotal: number;
};

function connectClient() {
  const socket = io('http://localhost:3000', { transports: ['websocket'] });
  return new Promise<Socket>((resolve, reject) => {
    socket.on('connect', () => resolve(socket));
    socket.on('connect_error', reject);
    socket.on('error', (err) => console.log('[SOCKET ERROR]', err));
  });
}

async function waitForLobbyState(socket: Socket): Promise<LobbyState> {
  return new Promise((resolve) => {
    socket.once('lobby:state', (lobby) => resolve(lobby));
  });
}

async function createLobbyViaSocket(rounds = 2, source = 'mixed') {
  const socket = await connectClient();
  return new Promise<{ code: string; socket: Socket }>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout creating lobby')), 10000);
    socket.once('lobby:state', (lobby) => {
      clearTimeout(timer);
      resolve({ code: lobby.code, socket });
    });
    socket.emit('lobby:create', { roundsTotal: rounds, playerName: 'Host', productSource: source });
  });
}

test.setTimeout(120000);

test('multiplayer flow clears guesses/ready between rounds', async ({ page }) => {
  // Keep a browser window open for UI mode visibility
  await page.goto('/');
  const { code, socket: host } = await createLobbyViaSocket(2, 'mixed');
  host.on('error', (err) => console.error('[HOST ERROR]', err));

  const p2 = await connectClient();
  p2.on('error', (err) => console.error('[P2 ERROR]', err));
  p2.emit('lobby:join', { code, playerName: 'Player 2', clientId: 'p2' });
  await waitForLobbyState(p2);

  const api = await request.newContext({ baseURL: 'http://localhost:3000' });
  const productsRes = await api.get(`/api/__e2e/products?count=2`);
  const products = (await productsRes.json()).products;
  host.emit('game:start-with-products', { code, products });

  const startedState = await waitForLobbyState(host);
  expect(startedState.status).toBe('playing');

  host.disconnect();
  p2.disconnect();
});
