import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server } from 'socket.io';
import { gameManager } from './lib/gameManager';
import { getPrometheusMetrics, metricsContentType } from './lib/promMetrics';

// Allow self-signed certificates in development (for KuantoKusta API)
if (process.env.NODE_ENV !== 'production') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  console.log('⚠️  DEV MODE: SSL certificate validation disabled');
}

const dev = process.env.NODE_ENV !== 'production';
const hostname = dev ? 'localhost' : '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Track active timers per lobby to clean them up when needed
const activeTimers = new Map<string, NodeJS.Timeout[]>();
const pendingDisconnects = new Map<string, NodeJS.Timeout>();
const RECONNECT_GRACE_MS = 2 * 60 * 1000; // 2 minutes

function addTimer(lobbyCode: string, timer: NodeJS.Timeout) {
  if (!activeTimers.has(lobbyCode)) {
    activeTimers.set(lobbyCode, []);
  }
  activeTimers.get(lobbyCode)!.push(timer);
}

function clearAllTimers(lobbyCode: string) {
  const timers = activeTimers.get(lobbyCode);
  if (timers) {
    console.log(`🧹 Clearing ${timers.length} active timers for lobby ${lobbyCode}`);
    timers.forEach(timer => clearInterval(timer));
    activeTimers.delete(lobbyCode);
  }
}

