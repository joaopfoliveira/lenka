'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  connectSocket,
  createLobby,
  joinLobby,
  leaveLobby,
  startGame,
  getSocket,
  submitGuess,
  markPlayerReady,
  resetGame,
} from '@/lib/socketClient';
import type { Lobby } from '@/lib/gameManager';
import { Product } from '@/data/products';

const DEV_PASSWORD = 'joao13';

const fixtureProducts: Product[] = [
  { id: 'fx-1', source: 'supermarket', category: 'Bebidas', name: 'Água Fix 1L', price: 1.1, imageUrl: 'https://example.com/agua.jpg' },
  { id: 'fx-2', source: 'supermarket', category: 'Snacks', name: 'Bolachas Fix', price: 2.2, imageUrl: 'https://example.com/bolachas.jpg' },
  { id: 'fx-3', source: 'supermarket', category: 'Frescos', name: 'Queijo Fix', price: 3.3, imageUrl: 'https://example.com/queijo.jpg' },
  { id: 'fx-4', source: 'supermarket', category: 'Bebidas', name: 'Sumo Fix', price: 4.4, imageUrl: 'https://example.com/sumo.jpg' },
  { id: 'fx-5', source: 'supermarket', category: 'Mercearia', name: 'Arroz Fix', price: 5.5, imageUrl: 'https://example.com/arroz.jpg' },
];

type SimPlayer = {
  label: string;
  clientId: string;
  socket: Socket;
  connected: boolean;
};

