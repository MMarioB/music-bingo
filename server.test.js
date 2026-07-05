import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { io as ioc } from 'socket.io-client';
import { createGameServer } from './server.js';

let server;
let url;
const clients = [];

const connectClient = () => {
  const socket = ioc(url, { forceNew: true, transports: ['websocket'] });
  clients.push(socket);
  return new Promise((resolve, reject) => {
    socket.on('connect', () => resolve(socket));
    socket.on('connect_error', reject);
  });
};

const emitAck = (socket, event, data, timeout = 2000) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout: ${event}`)), timeout);
    socket.emit(event, data, (response) => {
      clearTimeout(timer);
      resolve(response);
    });
  });

const waitForState = (socket, predicate, timeout = 2000) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off('gameStateUpdate', handler);
      reject(new Error('Timeout esperando gameStateUpdate'));
    }, timeout);
    const handler = (state) => {
      if (predicate(state)) {
        clearTimeout(timer);
        socket.off('gameStateUpdate', handler);
        resolve(state);
      }
    };
    socket.on('gameStateUpdate', handler);
  });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const track = {
  uri: 'spotify:track:123',
  title: 'Canción',
  artist: 'Artista',
  year: 1999,
  musicCategory: 'pop',
  spotifyUrl: 'https://open.spotify.com/track/123',
  previewUrl: null,
  albumImage: null,
  albumName: 'Álbum',
};

// Lleva una sala hasta la fase 'reviewing' y marca al jugador como correcto
const playRoundAndMark = async (host, roomCode, playerId) => {
  await emitAck(host, 'selectCategory', { roomCode, category: { name: 'Pop' } });
  await emitAck(host, 'startSong', { roomCode, track });
  const reviewing = waitForState(host, (s) => s.gameStep === 'reviewing');
  host.emit('revealSong', { roomCode });
  await reviewing;
  return emitAck(host, 'markPlayerCorrect', { roomCode, playerId });
};

beforeAll(async () => {
  server = createGameServer();
  await new Promise((resolve) => server.httpServer.listen(0, resolve));
  url = `http://localhost:${server.httpServer.address().port}`;
});

afterAll(async () => {
  server.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
});

afterEach(() => {
  clients.forEach((c) => c.disconnect());
  clients.length = 0;
});

describe('createRoom', () => {
  it('crea una sala y devuelve hostToken', async () => {
    const host = await connectClient();
    const res = await emitAck(host, 'createRoom', { roomCode: 'AAAA1' });
    expect(res.roomCode).toBe('AAAA1');
    expect(res.hostToken).toBeTruthy();
    expect(res.players).toHaveLength(1);
  });

  it('no permite sobreescribir una sala existente', async () => {
    const host = await connectClient();
    const attacker = await connectClient();
    await emitAck(host, 'createRoom', { roomCode: 'BBBB2' });
    const res = await emitAck(attacker, 'createRoom', { roomCode: 'BBBB2' });
    expect(res.error).toBeTruthy();
    expect(server.gameRooms.get('BBBB2').hostId).toBe(host.id);
  });

  it('rechaza códigos de sala no válidos', async () => {
    const host = await connectClient();
    const res = await emitAck(host, 'createRoom', { roomCode: 'x' });
    expect(res.error).toBeTruthy();
  });

  it('no se cae si el cliente no envía callback', async () => {
    const host = await connectClient();
    host.emit('createRoom', { roomCode: 'CCCC3' });
    await sleep(100);
    // El servidor sigue vivo y la sala se creó
    const res = await emitAck(host, 'createRoom', { roomCode: 'CCCC3' });
    expect(res.error).toBeTruthy();
  });
});