function clearPendingDisconnect(clientId: string): boolean {
  const pending = pendingDisconnects.get(clientId);
  if (!pending) {
    return false;
  }
  clearTimeout(pending);
  pendingDisconnects.delete(clientId);
  return true;
}

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      if (req.url?.startsWith('/metrics')) {
        const metrics = await getPrometheusMetrics();
        res.statusCode = 200;
        res.setHeader('Content-Type', metricsContentType);
        res.setHeader('Cache-Control', 'no-store');
        res.end(metrics);
        return;
      }

      const parsedUrl = parse(req.url!, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  // Socket.IO event handlers
  io.on('connection', (socket) => {
    console.log('✅ Client connected:', socket.id);

    // Remove all previous listeners to prevent duplicates
    socket.removeAllListeners('lobby:create');
    socket.removeAllListeners('lobby:join');
    socket.removeAllListeners('lobby:leave');
    socket.removeAllListeners('game:start');
    socket.removeAllListeners('guess:submit');
    socket.removeAllListeners('player:ready');
    socket.removeAllListeners('game:reset');

    // Create lobby
    socket.on('lobby:create', ({ roundsTotal, playerName, productSource, clientId }) => {
      console.log('📝 Creating lobby for player:', playerName, 'rounds:', roundsTotal, 'source:', productSource || 'mixed');
      try {
        const lobby = gameManager.createLobby(roundsTotal, playerName, socket.id, productSource || 'mixed', clientId);
        socket.join(lobby.code);
        console.log('✅ Lobby created:', lobby.code);
        socket.emit('lobby:state', lobby);
        console.log('📤 Sent lobby state to client');
      } catch (error) {
        console.error('❌ Error creating lobby:', error);
        socket.emit('error', { message: 'Failed to create lobby' });
      }
    });

    socket.on('player:kick', ({ code, targetPlayerId }) => {
      try {
        const lobby = gameManager.getLobbyState(code);
        if (!lobby) {
          socket.emit('error', { message: 'Lobby not found' });
          return;
        }

        if (lobby.hostId !== socket.id) {
          socket.emit('error', { message: 'Only the host can kick players' });
          return;
        }

        if (targetPlayerId === socket.id) {
          socket.emit('error', { message: 'Cannot kick yourself' });
          return;
        }

        const targetPlayer = lobby.players.find(player => player.id === targetPlayerId);
        if (!targetPlayer) {
          socket.emit('error', { message: 'Player not found' });
          return;
        }

        clearPendingDisconnect(targetPlayer.clientId);
        const targetSocket = io.sockets.sockets.get(targetPlayerId);
        if (targetSocket) {
          targetSocket.leave(code);
          targetSocket.emit('player:kicked', { code });
        }

        const { lobby: updatedLobby, shouldDelete, newHostId } = gameManager.leaveLobby(code, targetPlayerId);

        if (shouldDelete) {
          clearAllTimers(code);
        } else if (updatedLobby) {
          if (newHostId) {
            console.log(`👑 New host after kick: ${newHostId}`);
          }
          io.to(code).emit('lobby:state', updatedLobby);
        }
      } catch (error) {
        console.error('❌ Kick player error:', error);
        socket.emit('error', { message: 'Failed to kick player' });
      }
    });

    socket.on('lobby:update-settings', ({ code, roundsTotal, productSource }) => {
      try {
        const lobby = gameManager.getLobbyState(code);
        if (!lobby) {
          socket.emit('error', { message: 'Lobby not found' });
          return;
        }

        if (lobby.hostId !== socket.id) {
          socket.emit('error', { message: 'Only the host can update settings' });
          return;
        }

        const updated = gameManager.updateLobbySettings(code, roundsTotal, productSource);
        if (updated) {
          io.to(code).emit('lobby:state', updated);
        }
      } catch (error) {
        console.error('❌ Lobby settings update error:', error);
        socket.emit('error', { message: 'Failed to update lobby settings' });
      }
    });

    // Join lobby
    socket.on('lobby:join', ({ code, playerName, clientId }) => {
      console.log('📝 Join lobby request:', code, 'player:', playerName);
      try {
        const result = gameManager.joinLobby(code, playerName, socket.id, clientId);
        
        if (!result) {
          console.log('❌ Lobby not found:', code);
          socket.emit('error', { message: 'Lobby not found or game already started' });
          return;
        }

        const { lobby, isReconnect, oldPlayerId } = result;
        socket.join(code);

        const rejoinedPlayer = lobby.players.find(p => p.id === socket.id);
        if (rejoinedPlayer && clearPendingDisconnect(rejoinedPlayer.clientId)) {
          console.log(`🔃 Cleared disconnect timeout for ${rejoinedPlayer.name}`);
        }
        
        if (isReconnect) {
          console.log(`🔄 Player reconnected: ${playerName} (new socket: ${socket.id})`);
          // Send updated state to everyone (so they see the player is back with new socket ID)
          io.to(code).emit('lobby:state', lobby);
        } else {
          console.log('✅ Player joined lobby:', code);
          socket.emit('lobby:state', lobby);
          
          // Notify others about new player
          socket.to(code).emit('lobby:state', lobby);
        }

        if (lobby.status === 'playing' && lobby.currentProduct) {
          socket.emit('game:started', {
            product: lobby.currentProduct,
            roundIndex: lobby.currentRoundIndex,
            totalRounds: lobby.roundsTotal
          });
        }
      } catch (error) {
        console.error('❌ Error joining lobby:', error);
        socket.emit('error', { message: 'Failed to join lobby' });
      }
    });

    // Leave lobby
    socket.on('lobby:leave', ({ code }) => {
      console.log(`👋 Player ${socket.id} leaving lobby ${code}`);
      try {
        const currentLobby = gameManager.getLobbyState(code);
        const leavingPlayer = currentLobby?.players.find(player => player.id === socket.id);
        if (leavingPlayer) {
          clearPendingDisconnect(leavingPlayer.clientId);
        }

        const { lobby, shouldDelete, newHostId } = gameManager.leaveLobby(code, socket.id);
        
        if (shouldDelete) {
          // Lobby is empty, clean up all timers
          clearAllTimers(code);
        } else if (lobby) {
          console.log(`📢 Broadcasting updated lobby state (${lobby.players.length} players remaining)`);
          if (newHostId) {
            console.log(`👑 New host: ${newHostId}`);
          }
          // Broadcast updated state to everyone in the lobby
          io.to(code).emit('lobby:state', lobby);
        }
        
        socket.leave(code);
      } catch (error) {
        console.error('Leave lobby error:', error);
      }
    });

    // NEW: Start game with products from client (PRIMARY METHOD - bypasses 403)
    socket.on('game:start-with-products', async ({ code, products }) => {
      console.log('🎮 [CLIENT] Received game:start-with-products for lobby:', code);
      try {
        // Step 1: Set loading state
        const loadingLobby = gameManager.startGame(code);
        
        if (!loadingLobby) {
          console.error('❌ Failed to start game - lobby not found or invalid state');
          socket.emit('error', { message: 'Failed to start game' });
          return;
        }
        
        console.log('✅ [CLIENT] Game entering loading state with client products...');
        
        // Step 2: Start game with client products (includes validation)
        const lobby = gameManager.startGameWithClientProducts(code, products);
        
        if (!lobby) {
          console.error('❌ [CLIENT] Failed to start game with client products - validation failed');
          socket.emit('error', { message: 'Invalid products received from client' });
          return;
        }
        
        console.log('✅ [CLIENT] Game started successfully with product:', lobby.currentProduct?.name);

        io.to(code).emit('game:started', {
          product: lobby.currentProduct,
          roundIndex: lobby.currentRoundIndex,
          totalRounds: lobby.roundsTotal
        });

        // Start countdown (30 seconds = double)
        let timeLeft = 30;
        const countdown = setInterval(() => {
          timeLeft--;
          io.to(code).emit('round:update', { timeLeft });

          if (timeLeft <= 0 || gameManager.allPlayersGuessed(code)) {
            clearInterval(countdown);
            
            // Calculate results
            const results = gameManager.calculateRoundResults(code);
            if (results) {
              io.to(code).emit('round:results', results);

              // Wait for all players to be ready (or 120s timeout)
              waitForPlayersReady(code, results);
            }
          }
        }, 1000);
        addTimer(code, countdown);

        // Helper function to wait for all players to be ready
        function waitForPlayersReady(lobbyCode: string, results: any) {
          let readyTimeout = 120; // 2 minutes timeout
          const readyTimer = setInterval(() => {
            readyTimeout--;
            io.to(lobbyCode).emit('ready:timeout', { timeLeft: readyTimeout });

            // Check if all players are ready or timeout reached
            if (gameManager.allPlayersReady(lobbyCode) || readyTimeout <= 0) {
              clearInterval(readyTimer);
              
              if (readyTimeout <= 0) {
                console.log('⏰ Ready timeout reached, advancing to next round');
              }

              const updatedLobby = gameManager.nextRound(lobbyCode);

              if (updatedLobby && updatedLobby.status === 'finished') {
                // Game ended - CLEAR ALL TIMERS
                console.log('🏁 Game finished! Clearing all timers...');
                clearAllTimers(lobbyCode);
                io.to(lobbyCode).emit('game:ended', { 
                  finalLeaderboard: results.leaderboard
                });
              } else if (updatedLobby && updatedLobby.currentProduct) {
                // Next round
                io.to(lobbyCode).emit('game:started', {
                  product: updatedLobby.currentProduct,
                  roundIndex: updatedLobby.currentRoundIndex,
                  totalRounds: updatedLobby.roundsTotal
                });

                startRoundCountdown(lobbyCode);
              }
            }
          }, 1000);
          addTimer(lobbyCode, readyTimer);
        }

        function startRoundCountdown(lobbyCode: string) {
          let time = 30;
          const timer = setInterval(() => {
            time--;
            io.to(lobbyCode).emit('round:update', { timeLeft: time });

            if (time <= 0 || gameManager.allPlayersGuessed(lobbyCode)) {
              clearInterval(timer);
              
              const results = gameManager.calculateRoundResults(lobbyCode);
              if (results) {
                io.to(lobbyCode).emit('round:results', results);
                
                // Wait for players to be ready
                waitForPlayersReady(lobbyCode, results);
              }
            }
          }, 1000);
          addTimer(lobbyCode, timer);
        }
      } catch (error) {
        console.error('❌ [CLIENT] Error starting game with client products:', error);
        socket.emit('error', { message: 'Failed to start game' });
      }
    });

    // BACKUP: Start game with server-side API fetch (fallback if client fails)
    socket.on('game:start', async ({ code }) => {
      console.log('🎮 [SERVER BACKUP] Received game:start request for lobby:', code);
      try {
        // Step 1: Set loading state
        const loadingLobby = gameManager.startGame(code);
        
        if (!loadingLobby) {
          console.error('❌ Failed to start game - lobby not found or invalid state');
          socket.emit('error', { message: 'Failed to start game' });
          return;
        }
        
        console.log('⏳ [SERVER BACKUP] Game entering loading state...');
        
        // Notify clients that we're loading products
        io.to(code).emit('game:loading', {
          message: 'A buscar produtos da API do KuantoKusta...',
          totalRounds: loadingLobby.roundsTotal
        });
        
        // Step 2: Fetch products asynchronously (APENAS KuantoKusta API)
        let lobby;
        try {
          lobby = await gameManager.fetchProductsAndStart(code);
          
          if (!lobby) {
            throw new Error('Failed to fetch products from KuantoKusta API');
          }
        } catch (error: any) {
          console.error('❌ KuantoKusta API failed:', error);
          io.to(code).emit('error', { 
            message: 'Falha ao buscar produtos da API. Por favor tenta novamente.' 
          });
          return;
        }
        
        console.log('✅ Game started successfully with product:', lobby.currentProduct?.name);

        io.to(code).emit('game:started', {
          product: lobby.currentProduct,
          roundIndex: lobby.currentRoundIndex,
          totalRounds: lobby.roundsTotal
        });

        // Start countdown (30 seconds = double)
        let timeLeft = 30;
        const countdown = setInterval(() => {
          timeLeft--;
          io.to(code).emit('round:update', { timeLeft });

          if (timeLeft <= 0 || gameManager.allPlayersGuessed(code)) {
            clearInterval(countdown);
            
            // Calculate results
            const results = gameManager.calculateRoundResults(code);
            if (results) {
              io.to(code).emit('round:results', results);

              // Wait for all players to be ready (or 120s timeout)
              waitForPlayersReady(code, results);
            }
          }
        }, 1000);
        addTimer(code, countdown);

        // Helper function to wait for all players to be ready
        function waitForPlayersReady(lobbyCode: string, results: any) {
          let readyTimeout = 120; // 2 minutes timeout
          const readyTimer = setInterval(() => {
            readyTimeout--;
            io.to(lobbyCode).emit('ready:timeout', { timeLeft: readyTimeout });

            // Check if all players are ready or timeout reached
            if (gameManager.allPlayersReady(lobbyCode) || readyTimeout <= 0) {
              clearInterval(readyTimer);
              
              if (readyTimeout <= 0) {
                console.log('⏰ Ready timeout reached, forcing next round');
              } else {
                console.log('✅ All players ready, moving to next round');
              }

              const updatedLobby = gameManager.nextRound(lobbyCode);
              
              if (updatedLobby && updatedLobby.status === 'finished') {
                // Game ended - CLEAR ALL TIMERS
                console.log('🏁 Game finished! Clearing all timers...');
                clearAllTimers(lobbyCode);
                io.to(lobbyCode).emit('game:ended', { 
                  finalLeaderboard: results.leaderboard
                });
              } else if (updatedLobby && updatedLobby.currentProduct) {
                // Next round
                io.to(lobbyCode).emit('game:started', {
                  product: updatedLobby.currentProduct,
                  roundIndex: updatedLobby.currentRoundIndex,
                  totalRounds: updatedLobby.roundsTotal
                });

                // Restart countdown for next round
                startRoundCountdown(lobbyCode);
              }
            }
          }, 1000);
          addTimer(lobbyCode, readyTimer);
        }

        // Helper function to start countdown (for recursive rounds)
        function startRoundCountdown(lobbyCode: string) {
          let time = 30; // 30 seconds (double)
          const timer = setInterval(() => {
            time--;
            io.to(lobbyCode).emit('round:update', { timeLeft: time });

            if (time <= 0 || gameManager.allPlayersGuessed(lobbyCode)) {
              clearInterval(timer);
              
              const results = gameManager.calculateRoundResults(lobbyCode);
              if (results) {
                io.to(lobbyCode).emit('round:results', results);
                
                // Wait for players to be ready
                waitForPlayersReady(lobbyCode, results);
              }
            }
          }, 1000);
          addTimer(lobbyCode, timer);
        }
      } catch (error) {
        socket.emit('error', { message: 'Failed to start game' });
      }
    });

    // Submit guess
    socket.on('guess:submit', ({ code, value }) => {
      try {
        const lobby = gameManager.submitGuess(code, socket.id, value);
        if (lobby) {
          io.to(code).emit('lobby:state', lobby);
        }
      } catch (error) {
        socket.emit('error', { message: 'Failed to submit guess' });
      }
    });

    // Player ready for next round
    socket.on('player:ready', ({ code }) => {
      console.log(`✅ Player ${socket.id} marked ready in lobby ${code}`);
      try {
        const lobby = gameManager.setPlayerReady(code, socket.id, true);
        if (lobby) {
          // Broadcast updated ready state to all players
          io.to(code).emit('lobby:state', lobby);
        }
      } catch (error) {
        socket.emit('error', { message: 'Failed to mark ready' });
      }
    });

    // Play again
    socket.on('game:reset', ({ code }) => {
      console.log('🔄 Game reset requested for lobby:', code);
      try {
        // Clear all timers from previous game
        clearAllTimers(code);
        
        const lobby = gameManager.resetGame(code);
        if (lobby) {
          console.log(`✅ Lobby ${code} reset to waiting state with ${lobby.players.length} players`);
          io.to(code).emit('lobby:state', lobby);
          console.log('📤 Sent fresh lobby:state to all clients');
        } else {
          console.error(`❌ Failed to reset lobby ${code} - lobby not found`);
        }
      } catch (error) {
        console.error('❌ Error resetting game:', error);
        socket.emit('error', { message: 'Failed to reset game' });
      }
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log('❌ Client disconnected:', socket.id);
      
      const playerLobby = gameManager.findPlayerLobby(socket.id);
      if (!playerLobby) {
        return;
      }

      const { code, lobby } = playerLobby;
      const player = lobby.players.find(p => p.id === socket.id);
      if (!player) {
        return;
      }

      player.isConnected = false;
      io.to(code).emit('lobby:state', lobby);

      clearPendingDisconnect(player.clientId);

      const disconnectedPlayerId = player.id;
      console.log(`⏳ Player ${player.name} disconnected, waiting ${RECONNECT_GRACE_MS / 1000}s before removal`);
      const timeout = setTimeout(() => {
        console.log(`🧹 Removing ${player.name} from lobby ${code} after timeout`);
        const { lobby: updatedLobby, shouldDelete, newHostId } = gameManager.leaveLobby(code, disconnectedPlayerId);
        pendingDisconnects.delete(player.clientId);

        if (shouldDelete) {
          console.log(`🗑️ Lobby ${code} was deleted (no players left)`);
          clearAllTimers(code);
        } else if (updatedLobby) {
          console.log(`📢 Broadcasting updated lobby after disconnect timeout (${updatedLobby.players.length} players remaining)`);
          if (newHostId) {
            console.log(`👑 New host assigned: ${newHostId}`);
          }
          io.to(code).emit('lobby:state', updatedLobby);
        }
      }, RECONNECT_GRACE_MS);

      pendingDisconnects.set(player.clientId, timeout);
    });
  });

  setInterval(() => {
    const expiredLobbies = gameManager.cleanupOldLobbies();
    expiredLobbies.forEach(({ code, playerClientIds }) => {
      console.log(`🧹 Auto-cleaning idle lobby ${code}`);
      clearAllTimers(code);
      playerClientIds.forEach(clearPendingDisconnect);
    });
  }, 10 * 60 * 1000);

  httpServer
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });
});
