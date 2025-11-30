import { test, expect, request } from '@playwright/test';
import { io } from 'socket.io-client';

test.setTimeout(120000);

test('multiplayer UI happy path: two players, one round, ready to next', async ({ browser }) => {
  // Create lobby via socket and keep creator to start game
  const creator = io('http://localhost:3000', { transports: ['websocket'] });
  const lobbyCode: string = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout creating lobby')), 10000);
    creator.once('lobby:state', (lobby) => {
      clearTimeout(timer);
      resolve(lobby.code);
    });
    creator.emit('lobby:create', { roundsTotal: 2, playerName: 'Host', productSource: 'mixed' });
  });

  // Host creates lobby
  const hostContext = await browser.newContext();
  const hostPage = await hostContext.newPage();
  hostPage.on('console', (msg) => console.log('[HOST PAGE]', msg.type(), msg.text()));

  await hostPage.addInitScript(({ code }) => {
    localStorage.setItem('playerName', 'Host');
    localStorage.setItem('createLobby', 'false');
  }, { code: lobbyCode });
  await hostPage.goto(`/lobby/${lobbyCode}`);
  await hostPage.waitForURL(new RegExp(`/lobby/${lobbyCode}`), { timeout: 60000 });
  await hostPage.waitForTimeout(500);

  // Guest joins lobby
  const guestContext = await browser.newContext();
  const guestPage = await guestContext.newPage();
  guestPage.on('console', (msg) => console.log('[GUEST PAGE]', msg.type(), msg.text()));
  await guestPage.addInitScript(({ code }) => {
    localStorage.setItem('playerName', 'Guest');
    localStorage.setItem('createLobby', 'false');
  }, { code: lobbyCode });
  await guestPage.goto(`/`);
  await guestPage.waitForLoadState('networkidle');
  await guestPage.goto(`/lobby/${lobbyCode}`);
  await guestPage.waitForURL(new RegExp(`/lobby/${lobbyCode}`));
  await guestPage.waitForTimeout(500);

  // Host starts the game
  const api = await request.newContext({ baseURL: 'http://localhost:3000' });
  const productsRes = await api.get(`/api/__e2e/products?count=2`);
  const products = (await productsRes.json()).products;
  creator.emit('game:start-with-products', { code: lobbyCode, products });
  creator.disconnect();
  await expect(hostPage.getByText(/Round 1/i)).toBeVisible({ timeout: 15000 });

  // Both submit guesses (host page + guest page)
  const hostGuessInput = hostPage.getByPlaceholder('0.00').first().or(hostPage.locator('input[type=number]').first());
  await hostGuessInput.fill('10');
  await hostPage.getByRole('button', { name: /Submit guess|Submit|Submeter/i }).first().click();

  const guestGuessInput = guestPage.getByPlaceholder('0.00').first().or(guestPage.locator('input[type=number]').first());
  await guestGuessInput.fill('11');
  await guestPage.getByRole('button', { name: /Submit guess|Submit|Submeter/i }).first().click();

  // Wait for round results to show
  await expect(hostPage.getByRole('heading', { name: /Round Results|Resultado da ronda/i })).toBeVisible({ timeout: 60000 });
  await expect(guestPage.getByRole('heading', { name: /Round Results|Resultado da ronda/i })).toBeVisible({ timeout: 60000 });

  // Both mark ready
  await hostPage.getByRole('button', { name: /Ready for next round|Mark Ready|Ready/i }).click();
  await guestPage.getByRole('button', { name: /Ready for next round|Mark Ready|Ready/i }).click();

  // Next round begins and inputs are clear
  await expect(hostPage.getByText(/Round 2/i)).toBeVisible({ timeout: 15000 });
  await expect(hostGuessInput).toHaveValue('');

  await hostContext.close();
  await guestContext.close();
});
