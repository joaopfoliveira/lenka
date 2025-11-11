'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Logo from './components/Logo';

export default function Home() {
  const router = useRouter();
  const [mode, setMode] = useState<'menu' | 'create' | 'join'>('menu');
  const [playerName, setPlayerName] = useState('');
  const [lobbyCode, setLobbyCode] = useState('');
  const [roundsTotal, setRoundsTotal] = useState(5);
  const [productSource, setProductSource] = useState<'kuantokusta' | 'temu' | 'mixed'>('mixed');
  const [error, setError] = useState('');

  const handleCreateLobby = () => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }
    
    // Store player name and redirect with creation intent
    localStorage.setItem('playerName', playerName);
    localStorage.setItem('createLobby', 'true');
    localStorage.setItem('roundsTotal', roundsTotal.toString());
    localStorage.setItem('productSource', productSource);
    // Use a special code that the lobby page will recognize
    router.push('/lobby/__create__');
  };

  const handleJoinLobby = () => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }
    
    if (!lobbyCode.trim()) {
      setError('Please enter the lobby code');
      return;
    }

    // Store player name and redirect
    localStorage.setItem('playerName', playerName);
    router.push(`/lobby/${lobbyCode.toUpperCase()}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md border-2 border-lenka-mustard/20">
        {/* Logo */}
        <div className="text-center mb-8 flex flex-col items-center">
          <Logo width={200} height={100} className="mb-4" />
          <p className="text-lenka-dark font-semibold">If not a corner, not a goal</p>
        </div>

        {/* Menu */}
        {mode === 'menu' && (
          <div className="space-y-4">
            <button
              onClick={() => setMode('create')}
              className="w-full bg-lenka-red hover:bg-lenka-red/90 text-white font-bold py-5 px-6 rounded-lg transition duration-200 shadow-lg hover:shadow-xl border-2 border-lenka-red text-lg"
            >
              🎮 Create Lobby
            </button>
            <button
              onClick={() => setMode('join')}
              className="w-full bg-lenka-mustard hover:bg-lenka-mustard/90 text-lenka-dark font-bold py-5 px-6 rounded-lg transition duration-200 shadow-lg hover:shadow-xl border-2 border-lenka-mustard text-lg"
            >
              🚪 Join Lobby
            </button>
          </div>
        )}

        {/* Create Lobby Form */}
        {mode === 'create' && (
          <div className="space-y-5">
            <div>
              <label className="block text-lenka-dark font-semibold mb-2 text-sm">👤 Your Name</label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => {
                  setPlayerName(e.target.value);
                  setError('');
                }}
                placeholder="e.g. John"
                className="w-full px-4 py-3 border-2 border-lenka-mustard/30 rounded-lg focus:ring-2 focus:ring-lenka-red focus:border-lenka-red text-lenka-dark"
                maxLength={20}
              />
            </div>

            <div>
              <label className="block text-lenka-dark font-semibold mb-3 text-sm">🎯 Number of Rounds</label>
              <div className="flex gap-3">
                {[5, 8, 10].map((num) => (
                  <button
                    key={num}
                    onClick={() => setRoundsTotal(num)}
                    className={`flex-1 py-3 rounded-lg font-bold transition duration-200 border-2 text-lg ${
                      roundsTotal === num
                        ? 'bg-lenka-red text-white border-lenka-red shadow-md'
                        : 'bg-white text-lenka-dark border-lenka-mustard/30 hover:border-lenka-red hover:shadow'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-lenka-dark font-semibold mb-3 text-sm">🛒 Product Source</label>
              <div className="grid grid-cols-1 gap-3">
                {[
                  { 
                    value: 'kuantokusta' as const, 
                    icon: '🇵🇹',
                    title: 'KuantoKusta', 
                    desc: 'Portuguese stores' 
                  },
                  { 
                    value: 'temu' as const, 
                    icon: '🌍',
                    title: 'Temu', 
                    desc: 'International products' 
                  },
                  { 
                    value: 'mixed' as const, 
                    icon: '🎲',
                    title: 'Mixed', 
                    desc: 'Maximum variety' 
                  }
                ].map((source) => (
                  <button
                    key={source.value}
                    onClick={() => setProductSource(source.value)}
                    className={`py-3 px-4 rounded-lg transition duration-200 border-2 text-left ${
                      productSource === source.value
                        ? 'bg-lenka-red text-white border-lenka-red shadow-md'
                        : 'bg-white text-lenka-dark border-lenka-mustard/30 hover:border-lenka-red hover:shadow'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{source.icon}</span>
                      <div className="flex-1">
                        <div className="font-bold">{source.title}</div>
                        <div className={`text-xs ${productSource === source.value ? 'text-white/80' : 'text-gray-500'}`}>
                          {source.desc}
                        </div>
                      </div>
                      {productSource === source.value && (
                        <span className="text-xl">✓</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="bg-red-100 border-2 border-red-400 text-red-700 px-4 py-3 rounded-lg text-sm font-medium">
                ⚠️ {error}
              </div>
            )}

            <div className="pt-2 space-y-2">
              <button
                onClick={handleCreateLobby}
                className="w-full bg-lenka-red hover:bg-lenka-red/90 text-white font-bold py-4 px-6 rounded-lg transition duration-200 border-2 border-lenka-red shadow-lg hover:shadow-xl text-base"
              >
                🎮 Create & Join
              </button>
              <button
                onClick={() => {
                  setMode('menu');
                  setError('');
                }}
                className="w-full bg-white hover:bg-gray-50 text-lenka-dark font-semibold py-3 px-6 rounded-lg transition duration-200 border-2 border-lenka-mustard/30 hover:border-lenka-mustard text-sm"
              >
                ← Back
              </button>
            </div>
          </div>
        )}

        {/* Join Lobby Form */}
        {mode === 'join' && (
          <div className="space-y-5">
            <div>
              <label className="block text-lenka-dark font-semibold mb-2 text-sm">👤 Your Name</label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => {
                  setPlayerName(e.target.value);
                  setError('');
                }}
                placeholder="e.g. John"
                className="w-full px-4 py-3 border-2 border-lenka-mustard/30 rounded-lg focus:ring-2 focus:ring-lenka-mustard focus:border-lenka-mustard text-lenka-dark"
                maxLength={20}
              />
            </div>

            <div>
              <label className="block text-lenka-dark font-semibold mb-2 text-sm">🔑 Lobby Code</label>
              <input
                type="text"
                value={lobbyCode}
                onChange={(e) => {
                  setLobbyCode(e.target.value.toUpperCase());
                  setError('');
                }}
                placeholder="e.g. ABC123"
                className="w-full px-4 py-3 border-2 border-lenka-mustard/30 rounded-lg focus:ring-2 focus:ring-lenka-mustard focus:border-lenka-mustard uppercase text-lenka-dark text-center text-xl font-bold tracking-wider"
                maxLength={6}
              />
            </div>

            {error && (
              <div className="bg-red-100 border-2 border-red-400 text-red-700 px-4 py-3 rounded-lg text-sm font-medium">
                ⚠️ {error}
              </div>
            )}

            <div className="pt-2 space-y-2">
              <button
                onClick={handleJoinLobby}
                className="w-full bg-lenka-mustard hover:bg-lenka-mustard/90 text-lenka-dark font-bold py-4 px-6 rounded-lg transition duration-200 border-2 border-lenka-mustard shadow-lg hover:shadow-xl text-base"
              >
                🚪 Join Lobby
              </button>
              <button
                onClick={() => {
                  setMode('menu');
                  setError('');
                }}
                className="w-full bg-white hover:bg-gray-50 text-lenka-dark font-semibold py-3 px-6 rounded-lg transition duration-200 border-2 border-lenka-mustard/30 hover:border-lenka-mustard text-sm"
              >
                ← Back
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