describe('joinRoom', () => {
  it('permite unirse con nombre y rechaza nombres duplicados', async () => {
    const host = await connectClient();
    const p1 = await connectClient();
    const p2 = await connectClient();
    await emitAck(host, 'createRoom', { roomCode: 'DDDD4' });

    const res1 = await emitAck(p1, 'joinRoom', { roomCode: 'DDDD4', name: 'Ana' });
    expect(res1.players).toHaveLength(2);

    const res2 = await emitAck(p2, 'joinRoom', { roomCode: 'DDDD4', name: 'ana' });
    expect(res2.error).toBeTruthy();
  });

  it('devuelve error si la sala no existe', async () => {
    const p1 = await connectClient();
    const res = await emitAck(p1, 'joinRoom', { roomCode: 'ZZZZ9', name: 'Ana' });
    expect(res.error).toBeTruthy();
  });

  it('rechaza el secuestro del rol de host sin token', async () => {
    const host = await connectClient();
    const attacker = await connectClient();
    await emitAck(host, 'createRoom', { roomCode: 'EEEE5' });

    const res = await emitAck(attacker, 'joinRoom', {
      roomCode: 'EEEE5',
      isHost: true,
      reconnecting: true,
    });
    expect(res.error).toBeTruthy();
    expect(server.gameRooms.get('EEEE5').hostId).toBe(host.id);
  });

  it('permite reclamar el rol de host con el hostToken', async () => {
    const host = await connectClient();
    const newHost = await connectClient();
    const { hostToken } = await emitAck(host, 'createRoom', { roomCode: 'FFFF6' });

    const res = await emitAck(newHost, 'joinRoom', {
      roomCode: 'FFFF6',
      isHost: true,
      reconnecting: true,
      hostToken,
    });
    expect(res.error).toBeFalsy();
    expect(server.gameRooms.get('FFFF6').hostId).toBe(newHost.id);
  });
});

describe('updateRoom', () => {
  it('solo el host puede cambiar la dificultad', async () => {
    const host = await connectClient();
    const p1 = await connectClient();
    await emitAck(host, 'createRoom', { roomCode: 'GGGG7' });
    await emitAck(p1, 'joinRoom', { roomCode: 'GGGG7', name: 'Ana' });

    p1.emit('updateRoom', { roomCode: 'GGGG7', difficulty: 'experto' });
    await sleep(100);
    expect(server.gameRooms.get('GGGG7').config.difficulty).toBe('principiante');

    host.emit('updateRoom', { roomCode: 'GGGG7', difficulty: 'experto' });
    await sleep(100);
    expect(server.gameRooms.get('GGGG7').config.difficulty).toBe('experto');
  });
});

