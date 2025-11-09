import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server } from 'socket.io';
import { gameManager } from './lib/gameManager';

const dev = process.env.NODE_ENV !== 'production';
const hostname = dev ? 'localhost' : '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
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
    socket.removeAllListeners('game:reset');

    // Create lobby
    socket.on('lobby:create', ({ roundsTotal, playerName }) => {
      console.log('📝 Creating lobby for player:', playerName, 'rounds:', roundsTotal);
      try {
        const lobby = gameManager.createLobby(roundsTotal, playerName, socket.id);
        socket.join(lobby.code);
        console.log('✅ Lobby created:', lobby.code);
        socket.emit('lobby:state', lobby);
        console.log('📤 Sent lobby state to client');
      } catch (error) {
        console.error('❌ Error creating lobby:', error);
        socket.emit('error', { message: 'Failed to create lobby' });
      }
    });

    // Join lobby
    socket.on('lobby:join', ({ code, playerName }) => {
      console.log('📝 Join lobby request:', code, 'player:', playerName);
      try {
        const result = gameManager.joinLobby(code, playerName, socket.id);
        
        if (!result) {
          console.log('❌ Lobby not found:', code);
          socket.emit('error', { message: 'Lobby not found or game already started' });
          return;
        }

        const { lobby, isReconnect, oldPlayerId } = result;
        socket.join(code);
        
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
      } catch (error) {
        console.error('❌ Error joining lobby:', error);
        socket.emit('error', { message: 'Failed to join lobby' });
      }
    });

    // Leave lobby
    socket.on('lobby:leave', ({ code }) => {
      console.log(`👋 Player ${socket.id} leaving lobby ${code}`);
      try {
        const { lobby, shouldDelete, newHostId } = gameManager.leaveLobby(code, socket.id);
        
        if (!shouldDelete && lobby) {
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

    // Start game
    socket.on('game:start', ({ code }) => {
      console.log('🎮 Received game:start request for lobby:', code);
      try {
        const lobby = gameManager.startGame(code);
        console.log('🎮 Game start result:', lobby ? 'Success' : 'Failed (null)');
        
        if (!lobby) {
          console.error('❌ Failed to start game - lobby not found or invalid state');
          socket.emit('error', { message: 'Failed to start game' });
          return;
        }
        
        console.log('✅ Game started successfully, current product:', lobby.currentProduct?.name);

        io.to(code).emit('game:started', {
          product: lobby.currentProduct,
          roundIndex: lobby.currentRoundIndex,
          totalRounds: lobby.roundsTotal
        });

        // Start countdown
        let timeLeft = 15;
        const countdown = setInterval(() => {
          timeLeft--;
          io.to(code).emit('round:update', { timeLeft });

          if (timeLeft <= 0 || gameManager.allPlayersGuessed(code)) {
            clearInterval(countdown);
            
            // Calculate results
            const results = gameManager.calculateRoundResults(code);
            if (results) {
              io.to(code).emit('round:results', results);

              // Move to next round after 5 seconds
              setTimeout(() => {
                const updatedLobby = gameManager.nextRound(code);
                
                if (updatedLobby && updatedLobby.status === 'finished') {
                  // Game ended - use the results we already calculated (includes final leaderboard)
                  console.log('🏁 Game finished! Final leaderboard:', results.leaderboard);
                  io.to(code).emit('game:ended', { 
                    finalLeaderboard: results.leaderboard
                  });
                } else if (updatedLobby && updatedLobby.currentProduct) {
                  // Next round
                  io.to(code).emit('game:started', {
                    product: updatedLobby.currentProduct,
                    roundIndex: updatedLobby.currentRoundIndex,
                    totalRounds: updatedLobby.roundsTotal
                  });

                  // Restart countdown for next round
                  startRoundCountdown(code);
                }
              }, 5000);
            }
          }
        }, 1000);

        // Helper function to start countdown (for recursive rounds)
        function startRoundCountdown(lobbyCode: string) {
          let time = 15;
          const timer = setInterval(() => {
            time--;
            io.to(lobbyCode).emit('round:update', { timeLeft: time });

            if (time <= 0 || gameManager.allPlayersGuessed(lobbyCode)) {
              clearInterval(timer);
              
              const results = gameManager.calculateRoundResults(lobbyCode);
              if (results) {
                io.to(lobbyCode).emit('round:results', results);

                setTimeout(() => {
                  const updatedLobby = gameManager.nextRound(lobbyCode);
                  
                  if (updatedLobby && updatedLobby.status === 'finished') {
                    // Game ended - use the results we already calculated
                    console.log('🏁 Game finished! Final leaderboard:', results.leaderboard);
                    io.to(lobbyCode).emit('game:ended', { 
                      finalLeaderboard: results.leaderboard
                    });
                  } else if (updatedLobby && updatedLobby.currentProduct) {
                    io.to(lobbyCode).emit('game:started', {
                      product: updatedLobby.currentProduct,
                      roundIndex: updatedLobby.currentRoundIndex,
                      totalRounds: updatedLobby.roundsTotal
                    });
                    startRoundCountdown(lobbyCode);
                  }
                }, 5000);
              }
            }
          }, 1000);
        }
      } catch (error) {
        socket.emit('error', { message: 'Failed to start game' });
      }
    });

    // Submit guess
    socket.on('guess:submit', ({ code, value }) => {
      try {
        gameManager.submitGuess(code, socket.id, value);
      } catch (error) {
        socket.emit('error', { message: 'Failed to submit guess' });
      }
    });

    // Play again
    socket.on('game:reset', ({ code }) => {
      try {
        const lobby = gameManager.resetGame(code);
        if (lobby) {
          io.to(code).emit('lobby:state', lobby);
        }
      } catch (error) {
        socket.emit('error', { message: 'Failed to reset game' });
      }
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log('❌ Client disconnected:', socket.id);
      
      // Find which lobby this player was in and clean up
      const playerLobby = gameManager.findPlayerLobby(socket.id);
      
      if (playerLobby) {
        const { code, lobby } = playerLobby;
        console.log(`🧹 Auto-cleanup: removing ${socket.id} from lobby ${code}`);
        
        const { lobby: updatedLobby, shouldDelete, newHostId } = gameManager.leaveLobby(code, socket.id);
        
        if (!shouldDelete && updatedLobby) {
          console.log(`📢 Broadcasting updated lobby after disconnect (${updatedLobby.players.length} players remaining)`);
          if (newHostId) {
            console.log(`👑 New host assigned: ${newHostId}`);
          }
          // Notify remaining players
          io.to(code).emit('lobby:state', updatedLobby);
        } else if (shouldDelete) {
          console.log(`🗑️ Lobby ${code} was deleted (no players left)`);
        }
      }
    });
  });

  httpServer
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });
});

