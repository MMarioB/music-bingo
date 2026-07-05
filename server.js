import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { readFileSync, writeFileSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';
import { pathToFileURL } from 'url';
dotenv.config();

const DEBUG = process.env.NODE_ENV !== 'production';

// === Límites y tiempos de la partida ===
const ORPHAN_TIMEOUT = 30000; // 30 segundos para que el host se reconecte
const PLAYER_GRACE_PERIOD = 120000; // 2 minutos para que un jugador se reconecte sin perder su sitio
const ROOM_TTL = 28800000; // 8 horas de vida máxima por sala
const SWEEP_INTERVAL = 30000; // Barrido de limpieza cada 30s
const SNAPSHOT_MAX_AGE = 600000; // Solo restaurar snapshots de menos de 10 minutos
const MAX_ROOMS = parseInt(process.env.MAX_ROOMS, 10) || 500;
const MAX_PLAYERS_PER_ROOM = parseInt(process.env.MAX_PLAYERS_PER_ROOM, 10) || 30;
// Un bingo (línea de 5) requiere haber acertado al menos 5 rondas
const MIN_CORRECT_ROUNDS_FOR_BINGO = 5;

const VALID_DIFFICULTIES = ['principiante', 'experto'];
const ROOM_CODE_REGEX = /^[A-Z0-9]{4,10}$/;

// === Validación de entrada ===
const normalizeRoomCode = (roomCode) => {
  if (typeof roomCode !== 'string') return null;
  const code = roomCode.trim().toUpperCase();
  return ROOM_CODE_REGEX.test(code) ? code : null;
};

const sanitizeName = (name) => {
  if (typeof name !== 'string') return null;
  const clean = name.trim().slice(0, 24);
  return clean.length > 0 ? clean : null;
};

const sanitizeTrack = (track) => {
  if (!track || typeof track !== 'object') return null;
  const str = (v) => (typeof v === 'string' ? v.slice(0, 500) : null);
  return {
    uri: str(track.uri),
    title: str(track.title),
    artist: str(track.artist),
    year: Number.isFinite(track.year) ? track.year : null,
    musicCategory: str(track.musicCategory),
    spotifyUrl: str(track.spotifyUrl),
    previewUrl: str(track.previewUrl),
    albumImage: str(track.albumImage),
    albumName: str(track.albumName),
  };
};

const sanitizeCategory = (category) => {
  if (!category || typeof category !== 'object') return null;
  if (typeof category.name !== 'string' || !category.name.trim()) return null;
  try {
    if (JSON.stringify(category).length > 2000) return null;
  } catch {
    return null;
  }
  return category;
};

// Los clientes pueden emitir eventos sin callback (por error o malicia):
// nunca asumir que callback es una función o el handler tira el proceso.
const safeCallback = (callback) =>
  typeof callback === 'function' ? callback : () => {};

const generateRoomCode = () =>
  Math.random().toString(36).substring(2, 7).toUpperCase();

const generateHostToken = () =>
  Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);

