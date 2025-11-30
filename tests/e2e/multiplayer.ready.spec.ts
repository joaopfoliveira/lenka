import { test, expect, request } from '@playwright/test';
import { io } from 'socket.io-client';

const PLAYER_IDS = ['p1', 'p2', 'p3', 'p4', 'p5'];
const PLAYER_NAMES = ['Host', 'P2', 'P3', 'P4', 'P5'];

async function createLobbyAsHost(clientId: string) {
  const hostSocket = io('http://localhost:3000', { transports: ['websocket'] });
  const code = await new Promise<string>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout creating lobby')), 10000);
    hostSocket.once('lobby:state', (state) => {
      clearTimeout(timer);
      resolve(state.code);
    });
    hostSocket.on('connect_error', reject);
    hostSocket.emit('lobby:create', { roundsTotal: 5, playerName: 'Host', productSource: 'mixed', clientId });
  });

  // Disconnect so the UI session can reclaim the same clientId
  hostSocket.disconnect();
  return code;
}

test.setTimeout(240000);

test('five players, five rounds: ready list empty at each round start (UI)', async ({ browser }) => {
  const api = await request.newContext({ baseURL: 'http://localhost:3000' });
  // Create lobby via socket so we get the lobby code immediately
  const code = await createLobbyAsHost(PLAYER_IDS[0]);

  // Spin up 5 browser contexts (host + 4 players)
  const contexts = await Promise.all(
    PLAYER_IDS.map((clientId, idx) =>
      browser.newContext().then(async (ctx) => {
        await ctx.addInitScript(
          ({ id, name }) => {
            localStorage.setItem('playerName', name);
            localStorage.setItem('createLobby', 'false');
            localStorage.setItem('lenka:language', 'en');
            localStorage.setItem('lenka:basePlayerId', id);
            sessionStorage.setItem('lenka:sessionPlayerId', id);
            (window as any).__e2eReadyCount = -1;
            const origLog = console.log;
            console.log = (...args: any[]) => {
              try {
                if (args[0] === 'Received lobby state:' && args[1]?.readyPlayers !== undefined) {
                  (window as any).__e2eReadyCount = Object.keys(args[1].readyPlayers || {}).length;
                }
              } catch {
                // ignore parsing issues
              }
              origLog(...args);
            };
          },
          { id: clientId, name: PLAYER_NAMES[idx] }
        );
        return ctx;
      })
    )
  );

  const pages = await Promise.all(
    contexts.map(async (ctx, idx) => {
      const p = await ctx.newPage();
      p.on('console', (msg) => console.log(`[P${idx + 1}]`, msg.type(), msg.text()));
      await p.goto(`/lobby/${code}`);
      await p.waitForURL(new RegExp(`/lobby/${code}`), { timeout: 60000 });
      await p.waitForTimeout(300);
      return p;
    })
  );

  const hostPage = pages[0];

  // Start the game via fixture API for stability
  let started = false;
  for (let attempt = 0; attempt < 5 && !started; attempt++) {
    const res = await api.get(`/api/__e2e/start-game?code=${code}&count=5`);
    started = res.ok();
    if (!started) await new Promise((r) => setTimeout(r, 500));
  }
  expect(started).toBeTruthy();

  // Five rounds
  for (let round = 0; round < 5; round++) {
    const roundLabel = new RegExp(`Round\\s+${round + 1}|Ronda\\s+${round + 1}`, 'i');
    await expect(hostPage.getByText(roundLabel)).toBeVisible({ timeout: 60000 });

    const guestPage = pages[1];

    // Host submits first guess
    const hostGuessInput = hostPage.getByPlaceholder('0.00').first().or(hostPage.locator('input[type=number]').first());
    await expect(hostGuessInput).toBeVisible({ timeout: 30000 });
    await hostGuessInput.fill(`${round + 10}`);
    await hostPage.getByRole('button', { name: /Submit guess|bloquear palpite|bloquear|lock/i }).first().click();

    // Other players see only Host as guessed
    const guessRows = guestPage.locator('div.shadow-flyer-xs');
    const hostGuessRow = guessRows.filter({ hasText: /^Host/ }).filter({ hasText: /✓/ }).first();
    await expect(hostGuessRow).toBeVisible({ timeout: 15000 });
    for (const name of ['P2', 'P3', 'P4', 'P5']) {
      await expect(guessRows.filter({ hasText: new RegExp(`^${name}\\b`) }).filter({ hasText: /✓/ })).toHaveCount(0);
    }

    // Remaining players submit guesses
    for (let i = 1; i < pages.length; i++) {
      const guessInput = pages[i].getByPlaceholder('0.00').first().or(pages[i].locator('input[type=number]').first());
      await expect(guessInput).toBeVisible({ timeout: 30000 });
      await guessInput.fill(`${round + 10 + i}`);
      await pages[i].getByRole('button', { name: /Submit guess|bloquear palpite|bloquear|lock/i }).first().click();
    }

    // Wait for results to show
    await expect(hostPage.getByRole('heading', { name: /Round Results|Resultado da ronda/i })).toBeVisible({ timeout: 60000 });
    await expect
      .poll(async () => hostPage.evaluate(() => (window as any).__e2eReadyCount), { timeout: 10000 })
      .toBe(0);

    // Host marks ready first; guests should see only Host as ready
    const hostReadyBtn = hostPage.getByRole('button', { name: /Ready for next round|Mark Ready|Ready|See Final Results|Ver Resultados Finais/i }).first();
    if (await hostReadyBtn.isVisible()) {
      await hostReadyBtn.click();
      await expect
        .poll(async () => guestPage.evaluate(() => (window as any).__e2eReadyCount), { timeout: 15000 })
        .toBe(1);
      const readyPills = guestPage.locator('div.label-chip');
      const hostReadyPill = readyPills.filter({ hasText: /^Host/ }).filter({ hasText: /✓/ }).first();
      await expect(hostReadyPill).toBeVisible({ timeout: 15000 });
      for (const name of ['P2', 'P3', 'P4', 'P5']) {
        await expect(readyPills.filter({ hasText: new RegExp(`^${name}\\b`) }).filter({ hasText: /✓/ })).toHaveCount(0);
      }
    }

    // Everyone else marks ready (or sees final results on last round)
    for (const p of pages.slice(1)) {
      const readyButton = p.getByRole('button', { name: /Ready for next round|Mark Ready|Ready|See Final Results|Ver Resultados Finais/i }).first();
      if (await readyButton.isVisible()) {
        await readyButton.click();
      }
    }

    if (round < 4) {
      await expect(hostPage.getByText(new RegExp(`Round\\s+${round + 2}|Ronda\\s+${round + 2}`, 'i'))).toBeVisible({ timeout: 120000 });
    } else {
      await expect(hostPage.getByText(/Final/i)).toBeVisible({ timeout: 120000 });
    }
  }

  await Promise.all(contexts.map((ctx) => ctx.close()));
  await api.dispose();
});
