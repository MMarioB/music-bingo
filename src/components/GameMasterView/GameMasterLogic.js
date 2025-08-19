import { useState, useCallback, useEffect, useRef } from 'react';
import { useSpotify } from '../../hooks/useSpotify';
import { gameSocket } from '../../services/socketService';
import { ARTISTS } from './constants';

/**
 * Hook que contiene toda la lógica del “Game Master”.
 * Incluye:
 *   • manejo de autenticación con Spotify
 *   • conexión y control del socket
 *   • generación de tarjetas, marcado de jugadores y control de rondas
 *   • persistencia del estado en localStorage
 *
 * Los estados que son leídos dentro de callbacks que pueden
 * ejecutarse *después* de una actualización (por ejemplo,
 * eventos del socket) se acceden mediante `useRef` para evitar
 * “stale closures”.
 */
export const useGameMasterLogic = ({
  roomCode,
  initialDifficulty,
}) => {
  /* ---------------------------------------------------------- *
   *                     ESTADO REACTUAL                        *
   * ---------------------------------------------------------- */
  const { spotify, loggedIn, login, logout, token } = useSpotify();

  const [currentCard, setCurrentCard]     = useState(null);
  const [isLoading, setIsLoading]       = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [gameStep, setGameStep]         = useState('init');   // init | wheel | card | gameOver
  const [connectedPlayers, setConnectedPlayers] = useState([]); // [{id, name, ready, isHost}, …]
  const [difficulty, setDifficulty]     = useState(initialDifficulty);
  const [connectionError, setConnectionError] = useState(null);
  const [isMarkingEnabled, setIsMarkingEnabled] = useState(false);
  const [allPlayersReady, setAllPlayersReady] = useState(false);
  const [isTokenValid, setIsTokenValid] = useState(true);
  const [songPlaying, setSongPlaying] = useState(false);
  const [playerPredictions, setPlayerPredictions] = useState({});   // {playerName: [pred1, pred2,…]}
  const [playerCorrect, setPlayerCorrect] = useState({});        // {playerId: true/false}
  const [gameOver, setGameOver] = useState(false);
  const [winners, setWinners]   = useState([]);   // [{id, name}, …]

  /* ---------------------------------------------------------- *
   *                REFS – evitan “stale closures”              *
   * ---------------------------------------------------------- */
  const playerCorrectRef   = useRef({});
  const connectedPlayersRef = useRef([]);
  const markingEnabledRef = useRef(false);

  // Mantener los refs actualizados después de cada render
  useEffect(() => { playerCorrectRef.current   = playerCorrect;   }, [playerCorrect]);
  useEffect(() => { connectedPlayersRef.current = connectedPlayers; }, [connectedPlayers]);
  useEffect(() => { markingEnabledRef.current = isMarkingEnabled; }, [isMarkingEnabled]);

  /* ---------------------------------------------------------- *
   *          UTILIDADES auxiliares (reset, validaciones)      *
   * ---------------------------------------------------------- */
  const resetPlayerCorrectState = useCallback(() => {
    const reset = {};
    connectedPlayersRef.current.forEach(p => (reset[p.id] = false));
    setPlayerCorrect(reset);
  }, []);   // solo necesita referenciar el ref

  /* ---------------------------------------------------------- *
   *            1️⃣ VERIFICACIÓN DE TOKEN (auth)               *
   * ---------------------------------------------------------- */
  // 1️⃣ Comprobamos que haya token en localStorage
  useEffect(() => {
    const tokenData = localStorage.getItem('spotify_token');
    if (!token || !tokenData) {
      setIsTokenValid(false);
      logout();
      setGameStep('init');
      return;
    }
    setIsTokenValid(true);
  }, [token, logout]);

  // 2️⃣ Cuando el token es válido pasamos de “init” → “wheel”
  useEffect(() => {
    if (isTokenValid && gameStep === 'init') setGameStep('wheel');
  }, [isTokenValid, gameStep]);

  /* ---------------------------------------------------------- *
   *    2️⃣ REANUDAR ESTADO DESDE `localStorage` (visibility)   *
   * ---------------------------------------------------------- */
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (!document.hidden) {
        const saved = localStorage.getItem('musicBingoState');
        if (!saved) return;
        try {
          const { timestamp, cardState } = JSON.parse(saved);
          if (Date.now() - timestamp < 300_000 && cardState && !currentCard) {
            setCurrentCard(cardState);
            setSongPlaying(true);
            // Si restauramos una tarjeta, la UI debe pasar a “card”
            setGameStep('card');
          }
        } catch (e) {
          console.error('Error restaurando estado desde localStorage:', e);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []); // solo al montar

  /* ---------------------------------------------------------- *
   *    3️⃣ CONEXIÓN Y REGISTRO DE HANDLERS DE SOCKET           *
   * ---------------------------------------------------------- */
  /**
   * Los handlers se registran una sola vez (cuando el hook se monta).
   * Usamos los *refs* para leer siempre el estado más reciente.
   */
  useEffect(() => {
    const handlers = {
      // → actualizar lista de jugadores
      playersUpdate: ({ players }) => {
        setConnectedPlayers(players);
        setAllPlayersReady(players.every(p => p.ready || p.isHost));
      },

      // → predicciones de los jugadores
      playerPrediction: ({ playerName, prediction }) => {
        setPlayerPredictions(prev => ({
          ...prev,
          [playerName]: [...(prev[playerName] || []), prediction],
        }));
      },

      // → marcado de un jugador (acierto/no acierto)
      playerMarked: ({ playerId, isCorrect }) => {
        setPlayerCorrect(prev => ({
          ...prev,
          [playerId]: isCorrect,
        }));
      },

      // → habilitar / deshabilitar marcado global
      markingEnabled:  () => setIsMarkingEnabled(true),
      markingDisabled: () => setIsMarkingEnabled(false),

      // → jugador ganador
      playerWon: ({ playerId, playerName }) => {
        setWinners(prev => {
          if (prev.some(w => w.id === playerId)) return prev;
          return [...prev, { id: playerId, name: playerName }];
        });
      },

      // → error al iniciar partida (por ejemplo, “no hay suficientes jugadores”)
      gameStartFailed: err => {
        setConnectionError(err.message);
        setGameStep('wheel');
      },

      // → cualquier error genérico del socket
      error: err => setConnectionError(err.message),
    };

    // Registrar todos los listeners
    Object.entries(handlers).forEach(([ev, fn]) => gameSocket.on(ev, fn));

    /**
     * Conexión y creación de la sala.
     * Evitamos reconectar si ya está conectado.
     */
    const initRoom = async () => {
      try {
        if (!gameSocket.connected) await gameSocket.connect();

        const roomResponse = await gameSocket.createRoom({
          roomCode,
          difficulty,
          maxPlayers: 12,
          host: true,
        });

        if (roomResponse?.players) {
          setConnectedPlayers(roomResponse.players);
          setAllPlayersReady(
            roomResponse.players.every(p => p.ready || p.isHost)
          );
        }
      } catch (e) {
        console.error('Error al crear/suscribirse a la sala:', e);
        setConnectionError(e.message);
      }
    };

    initRoom();

    // Cleanup al desmontar
    return () => {
      Object.keys(handlers).forEach(ev => gameSocket.off(ev));
    };
  }, []); // ⬅️ vacío → solo al montar

  /* ---------------------------------------------------------- *
   * 4️⃣ CALLBACKS del juego (parte “business logic”)           *
   * ---------------------------------------------------------- */

  /** Cambiar la dificultad */
  const handleDifficultyChange = useCallback(
    async newDifficulty => {
      if (!loggedIn || !isTokenValid) {
        setGameStep('init');
        return;
      }
      try {
        setDifficulty(newDifficulty);
        await gameSocket.updateRoom({ roomCode, difficulty: newDifficulty });
      } catch (e) {
        console.error('Error al cambiar dificultad:', e);
        setConnectionError(e.message);
      }
    },
    [roomCode, loggedIn, isTokenValid]
  );

  /** Seleccionar categoría → pasa a la fase “card” */
  const handleCategorySelected = useCallback(
    async category => {
      if (!loggedIn || !isTokenValid) {
        setGameStep('init');
        return;
      }
      try {
        await gameSocket.selectCategory({ roomCode, category });
        setSelectedCategory(category);
        setGameStep('card');
        setIsMarkingEnabled(false);
        setCurrentCard(null);
        setSongPlaying(false);
        setPlayerPredictions({});
        resetPlayerCorrectState();
      } catch (e) {
        console.error('Error al seleccionar categoría:', e);
        setConnectionError(e.message);
      }
    },
    [roomCode, loggedIn, isTokenValid, resetPlayerCorrectState]
  );

  /** Generar una tarjeta nueva (busca pista en Spotify) */
  const generateNewCard = useCallback(
    async () => {
      if (!loggedIn || !isTokenValid || !selectedCategory || !spotify) return;

      setIsLoading(true);
      try {
        // 1️⃣ Elegir categoría y artista aleatorios
        const randomMusicCategory =
          Object.keys(ARTISTS)[
            Math.floor(Math.random() * Object.keys(ARTISTS).length)
          ];
        const artistsInCategory = ARTISTS[randomMusicCategory];
        const randomArtist =
          artistsInCategory[Math.floor(Math.random() * artistsInCategory.length)];

        // 2️⃣ Buscar tracks en Spotify
        const response = await spotify.searchTracks(
          `artist:"${randomArtist}"`,
          { limit: 50, market: 'ES' }
        );
        const tracks = response.tracks.items;
        if (!tracks.length) throw new Error('No se encontraron canciones');

        const randomTrack = tracks[Math.floor(Math.random() * tracks.length)];
        const year = parseInt(randomTrack.album.release_date.split('-')[0], 10);

        const newCard = {
          title: randomTrack.name,
          artist: randomTrack.artists[0].name,
          year,
          spotifyUrl: randomTrack.external_urls.spotify,
          uri: randomTrack.uri,
          musicCategory: randomMusicCategory,
          revealed: false,
        };

        // 3️⃣ Guardar estado en localStorage (para “resume”)
        const gameState = {
          currentTrack: randomTrack.uri,
          timestamp: Date.now(),
          cardState: newCard,
        };
        localStorage.setItem('musicBingoState', JSON.stringify(gameState));

        // 4️⃣ Cambiar UI y reproducir canción
        setCurrentCard(newCard);
        await spotify.playTrack(randomTrack.uri);
        await gameSocket.startSong({ roomCode });
        setSongPlaying(true);
        resetPlayerCorrectState();
      } catch (e) {
        console.error('Error generando tarjeta:', e);
        if (e.status === 401) {
          setIsTokenValid(false);
          logout();
          setGameStep('init');
        } else {
          setConnectionError('Error al generar la tarjeta');
        }
      } finally {
        setIsLoading(false);
      }
    },
    [
      loggedIn,
      isTokenValid,
      selectedCategory,
      spotify,
      roomCode,
      logout,
      resetPlayerCorrectState,
    ]
  );

  /** Revelar la canción (cuando la ronda termina) */
  const handleRevealSong = useCallback(
    async () => {
      if (!currentCard || !loggedIn || !isTokenValid) return;
      try {
        await gameSocket.revealSong({
          roomCode,
          songData: {
            title: currentCard.title,
            artist: currentCard.artist,
            year: currentCard.year,
          },
        });
        setCurrentCard(prev => ({ ...prev, revealed: true }));
        setSongPlaying(false);
        resetPlayerCorrectState();
      } catch (e) {
        console.error('Error al revelar canción:', e);
        setConnectionError('Error al revelar la canción');
      }
    },
    [currentCard, roomCode, loggedIn, isTokenValid, resetPlayerCorrectState]
  );

  /** Marcar/unmarcar a un jugador individualmente */
  const handlePlayerCorrectToggle = useCallback(
    async playerId => {
      if (!loggedIn || !isTokenValid) return;
      try {
        const newCorrect = !playerCorrectRef.current[playerId];
        const player = connectedPlayersRef.current.find(p => p.id === playerId);
        console.log(
          'Marcando jugador:',
          player?.name,
          `(ID:${playerId}) →`,
          newCorrect ? 'ACERTANTE' : 'NO ACERTANTE'
        );

        await gameSocket.markPlayerCorrect({
          roomCode,
          playerId,
          isCorrect: newCorrect,
        });

        setPlayerCorrect(prev => ({
          ...prev,
          [playerId]: newCorrect,
        }));

        // Si el marcador global estaba activo, lo desactivamos para recalcular
        if (markingEnabledRef.current) {
          await gameSocket.disableMarking({ roomCode });
          setIsMarkingEnabled(false);
        }
      } catch (e) {
        console.error('Error al marcar jugador:', e);
        setConnectionError('Error al marcar el acierto del jugador');
      }
    },
    [roomCode, loggedIn, isTokenValid]
  );

  /** Habilitar / deshabilitar el marcado global (cuando se quiere “revelar” las respuestas) */
  const handleMarkingToggle = useCallback(
    async () => {
      if (!loggedIn || !isTokenValid) return;

      try {
        // Si ya está habilitado → lo desactivamos
        if (markingEnabledRef.current) {
          await gameSocket.disableMarking({ roomCode });
          setIsMarkingEnabled(false);
          return;
        }

        // ---------------------  Habilitar  ---------------------
        // 1️⃣ Tomar los jugadores marcados como correctos
        const currentCorrect = playerCorrectRef.current;
        const eligiblePlayers = Object.entries(currentCorrect)
          .filter(([, isCorrect]) => isCorrect)
          .map(([id]) => id);

        if (!eligiblePlayers.length) {
          setConnectionError(
            'No hay jugadores marcados como acertantes. Marca al menos uno antes de habilitar el marcado.'
          );
          return;
        }

        // 2️⃣ Verificar que esos jugadores sigan conectados
        const stillConnected = eligiblePlayers.filter(id =>
          connectedPlayersRef.current.some(p => p.id === id)
        );

        if (!stillConnected.length) {
          setConnectionError(
            'Los jugadores marcados como acertantes ya no están conectados.'
          );
          return;
        }

        // 3️⃣ Enviar al servidor
        await gameSocket.enableMarking({
          roomCode,
          eligiblePlayers: stillConnected,
        });
        setIsMarkingEnabled(true);
      } catch (e) {
        console.error('Error al cambiar estado de marcado:', e);
        setConnectionError('Error al cambiar estado de marcado');
      }
    },
    [roomCode, loggedIn, isTokenValid]
  );

  /** Finalizar la partida (cuando hay ganadores) */
  const finishGame = useCallback(
    async () => {
      if (!loggedIn || !isTokenValid) return;
      if (!winners.length) {
        setConnectionError('No hay ganadores para finalizar el juego');
        return;
      }
      try {
        await gameSocket.gameOver({ roomCode, winners });
        setGameOver(true);
        setGameStep('gameOver');
      } catch (e) {
        console.error('Error al finalizar el juego:', e);
        setConnectionError('Error al finalizar el juego');
      }
    },
    [roomCode, loggedIn, isTokenValid, winners]
  );

  /** Iniciar una nueva ronda (resetear todo) */
  const startNewRound = useCallback(
    async () => {
      if (!loggedIn || !isTokenValid) return;
      try {
        // Si el juego ya terminó, pedimos al servidor que lo reinicie
        if (gameOver) {
          await gameSocket.restartGame({ roomCode });
          setGameOver(false);
          setWinners([]);
        }

        await gameSocket.disableMarking({ roomCode });
        setCurrentCard(null);
        setSelectedCategory(null);
        setGameStep('wheel');
        setIsMarkingEnabled(false);
        setSongPlaying(false);
        setPlayerPredictions({});
        resetPlayerCorrectState();
      } catch (e) {
        console.error('Error al iniciar nueva ronda:', e);
        setConnectionError('Error al iniciar nueva ronda');
      }
    },
    [
      roomCode,
      loggedIn,
      isTokenValid,
      resetPlayerCorrectState,
      gameOver,
    ]
  );

  /* ---------------------------------------------------------- *
   *                     RETURN (API del Hook)                 *
   * ---------------------------------------------------------- */
  return {
    // Estado / datos
    loggedIn,
    login,
    logout,
    currentCard,
    isLoading,
    selectedCategory,
    gameStep,
    connectedPlayers,
    difficulty,
    connectionError,
    setConnectionError,
    isMarkingEnabled,
    allPlayersReady,
    isTokenValid,
    songPlaying,
    playerPredictions,
    playerCorrect,

    // Acciones
    handlePlayerCorrectToggle,
    handleDifficultyChange,
    handleCategorySelected,
    generateNewCard,
    handleRevealSong,
    handleMarkingToggle,
    startNewRound,
    finishGame,

    // Otros valores útiles
    setCurrentCard,
    gameOver,
    winners,
  };
};