export function createGameServer({ snapshotPath = null } = {}) {
  const app = express();
  const allowedOrigins = [
    'https://www.discohitsbingo.com',
    'https://music-bingo-swart.vercel.app',
    'http://localhost:5173',
    process.env.FRONTEND_URL
  ].filter(Boolean);

  const corsOriginCheck = (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  };

  app.use(cors({
    origin: corsOriginCheck,
    methods: ['GET', 'POST'],
    credentials: true
  }));

  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: corsOriginCheck,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    // Los payloads del juego son pequeños (tracks, predicciones);
    // limitar el buffer evita que un cliente envíe payloads gigantes
    maxHttpBufferSize: 65536,
  });

  const gameRooms = new Map();
  // Mapeo socket.id -> roomCode para O(1) lookup en disconnect
  const socketToRoom = new Map();
  // Salas "huérfanas" temporalmente (host desconectado)
  const orphanedRooms = new Map();
  const startedAt = Date.now();

  // === Persistencia de estado para sobrevivir redeploys de Railway ===
  const saveSnapshot = () => {
    if (!snapshotPath) return;
    const rooms = [];
    for (const [code, room] of gameRooms.entries()) rooms.push([code, room]);
    for (const [code, room] of orphanedRooms.entries()) {
      if (!gameRooms.has(code)) rooms.push([code, room]);
    }
    writeFileSync(snapshotPath, JSON.stringify({ savedAt: Date.now(), rooms }));
  };

  const restoreSnapshot = () => {
    if (!snapshotPath || !existsSync(snapshotPath)) return;
    try {
      const { savedAt, rooms } = JSON.parse(readFileSync(snapshotPath, 'utf8'));
      unlinkSync(snapshotPath);
      if (!savedAt || Date.now() - savedAt > SNAPSHOT_MAX_AGE || !Array.isArray(rooms)) return;

      for (const [code, room] of rooms) {
        room.createdAt = new Date(room.createdAt);
        delete room.orphanedAt;
        // Todos los socket.id del snapshot son inválidos tras el reinicio:
        // marcar a todos como desconectados y dejar que reclamen su sitio
        // por nombre (jugadores) o vía isHost+reconnecting (host).
        room.players.forEach(p => {
          p.connected = false;
          p.disconnectedAt = Date.now();
        });
        gameRooms.set(code, room);
      }
      console.log(`Estado restaurado desde snapshot: ${rooms.length} sala(s).`);
    } catch (error) {
      console.error('No se pudo restaurar el snapshot:', error.message);
    }
  };

  restoreSnapshot();

  // Rotación automática de controlador entre jugadores CONECTADOS
  const rotateController = (room) => {
    const eligible = room.players.filter(p => p.connected !== false);
    if (eligible.length === 0) {
      room.currentControllerId = null;
      room.currentControllerName = null;
      return;
    }
    const currentIdx = eligible.findIndex(p => p.id === room.currentControllerId);
    const next = eligible[(currentIdx + 1) % eligible.length];
    room.currentControllerId = next.id;
    room.currentControllerName = next.name;
    if (DEBUG) console.log(`[DEBUG] Controller rotado a: ${next.name} (${next.id})`);
  };

  const emitGameState = (roomCode) => {
    const room = gameRooms.get(roomCode);
    if (!room) return;

    const gameState = {
      gameStep: room.phase,
      connectedPlayers: room.players,
      currentCard: room.currentCard,
      currentCategory: room.currentCategory,
      currentSong: room.currentCard,
      isMarkingEnabled: room.isMarkingEnabled,
      songPlaying: room.songPlaying,
      playerCorrectStatus: room.players.reduce((acc, player) => {
        acc[player.id] = !!player.isCorrect;
        return acc;
      }, {}),
      winners: room.winners,
      gameOver: room.gameOver,
      difficulty: room.config?.difficulty || 'principiante',
      currentControllerId: room.currentControllerId,
      currentControllerName: room.currentControllerName,
    };

    io.to(roomCode).emit('gameStateUpdate', gameState);
  };

  // Elimina definitivamente a un jugador de la sala
  const removePlayer = (room, playerId) => {
    const playerIndex = room.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) return false;
    if (room.currentControllerId === playerId) {
      rotateController(room);
      if (room.currentControllerId === playerId) {
        // Era el único elegible
        room.currentControllerId = null;
        room.currentControllerName = null;
      }
    }
    room.players.splice(playerIndex, 1);
    return true;
  };

  io.on('connection', (socket) => {
    if (DEBUG) console.log('Cliente conectado:', socket.id);

    // PATRÓN UNIFICADO: Solo usar callbacks, NO eventos separados
    socket.on('createRoom', (config, callback) => {
      const cb = safeCallback(callback);
      try {
        if (!config || typeof config !== 'object') config = {};

        if (gameRooms.size + orphanedRooms.size >= MAX_ROOMS) {
          cb({ error: 'El servidor está lleno. Inténtalo más tarde.' });
          return;
        }

        let roomCode;
        if (config.roomCode !== undefined) {
          roomCode = normalizeRoomCode(config.roomCode);
          if (!roomCode) {
            cb({ error: 'Código de sala no válido' });
            return;
          }
          // SEGURIDAD: nunca sobreescribir una sala existente (permitiría
          // a cualquiera secuestrar una partida en curso adivinando el código)
          if (gameRooms.has(roomCode) || orphanedRooms.has(roomCode)) {
            cb({ error: 'Ya existe una sala con ese código' });
            return;
          }
        } else {
          do {
            roomCode = generateRoomCode();
          } while (gameRooms.has(roomCode) || orphanedRooms.has(roomCode));
        }

        const difficulty = VALID_DIFFICULTIES.includes(config.difficulty)
          ? config.difficulty
          : 'principiante';
        // Solo persistir campos conocidos del config (nada de payloads arbitrarios)
        config = { roomCode, difficulty };

        const hostPlayer = {
          id: socket.id,
          name: 'Game Master',
          isHost: true,
          ready: true,
          isCorrect: false,
          correctRounds: 0,
          connected: true,
        };
        // Secreto que solo conoce el host: se exige para reclamar el rol
        // de anfitrión desde otro socket (evita el secuestro de salas)
        const hostToken = generateHostToken();

        gameRooms.set(roomCode, {
          hostId: socket.id,
          hostToken,
          players: [hostPlayer],
          config,
          phase: 'waiting',
          currentCard: null,
          currentCategory: null,
          isMarkingEnabled: false,
          songPlaying: false,
          winners: [],
          gameOver: false,
          createdAt: new Date(),
          currentControllerId: null,
          currentControllerName: null,
        });
        socket.join(roomCode);
        socketToRoom.set(socket.id, roomCode);

        cb({ roomCode, hostToken, players: [hostPlayer], config: gameRooms.get(roomCode).config });
      } catch (error) {
        console.error('Error creating room:', error);
        cb({ error: error.message });
      }
    });

    socket.on('joinRoom', (data, callback) => {
      const cb = safeCallback(callback);
      try {
        const { name, isHost, reconnecting, hostToken } = data || {};
        const roomCode = normalizeRoomCode(data?.roomCode);
        if (!roomCode) {
          cb({ error: 'Código de sala no válido' });
          return;
        }

        // SEGURIDAD: reclamar el rol de host desde otro socket requiere el
        // hostToken; sin token solo se acepta si el host real está
        // desconectado (compatibilidad con clientes que aún no lo envían)
        const canClaimHost = (targetRoom) => {
          if (socket.id === targetRoom.hostId) return true;
          if (hostToken) return hostToken === targetRoom.hostToken;
          const hostPlayer = targetRoom.players.find(p => p.isHost);
          return !hostPlayer || hostPlayer.connected === false;
        };

        let room = gameRooms.get(roomCode);

        // Si no existe en activas, buscar en huérfanas (host reconectándose)
        if (!room && isHost && reconnecting) {
          const orphanedRoom = orphanedRooms.get(roomCode);
          if (orphanedRoom && canClaimHost(orphanedRoom)) {
            if (DEBUG) console.log(`🔄 Restaurando sala huérfana ${roomCode} para host ${socket.id}`);

            room = { ...orphanedRoom };
            delete room.orphanedAt;
            room.hostId = socket.id;

            gameRooms.set(roomCode, room);
            orphanedRooms.delete(roomCode);

            socket.to(roomCode).emit('hostReconnected', {
              message: 'El anfitrión se ha reconectado'
            });
          }
        }

        if (!room) {
          cb({ error: 'Sala no encontrada' });
          return;
        }

        if (isHost && reconnecting) {
          if (!canClaimHost(room)) {
            if (DEBUG) console.log(`[DEBUG] joinRoom - Intento de reclamar host rechazado en ${roomCode} (socket ${socket.id})`);
            cb({ error: 'No autorizado: ya hay un anfitrión en la sala' });
            return;
          }
          // Host reconectándose: actualizar hostId y su entrada de jugador
          if (DEBUG) console.log(`[DEBUG] Host reconectándose: ${socket.id} para sala ${roomCode}. Anterior hostId: ${room.hostId}`);
          const previousHostId = room.hostId;
          room.hostId = socket.id;

          const hostPlayer = room.players.find(p => p.isHost);
          if (hostPlayer) {
            if (room.currentControllerId === hostPlayer.id) {
              room.currentControllerId = socket.id;
            }
            hostPlayer.id = socket.id;
            hostPlayer.connected = true;
            delete hostPlayer.disconnectedAt;
          } else {
            room.players.unshift({
              id: socket.id,
              name: sanitizeName(name) || 'Game Master',
              isHost: true,
              ready: true,
              isCorrect: false,
              correctRounds: 0,
              connected: true,
            });
          }
          if (room.currentControllerId === previousHostId) {
            room.currentControllerId = socket.id;
          }
        } else {
          const existingPlayer = room.players.find(p => p.id === socket.id);
          if (!existingPlayer && !isHost) {
            const playerName = sanitizeName(name);
            if (!playerName) {
              cb({ error: 'Nombre no válido' });
              return;
            }

            const sameName = room.players.find(
              p => p.name.toLowerCase() === playerName.toLowerCase()
            );

            // Una caída brusca de red puede tardar hasta pingTimeout en
            // detectarse: si el socket antiguo ya no existe, o el cliente
            // indica que está reconectando, se puede reclamar el sitio
            const oldSocket = sameName ? io.sockets.sockets.get(sameName.id) : null;

            if (sameName && sameName.connected !== false && oldSocket && !reconnecting) {
              // El cliente identifica a cada jugador por nombre: dos jugadores
              // con el mismo nombre rompen el marcado y las predicciones
              cb({ error: 'Ese nombre ya está en uso en la sala' });
              return;
            }

            if (sameName) {
              // Reconexión: reclamar el sitio del jugador (conservando
              // aciertos, estado de ready y rol de controlador)
              if (DEBUG) console.log(`🔄 ${playerName} reclama su sitio en ${roomCode} (${sameName.id} -> ${socket.id})`);
              if (room.currentControllerId === sameName.id) {
                room.currentControllerId = socket.id;
              }
              socketToRoom.delete(sameName.id);
              sameName.id = socket.id;
              sameName.connected = true;
              delete sameName.disconnectedAt;
              // Expulsar la sesión antigua si sigue viva (zombie)
              if (oldSocket) oldSocket.disconnect(true);
            } else {
              if (room.players.length >= MAX_PLAYERS_PER_ROOM) {
                cb({ error: 'La sala está llena' });
                return;
              }
              room.players.push({
                id: socket.id,
                name: playerName,
                isHost: false,
                ready: false,
                isCorrect: false,
                correctRounds: 0,
                connected: true,
              });
            }
          }
        }

        socket.join(roomCode);
        socketToRoom.set(socket.id, roomCode);

        cb({
          roomCode,
          players: room.players,
          config: room.config,
          difficulty: room.config?.difficulty || 'principiante',
          gameStep: room.phase
        });
        emitGameState(roomCode);

      } catch (error) {
        console.error('Error joining room:', error);
        cb({ error: error.message });
      }
    });

    socket.on('playerReady', (data) => {
      try {
        const roomCode = normalizeRoomCode(data?.roomCode);
        const room = gameRooms.get(roomCode);
        if (!room) return;

        const player = room.players.find(p => p.id === socket.id);
        if (player) {
          player.ready = true;
          emitGameState(roomCode);
        }
      } catch (error) {
        console.error('Error setting player ready:', error);
      }
    });

    socket.on('startGame', (data) => {
      try {
        const roomCode = normalizeRoomCode(data?.roomCode);
        const room = gameRooms.get(roomCode);
        if (!room || room.hostId !== socket.id) return;

        const allPlayersReady = room.players.every(p => p.ready);
        if (!allPlayersReady) return;

        room.phase = 'wheel';
        if (VALID_DIFFICULTIES.includes(data?.difficulty)) {
          room.config.difficulty = data.difficulty;
        }
        // Asignar primer controlador al iniciar el juego
        rotateController(room);
        emitGameState(roomCode);
      } catch (error) {
        console.error('Error starting game:', error);
      }
    });

    socket.on('selectCategory', (data, callback) => {
      const cb = safeCallback(callback);
      try {
        const roomCode = normalizeRoomCode(data?.roomCode);
        const room = gameRooms.get(roomCode);
        if (!room || room.hostId !== socket.id) {
          cb({ error: 'No autorizado' });
          return;
        }

        const category = sanitizeCategory(data?.category);
        if (!category) {
          cb({ error: 'Categoría no válida' });
          return;
        }

        room.phase = 'card';
        room.currentCategory = category;
        room.isMarkingEnabled = false;
        room.songPlaying = false;
        room.currentCard = null;
        room.players.forEach(p => p.isCorrect = false);

        cb({ success: true });
        emitGameState(roomCode);
      } catch (error) {
        console.error('Error selecting category:', error);
        cb({ error: error.message });
      }
    });

    socket.on('startSong', (data, callback) => {
      const cb = safeCallback(callback);
      try {
        const roomCode = normalizeRoomCode(data?.roomCode);
        const room = gameRooms.get(roomCode);
        if (!room || room.hostId !== socket.id) {
          cb({ error: 'No autorizado' });
          return;
        }

        const track = sanitizeTrack(data?.track);
        if (!track) {
          cb({ error: 'Canción no válida' });
          return;
        }

        room.phase = 'playing';
        room.songPlaying = true;
        room.currentCard = { ...track, revealed: false };
        room.isMarkingEnabled = false;
        room.players.forEach(p => p.isCorrect = false);

        cb({ success: true });
        emitGameState(roomCode);
      } catch (error) {
        console.error('Error starting song:', error);
        cb({ error: error.message });
      }
    });

    socket.on('submitPrediction', (data) => {
      try {
        const roomCode = normalizeRoomCode(data?.roomCode);
        const room = gameRooms.get(roomCode);
        if (!room) return;

        const player = room.players.find(p => p.id === socket.id);
        if (!player) return;

        if (typeof data?.prediction !== 'string' || !data.prediction.trim()) return;
        const prediction = data.prediction.trim().slice(0, 200);

        const predictionData = { playerName: player.name, prediction };

        // Enviar al host siempre
        io.to(room.hostId).emit('playerPrediction', predictionData);

        // Enviar también al controlador actual si es distinto del host
        if (room.currentControllerId && room.currentControllerId !== room.hostId) {
          io.to(room.currentControllerId).emit('playerPrediction', predictionData);
        }
      } catch (error) {
        console.error('Error submitting prediction:', error);
      }
    });

    socket.on('revealSong', (data) => {
      try {
        const roomCode = normalizeRoomCode(data?.roomCode);
        const room = gameRooms.get(roomCode);
        if (!room || room.hostId !== socket.id) return;

        room.phase = 'reviewing';
        room.songPlaying = false;
        if (room.currentCard) {
          room.currentCard.revealed = true;
        }

        emitGameState(roomCode);
      } catch (error) {
        console.error('Error revealing song:', error);
      }
    });

    socket.on('markPlayerCorrect', (data, callback) => {
      const cb = safeCallback(callback);
      try {
        const roomCode = normalizeRoomCode(data?.roomCode);
        const room = gameRooms.get(roomCode);
        if (!room) {
          cb({ error: 'Sala no encontrada' });
          return;
        }

        if (room.hostId !== socket.id || room.phase !== 'reviewing') {
          cb({ error: 'No autorizado o fase incorrecta' });
          return;
        }

        const player = room.players.find(p => p.id === data?.playerId);
        if (!player) {
          cb({ error: 'Jugador no encontrado' });
          return;
        }

        player.isCorrect = !player.isCorrect;
        // Contador acumulado de rondas acertadas: se usa para validar bingos
        player.correctRounds = Math.max(
          0,
          (player.correctRounds || 0) + (player.isCorrect ? 1 : -1)
        );

        // Evento granular que el cliente ya escucha (sonidos y confetti)
        io.to(roomCode).emit('playerMarkedCorrect', {
          playerId: player.id,
          correct: player.isCorrect
        });
        emitGameState(roomCode);

        cb({ playerId: player.id, isCorrect: player.isCorrect });
      } catch (error) {
        console.error('Error marking player:', error);
        cb({ error: error.message });
      }
    });

    socket.on('enableMarking', (data, callback) => {
      const cb = safeCallback(callback);
      try {
        const roomCode = normalizeRoomCode(data?.roomCode);
        const room = gameRooms.get(roomCode);
        if (!room) {
          cb({ error: 'Sala no encontrada' });
          return;
        }

        if (room.hostId !== socket.id) {
          cb({ error: 'No autorizado' });
          return;
        }

        room.isMarkingEnabled = true;
        io.to(roomCode).emit('markingEnabled');
        emitGameState(roomCode);

        cb({ success: true });
      } catch (error) {
        console.error('Error enabling marking:', error);
        cb({ error: error.message });
      }
    });

    socket.on('disableMarking', (data, callback) => {
      const cb = safeCallback(callback);
      try {
        const roomCode = normalizeRoomCode(data?.roomCode);
        const room = gameRooms.get(roomCode);
        if (!room) {
          cb({ error: 'Sala no encontrada' });
          return;
        }

        if (room.hostId !== socket.id) {
          cb({ error: 'No autorizado' });
          return;
        }

        room.isMarkingEnabled = false;
        io.to(roomCode).emit('markingDisabled');
        emitGameState(roomCode);

        cb({ success: true });
      } catch (error) {
        console.error('Error disabling marking:', error);
        cb({ error: error.message });
      }
    });

    socket.on('declareWinner', (data, callback) => {
      const cb = safeCallback(callback);
      try {
        const roomCode = normalizeRoomCode(data?.roomCode);
        const room = gameRooms.get(roomCode);
        if (!room) {
          cb({ error: 'Sala no encontrada' });
          return;
        }

        // La identidad la da el socket, no el payload: nadie puede
        // declarar un bingo en nombre de otro jugador
        const player = room.players.find(p => p.id === socket.id);
        if (!player) {
          cb({ error: 'Jugador no encontrado en la sala' });
          return;
        }

        // ANTI-TRAMPAS: una línea de bingo tiene 5 casillas y solo se puede
        // marcar una por ronda acertada, así que un bingo con menos de 5
        // rondas acertadas es imposible
        if ((player.correctRounds || 0) < MIN_CORRECT_ROUNDS_FOR_BINGO) {
          if (DEBUG) console.log(`[DEBUG] Bingo rechazado: ${player.name} solo tiene ${player.correctRounds || 0} aciertos`);
          cb({ error: 'Bingo no válido: no tienes suficientes aciertos' });
          return;
        }

        if (!room.winners.some(w => w.id === player.id)) {
          room.winners.push({
            id: player.id,
            name: player.name,
            position: room.winners.length + 1,
            declaredAt: Date.now(),
          });
          if (DEBUG) console.log(`[DEBUG] Ganador declarado: ${player.name} (${player.id}) en sala ${roomCode}`);
        }

        cb({ success: true });
        emitGameState(roomCode);
      } catch (error) {
        console.error('Error declaring winner:', error);
        cb({ error: error.message });
      }
    });

    socket.on('gameOver', (data, callback) => {
      const cb = safeCallback(callback);
      try {
        const roomCode = normalizeRoomCode(data?.roomCode);
        const room = gameRooms.get(roomCode);
        if (!room) {
          cb({ error: 'Sala no encontrada' });
          return;
        }

        if (room.hostId !== socket.id) {
          cb({ error: 'No autorizado' });
          return;
        }

        room.phase = 'gameOver';
        room.gameOver = true;

        cb({ success: true });
        emitGameState(roomCode);
      } catch (error) {
        console.error('Error ending game:', error);
        cb({ error: error.message });
      }
    });

    socket.on('restartGame', (data, callback) => {
      const cb = safeCallback(callback);
      try {
        const roomCode = normalizeRoomCode(data?.roomCode);
        const room = gameRooms.get(roomCode);
        if (!room) {
          cb({ error: 'Sala no encontrada' });
          return;
        }

        if (room.hostId !== socket.id) {
          cb({ error: 'No autorizado' });
          return;
        }

        room.phase = 'wheel';
        room.currentCard = null;
        room.currentCategory = null;
        room.isMarkingEnabled = false;
        room.songPlaying = false;
        room.winners = [];
        room.gameOver = false;
        room.players.forEach(p => {
          p.isCorrect = false;
          p.ready = p.isHost;
        });
        // Rotar controlador automáticamente en cada nueva ronda
        rotateController(room);

        cb({ success: true });
        emitGameState(roomCode);
      } catch (error) {
        console.error('Error restarting game:', error);
        cb({ error: error.message });
      }
    });

    socket.on('updateRoom', (data) => {
      try {
        const roomCode = normalizeRoomCode(data?.roomCode);
        const room = gameRooms.get(roomCode);
        if (!room) return;

        // SEGURIDAD: solo el host puede cambiar la configuración de la sala
        if (room.hostId !== socket.id) {
          if (DEBUG) console.log(`[DEBUG] updateRoom - No autorizado. Expected: ${room.hostId}, Got: ${socket.id}`);
          return;
        }

        if (VALID_DIFFICULTIES.includes(data?.difficulty)) {
          room.config.difficulty = data.difficulty;
          if (DEBUG) console.log(`[DEBUG] updateRoom - Difficulty actualizada a: ${data.difficulty} en sala ${roomCode}`);
        }

        emitGameState(roomCode);
      } catch (error) {
        console.error('Error updating room:', error);
      }
    });

    // Host asigna un controlador para la ronda
    socket.on('setController', (data, callback) => {
      const cb = safeCallback(callback);
      try {
        const roomCode = normalizeRoomCode(data?.roomCode);
        const room = gameRooms.get(roomCode);
        if (!room || room.hostId !== socket.id) {
          cb({ error: 'No autorizado' });
          return;
        }

        const controller = room.players.find(p => p.id === data?.controllerId);
        if (!controller) {
          cb({ error: 'Jugador no encontrado' });
          return;
        }

        room.currentControllerId = controller.id;
        room.currentControllerName = controller.name;

        cb({ success: true });
        emitGameState(roomCode);
      } catch (error) {
        console.error('Error setting controller:', error);
        cb({ error: error.message });
      }
    });

    // Controlador envía acción → servidor la reenvía al host
    socket.on('controllerAction', (data) => {
      try {
        const roomCode = normalizeRoomCode(data?.roomCode);
        const room = gameRooms.get(roomCode);
        if (!room) return;

        // Verificar que el emisor es el controlador actual
        if (socket.id !== room.currentControllerId) return;

        io.to(room.hostId).emit('controllerAction', {
          action: data?.action,
          payload: data?.payload
        });
      } catch (error) {
        console.error('Error relaying controller action:', error);
      }
    });

    // Disconnect con O(1) lookup usando socketToRoom map
    socket.on('disconnect', () => {
      const roomCode = socketToRoom.get(socket.id);
      socketToRoom.delete(socket.id);

      if (!roomCode) return;

      const room = gameRooms.get(roomCode);
      if (!room) return;

      if (room.hostId === socket.id) {
        // Host desconectado: mover a "huérfanas" para permitir reconexión
        const hostPlayer = room.players.find(p => p.isHost);
        if (hostPlayer) {
          hostPlayer.connected = false;
          hostPlayer.disconnectedAt = Date.now();
        }

        orphanedRooms.set(roomCode, {
          ...room,
          orphanedAt: new Date()
        });

        gameRooms.delete(roomCode);

        io.to(roomCode).emit('hostDisconnected', {
          message: 'El anfitrión se desconectó. Esperando reconexión...'
        });

        setTimeout(() => {
          if (orphanedRooms.has(roomCode)) {
            orphanedRooms.delete(roomCode);
            io.to(roomCode).emit('error', {
              message: 'La sesión ha expirado. El anfitrión no se reconectó.'
            });
          }
        }, ORPHAN_TIMEOUT);

        return;
      }

      const player = room.players.find(p => p.id === socket.id);
      if (!player) return;

      if (room.phase === 'waiting') {
        // En la sala de espera no hay nada que conservar: fuera directamente
        // (un fantasma sin "ready" bloquearía el inicio de la partida)
        removePlayer(room, socket.id);
        emitGameState(roomCode);
        return;
      }

      // En partida: dar un período de gracia para reconectar sin perder
      // el sitio (aciertos acumulados, rol de controlador, etc.)
      player.connected = false;
      player.disconnectedAt = Date.now();
      if (DEBUG) console.log(`[DEBUG] ${player.name} desconectado de ${roomCode}, gracia de ${PLAYER_GRACE_PERIOD / 1000}s`);

      if (room.currentControllerId === socket.id) {
        rotateController(room);
      }
      emitGameState(roomCode);
    });
  });

  // Barrido periódico: jugadores con gracia expirada y salas viejas
  const sweepInterval = setInterval(() => {
    const now = Date.now();

    for (const [roomCode, room] of gameRooms.entries()) {
      // Salas activas viejas (8 horas para permitir partidas largas)
      if (now - room.createdAt.getTime() > ROOM_TTL) {
        gameRooms.delete(roomCode);
        console.log(`Sala activa ${roomCode} eliminada por inactividad (>8h).`);
        continue;
      }

      // Jugadores desconectados cuya gracia expiró
      const expired = room.players.filter(
        p => p.connected === false && !p.isHost &&
          now - (p.disconnectedAt || 0) > PLAYER_GRACE_PERIOD
      );
      if (expired.length > 0) {
        expired.forEach(p => {
          removePlayer(room, p.id);
          if (DEBUG) console.log(`[DEBUG] ${p.name} eliminado de ${roomCode} (gracia expirada)`);
        });
        emitGameState(roomCode);
      }
    }

    // Salas huérfanas expiradas (backup del setTimeout de disconnect)
    for (const [roomCode, room] of orphanedRooms.entries()) {
      if (now - new Date(room.orphanedAt).getTime() > ORPHAN_TIMEOUT) {
        orphanedRooms.delete(roomCode);
        console.log(`Sala huérfana ${roomCode} eliminada por timeout.`);
      }
    }
  }, SWEEP_INTERVAL);
  sweepInterval.unref?.();

  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'ok',
      rooms: gameRooms.size,
      orphanedRooms: orphanedRooms.size,
      players: [...gameRooms.values()].reduce((n, r) => n + r.players.length, 0),
      uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
    });
  });

  const close = () => {
    clearInterval(sweepInterval);
    io.close();
  };

  return { app, httpServer, io, gameRooms, orphanedRooms, saveSnapshot, close };
}

// === Arranque directo (node server.js) ===
const isMain = process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  const snapshotPath = process.env.STATE_SNAPSHOT_PATH ||
    join(process.env.RAILWAY_VOLUME_MOUNT_PATH || '.', 'game-state-snapshot.json');

  const { httpServer, saveSnapshot } = createGameServer({ snapshotPath });

  const PORT = process.env.PORT || 3001;
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor escuchando en puerto ${PORT}`);
  });

  // Railway envía SIGTERM antes de matar el contenedor en cada deploy:
  // guardar el estado permite restaurar las partidas al arrancar de nuevo
  const shutdown = (signal) => {
    console.log(`${signal} recibido: guardando estado y cerrando...`);
    try {
      saveSnapshot();
      console.log('Estado guardado.');
    } catch (error) {
      console.error('No se pudo guardar el estado:', error.message);
    }
    httpServer.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 2000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}