export default function DebugPage() {
  if (process.env.NODE_ENV === 'production') {
    return <div className="p-6 text-red-700">Debug console disabled in production.</div>;
  }

  const [passOk, setPassOk] = useState(false);
  const [inputPass, setInputPass] = useState('');
  useEffect(() => {
    try {
      const stored = localStorage.getItem('lenka:debugPass');
      if (stored === DEV_PASSWORD) setPassOk(true);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (passOk) {
      try {
        localStorage.setItem('lenka:debugPass', DEV_PASSWORD);
      } catch {
        // ignore
      }
    }
  }, [passOk]);

  const [lobbyCode, setLobbyCode] = useState('');
  const [playerName, setPlayerName] = useState('Host');
  const [clientId, setClientId] = useState(() => `debug-${Math.random().toString(36).slice(2, 8)}`);
  const [status, setStatus] = useState<string>('idle');
  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [events, setEvents] = useState<string[]>([]);
  const [simPlayers, setSimPlayers] = useState<SimPlayer[]>([]);
  const mounted = useRef(false);

  const origin = useMemo(() => (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'), []);

  const log = (msg: string) => {
    setEvents((prev) => [msg, ...prev].slice(0, 200));
  };

  useEffect(() => {
    mounted.current = true;
    return () => {
      simPlayers.forEach((p) => p.socket.disconnect());
    };
  }, [simPlayers]);

  const attachMainListeners = () => {
    const socket = getSocket();
    socket.off('lobby:state');
    socket.on('lobby:state', (state: Lobby) => {
      setLobby(state);
      setLobbyCode(state.code);
      log(`lobby:state ${state.status} players=${state.players.length}`);
    });
    socket.off('round:results');
    socket.on('round:results', (r) => log(`round:results idx=${r.roundIndex}`));
    socket.off('game:started');
    socket.on('game:started', (g) => log(`game:started round=${g.roundIndex}`));
    socket.off('error');
    socket.on('error', (err) => log(`error: ${JSON.stringify(err)}`));
  };

  const handleConnect = async () => {
    setStatus('connecting');
    await connectSocket();
    attachMainListeners();
    setStatus('connected');
  };

  const handleCreate = () => {
    createLobby(5, playerName || 'Host', 'mixed', clientId);
    setStatus('created');
  };

  const handleJoin = () => {
    if (!lobbyCode) return;
    joinLobby(lobbyCode.trim().toUpperCase(), playerName || 'Host', clientId);
    setStatus('joined');
  };

  const handleLeave = () => {
    if (lobbyCode) leaveLobby(lobbyCode);
    setLobby(null);
    setStatus('left');
  };

  const handleStartWithFixtures = () => {
    if (!lobbyCode) return;
    startGame(lobbyCode);
    const socket = getSocket();
    socket.emit('game:start-with-products', { code: lobbyCode, products: fixtureProducts });
    log('start-with-products fired');
  };

  const handleReset = () => {
    if (!lobbyCode) return;
    resetGame(lobbyCode);
    setStatus('reset');
  };

  const addSimPlayer = () => {
    if (!lobbyCode) return;
    const idx = simPlayers.length + 1;
    const simName = `Sim${idx}`;
    const simClientId = `sim-${Math.random().toString(36).slice(2, 8)}`;
    const socket = io(origin, { transports: ['websocket'] });
    const sim: SimPlayer = { label: simName, clientId: simClientId, socket, connected: false };
    socket.on('connect', () => {
      socket.emit('lobby:join', { code: lobbyCode, playerName: simName, clientId: simClientId });
      log(`${simName} joined`);
      setSimPlayers((prev) => prev.map((p) => (p.clientId === simClientId ? { ...p, connected: true } : p)));
    });
    socket.on('disconnect', () => {
      setSimPlayers((prev) => prev.map((p) => (p.clientId === simClientId ? { ...p, connected: false } : p)));
    });
    setSimPlayers((prev) => [...prev, sim]);
  };

  const disconnectSim = (clientId: string) => {
    setSimPlayers((prev) =>
      prev.map((p) => {
        if (p.clientId === clientId) {
          p.socket.disconnect();
          return { ...p, connected: false };
        }
        return p;
      })
    );
  };

  const reconnectSim = (clientId: string) => {
    const sim = simPlayers.find((p) => p.clientId === clientId);
    if (!sim) return;
    sim.socket.connect();
  };

  const simGuess = (clientId: string, value: number) => {
    const sim = simPlayers.find((p) => p.clientId === clientId);
    if (!sim || !lobbyCode) return;
    sim.socket.emit('guess:submit', { code: lobbyCode, value });
    log(`${sim.label} guess ${value}`);
  };

  const simReady = (clientId: string) => {
    const sim = simPlayers.find((p) => p.clientId === clientId);
    if (!sim || !lobbyCode) return;
    sim.socket.emit('player:ready', { code: lobbyCode });
    log(`${sim.label} ready`);
  };

  const renderAuthed = () => (
    <div className="space-y-6 p-4 text-sm">
      <div className="flex gap-3">
        <button className="rounded bg-blue-500 px-3 py-2 text-white" onClick={handleConnect}>
          Connect socket
        </button>
        <button className="rounded bg-amber-500 px-3 py-2 text-white" onClick={() => getSocket().disconnect()}>
          Disconnect socket
        </button>
        <span className="text-gray-600">Status: {status}</span>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2 rounded border p-3">
          <p className="text-xs font-semibold uppercase">Main player</p>
          <input className="w-full rounded border px-2 py-1" placeholder="Player name" value={playerName} onChange={(e) => setPlayerName(e.target.value)} />
          <input className="w-full rounded border px-2 py-1" placeholder="Client ID" value={clientId} onChange={(e) => setClientId(e.target.value)} />
          <input className="w-full rounded border px-2 py-1" placeholder="Lobby code" value={lobbyCode} onChange={(e) => setLobbyCode(e.target.value.toUpperCase())} />
          <div className="flex flex-wrap gap-2">
            <button className="rounded bg-green-600 px-3 py-2 text-white" onClick={handleCreate}>
              Create lobby
            </button>
            <button className="rounded bg-blue-600 px-3 py-2 text-white" onClick={handleJoin}>
              Join lobby
            </button>
            <button className="rounded bg-slate-600 px-3 py-2 text-white" onClick={handleLeave}>
              Leave
            </button>
            <button className="rounded bg-purple-600 px-3 py-2 text-white" onClick={handleStartWithFixtures}>
              Start with fixtures
            </button>
            <button className="rounded bg-orange-600 px-3 py-2 text-white" onClick={handleReset}>
              Reset lobby
            </button>
          </div>
          <div className="flex gap-2">
            <button className="rounded bg-indigo-600 px-3 py-2 text-white" onClick={() => submitGuess(lobbyCode, Math.random() * 10 + 1)}>
              Submit random guess
            </button>
            <button className="rounded bg-teal-600 px-3 py-2 text-white" onClick={() => markPlayerReady(lobbyCode)}>
              Mark ready
            </button>
          </div>
        </div>

        <div className="space-y-2 rounded border p-3">
          <p className="text-xs font-semibold uppercase">Simulated players</p>
          <button className="rounded bg-blue-700 px-3 py-2 text-white" onClick={addSimPlayer}>
            Add simulated player
          </button>
          <div className="space-y-2">
            {simPlayers.map((sim) => (
              <div key={sim.clientId} className="rounded border px-2 py-2">
                <div className="flex items-center justify-between text-sm">
                  <span>
                    {sim.label} ({sim.clientId.slice(0, 8)}) {sim.connected ? '🟢' : '🔴'}
                  </span>
                  <div className="flex gap-2">
                    <button className="rounded bg-slate-500 px-2 py-1 text-white" onClick={() => disconnectSim(sim.clientId)}>
                      Disconnect
                    </button>
                    <button className="rounded bg-green-600 px-2 py-1 text-white" onClick={() => reconnectSim(sim.clientId)}>
                      Reconnect
                    </button>
                  </div>
                </div>
                <div className="mt-2 flex gap-2">
                  <button className="rounded bg-indigo-500 px-2 py-1 text-white" onClick={() => simGuess(sim.clientId, Math.random() * 10 + 1)}>
                    Guess
                  </button>
                  <button className="rounded bg-teal-500 px-2 py-1 text-white" onClick={() => simReady(sim.clientId)}>
                    Ready
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded border p-3">
        <p className="text-xs font-semibold uppercase">Lobby state</p>
        <pre className="max-h-72 overflow-auto rounded bg-slate-900 p-3 text-xs text-green-100">
{JSON.stringify(lobby, null, 2)}
        </pre>
      </div>

      <div className="rounded border p-3">
        <p className="text-xs font-semibold uppercase">Events</p>
        <ul className="max-h-48 overflow-auto text-xs">
          {events.map((e, idx) => (
            <li key={idx}>{e}</li>
          ))}
        </ul>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {!passOk ? (
        <div className="mx-auto mt-20 max-w-md rounded border bg-white p-4 shadow">
          <p className="mb-2 text-sm font-semibold">Debug console</p>
          <input
            type="password"
            className="w-full rounded border px-2 py-1"
            placeholder="Password"
            value={inputPass}
            onChange={(e) => setInputPass(e.target.value)}
          />
          <button
            className="mt-3 w-full rounded bg-blue-600 px-3 py-2 text-white"
            onClick={() => {
              if (inputPass === DEV_PASSWORD) setPassOk(true);
            }}
          >
            Enter
          </button>
        </div>
      ) : (
        renderAuthed()
      )}
    </div>
  );
}
