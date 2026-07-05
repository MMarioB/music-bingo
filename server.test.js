import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
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

  it('es idempotente si el mismo host repite createRoom (doble efecto de React)', async () => {
    const host = await connectClient();
    const first = await emitAck(host, 'createRoom', { roomCode: 'PPPP6' });
    const second = await emitAck(host, 'createRoom', { roomCode: 'PPPP6' });
    expect(second.error).toBeFalsy();
    expect(second.roomCode).toBe('PPPP6');
    expect(second.hostToken).toBe(first.hostToken);
    expect(server.gameRooms.get('PPPP6').players).toHaveLength(1);
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
    // El servidor sigue vivo y la sala se creó (reintento idempotente)
    const res = await emitAck(host, 'createRoom', { roomCode: 'CCCC3' });
    expect(res.roomCode).toBe('CCCC3');
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

describe('catálogo de previews (/api/tracks)', () => {
  const realFetch = global.fetch;

  const itunesSong = (overrides = {}) => ({
    kind: 'song',
    trackId: 111,
    trackName: 'Bohemian Rhapsody',
    artistName: 'Queen',
    trackTimeMillis: 355000,
    previewUrl: 'https://audio.itunes.example/preview.m4a',
    artworkUrl100: 'https://img.example/100x100bb.jpg',
    collectionName: 'A Night at the Opera',
    releaseDate: '1975-10-31T08:00:00Z',
    ...overrides,
  });

  // Mockea solo las llamadas a iTunes/Deezer; el resto (peticiones al
  // propio servidor de test) usa el fetch real
  const stubUpstream = ({ itunes, deezer } = {}) => {
    const fetchMock = vi.fn((input, init) => {
      const target = String(input);
      if (target.includes('itunes.apple.com')) {
        if (itunes instanceof Error) return Promise.reject(itunes);
        return Promise.resolve({ ok: true, json: async () => ({ results: itunes || [] }) });
      }
      if (target.includes('api.deezer.com')) {
        if (deezer instanceof Error) return Promise.reject(deezer);
        return Promise.resolve({ ok: true, json: async () => ({ data: deezer || [] }) });
      }
      return realFetch(input, init);
    });
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
  };

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('devuelve canciones de iTunes filtradas y normalizadas', async () => {
    stubUpstream({
      itunes: [
        itunesSong(),
        itunesSong({ trackId: 222, previewUrl: null }), // sin preview: fuera
        itunesSong({ trackId: 333, trackTimeMillis: 20000 }), // demasiado corta: fuera
        itunesSong({ trackId: 444, artistName: 'Queen Latifah Tribute Band' }), // contiene "queen": pasa
        itunesSong({ trackId: 555, artistName: 'Otro Artista' }), // no coincide: fuera
      ],
    });

    const res = await realFetch(`${url}/api/tracks?artist=Queen`);
    expect(res.status).toBe(200);
    const { tracks } = await res.json();
    expect(tracks.map((t) => t.id)).toEqual(['itunes-111', 'itunes-444']);
    expect(tracks[0]).toMatchObject({
      title: 'Bohemian Rhapsody',
      artist: 'Queen',
      year: 1975,
      previewUrl: 'https://audio.itunes.example/preview.m4a',
      albumImage: 'https://img.example/300x300bb.jpg',
      albumName: 'A Night at the Opera',
    });
  });

  it('cae a Deezer cuando iTunes no devuelve resultados', async () => {
    stubUpstream({
      itunes: [],
      deezer: [{
        id: 999,
        title: 'Radio Ga Ga',
        duration: 344,
        preview: 'https://audio.deezer.example/preview.mp3',
        artist: { name: 'Queen Deezer' },
        album: { title: 'The Works', cover_medium: 'https://img.deezer.example/m.jpg' },
      }],
    });

    const res = await realFetch(`${url}/api/tracks?artist=Queen+Deezer`);
    expect(res.status).toBe(200);
    const { tracks } = await res.json();
    expect(tracks).toHaveLength(1);
    expect(tracks[0]).toMatchObject({
      id: 'deezer-999',
      title: 'Radio Ga Ga',
      artist: 'Queen Deezer',
      previewUrl: 'https://audio.deezer.example/preview.mp3',
    });
  });

  it('cachea las respuestas por artista', async () => {
    const fetchMock = stubUpstream({ itunes: [itunesSong({ trackId: 777, artistName: 'Queen Cache' })] });

    const first = await realFetch(`${url}/api/tracks?artist=Queen+Cache`);
    expect(first.status).toBe(200);
    const upstreamCalls = fetchMock.mock.calls.filter(([u]) => String(u).includes('itunes')).length;

    const second = await realFetch(`${url}/api/tracks?artist=queen cache`);
    expect(second.status).toBe(200);
    const upstreamCallsAfter = fetchMock.mock.calls.filter(([u]) => String(u).includes('itunes')).length;
    expect(upstreamCallsAfter).toBe(upstreamCalls);

    const { tracks } = await second.json();
    expect(tracks[0].id).toBe('itunes-777');
  });

  it('responde 400 sin artista y 404 sin resultados en ninguna fuente', async () => {
    stubUpstream({ itunes: new Error('caído'), deezer: [] });

    const bad = await realFetch(`${url}/api/tracks`);
    expect(bad.status).toBe(400);

    const notFound = await realFetch(`${url}/api/tracks?artist=Artista+Inexistente`);
    expect(notFound.status).toBe(404);
  });
});