describe('dinámica de partida', () => {
  const setupGame = async (roomCode) => {
    const host = await connectClient();
    const p1 = await connectClient();
    await emitAck(host, 'createRoom', { roomCode });
    const joinRes = await emitAck(p1, 'joinRoom', { roomCode, name: 'Ana' });
    const playerId = joinRes.players.find((p) => !p.isHost).id;
    p1.emit('playerReady', { roomCode });
    await waitForState(host, (s) => s.connectedPlayers.every((p) => p.ready));
    const wheel = waitForState(host, (s) => s.gameStep === 'wheel');
    host.emit('startGame', { roomCode });
    await wheel;
    return { host, p1, playerId };
  };

  it('rechaza un bingo con menos de 5 rondas acertadas', async () => {
    const { host, p1, playerId } = await setupGame('HHHH8');

    await playRoundAndMark(host, 'HHHH8', playerId);
    const res = await emitAck(p1, 'declareWinner', { roomCode: 'HHHH8', playerName: 'Ana' });
    expect(res.error).toBeTruthy();
    expect(server.gameRooms.get('HHHH8').winners).toHaveLength(0);
  });

  it('acepta un bingo con 5 rondas acertadas', async () => {
    const { host, p1, playerId } = await setupGame('IIII9');

    for (let i = 0; i < 5; i++) {
      await playRoundAndMark(host, 'IIII9', playerId);
    }
    const res = await emitAck(p1, 'declareWinner', { roomCode: 'IIII9', playerName: 'Ana' });
    expect(res.success).toBe(true);
    const winners = server.gameRooms.get('IIII9').winners;
    expect(winners).toHaveLength(1);
    expect(winners[0].name).toBe('Ana');
    expect(winners[0].position).toBe(1);
  });

  it('el marcado del host emite eventos granulares y cuenta aciertos', async () => {
    const { host, p1, playerId } = await setupGame('JJJJ1');

    const marked = new Promise((resolve) => p1.on('playerMarkedCorrect', resolve));
    await playRoundAndMark(host, 'JJJJ1', playerId);
    expect(await marked).toEqual({ playerId, correct: true });

    const room = server.gameRooms.get('JJJJ1');
    expect(room.players.find((p) => p.id === playerId).correctRounds).toBe(1);

    // Desmarcar revierte el contador
    await emitAck(host, 'markPlayerCorrect', { roomCode: 'JJJJ1', playerId });
    expect(room.players.find((p) => p.id === playerId).correctRounds).toBe(0);
  });

  it('un jugador desconectado en partida conserva su sitio y lo reclama por nombre', async () => {
    const { host, p1, playerId } = await setupGame('KKKK2');
    await playRoundAndMark(host, 'KKKK2', playerId);

    p1.disconnect();
    await sleep(150);

    const room = server.gameRooms.get('KKKK2');
    const ana = room.players.find((p) => !p.isHost);
    expect(ana).toBeTruthy();
    expect(ana.connected).toBe(false);
    expect(ana.correctRounds).toBe(1);

    // Reconexión con el mismo nombre: reclama el sitio
    const p2 = await connectClient();
    const res = await emitAck(p2, 'joinRoom', { roomCode: 'KKKK2', name: 'Ana' });
    expect(res.error).toBeFalsy();
    expect(room.players.filter((p) => !p.isHost)).toHaveLength(1);
    const anaReclaimed = room.players.find((p) => !p.isHost);
    expect(anaReclaimed.id).toBe(p2.id);
    expect(anaReclaimed.connected).toBe(true);
    expect(anaReclaimed.correctRounds).toBe(1);
  });

  it('con reconnecting reclama el sitio aunque la sesión antigua siga viva (zombie)', async () => {
    const { p1, playerId } = await setupGame('NNNN5');
    const room = server.gameRooms.get('NNNN5');

    // El socket antiguo sigue conectado (caída de red no detectada aún),
    // pero el cliente reconecta indicando reconnecting: true
    const p2 = await connectClient();
    const res = await emitAck(p2, 'joinRoom', { roomCode: 'NNNN5', name: 'Ana', reconnecting: true });
    expect(res.error).toBeFalsy();

    const ana = room.players.find((p) => !p.isHost);
    expect(ana.id).toBe(p2.id);
    expect(ana.id).not.toBe(playerId);
    expect(room.players.filter((p) => !p.isHost)).toHaveLength(1);

    // La sesión zombie fue expulsada por el servidor
    await sleep(150);
    expect(p1.connected).toBe(false);
  });

  it('en la sala de espera un jugador desconectado se elimina inmediatamente', async () => {
    const host = await connectClient();
    const p1 = await connectClient();
    await emitAck(host, 'createRoom', { roomCode: 'LLLL3' });
    await emitAck(p1, 'joinRoom', { roomCode: 'LLLL3', name: 'Ana' });

    p1.disconnect();
    await sleep(150);
    expect(server.gameRooms.get('LLLL3').players).toHaveLength(1);
  });

  it('la rotación de controlador salta a los desconectados', async () => {
    const { host, p1, playerId } = await setupGame('MMMM4');
    const room = server.gameRooms.get('MMMM4');

    // startGame asigna el primer controlador
    expect(room.currentControllerId).toBeTruthy();

    // Si el controlador se desconecta, rota a otro jugador conectado
    if (room.currentControllerId === playerId) {
      p1.disconnect();
      await sleep(150);
      expect(room.currentControllerId).toBe(host.id);
    } else {
      expect(room.currentControllerId).toBe(host.id);
    }
  });
});
