import { useState, useCallback, useEffect } from 'react';
import { useSpotify } from '../../hooks/useSpotify';
import { gameSocket } from '../../services/socketService';
import { ARTISTS } from './constants';

const getInitialGameState = () => ({
  currentCard: null,
  currentCategory: null,
  gameStep: 'init',
  connectedPlayers: [],
  isMarkingEnabled: false,
  allPlayersReady: false,
  songPlaying: false,
  playerPredictions: {},
  playerCorrectStatus: {},
  gameOver: false,
  winners: [],
});

export const useGameMasterLogic = ({ roomCode, initialDifficulty }) => {
  const { spotify, loggedIn, login, logout, token } = useSpotify();

  const [gameState, setGameState] = useState(getInitialGameState());
  const [isLoading, setIsLoading] = useState(false);
  const [difficulty, setDifficulty] = useState(initialDifficulty);
  const [connectionError, setConnectionError] = useState(null);
  const [isTokenValid, setIsTokenValid] = useState(true);
  const [tokenWarning, setTokenWarning] = useState(null);
  const [serverWaking, setServerWaking] = useState(false);
  const [songHistory, setSongHistory] = useState([]);

  // Estado para el tema musical seleccionado manualmente ('auto' = aleatorio)
  const [selectedMusicTheme, setSelectedMusicTheme] = useState('auto');

  // Estados del timer
  const [timerDuration, setTimerDuration] = useState(30);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerPaused, setTimerPaused] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(30);

  // Listen for server waking events
  useEffect(() => {
    const handleServerWaking = (event) => {
      console.log('🔔 GameMaster recibió serverWaking event');
      setServerWaking(true);
      setConnectionError(event.detail?.message || '⏳ El servidor está despertando...');
    };

    const handleServerAwake = () => {
      console.log('🔔 GameMaster recibió serverAwake event');
      setServerWaking(false);
      setConnectionError(null);
    };

    window.addEventListener('serverWaking', handleServerWaking);
    window.addEventListener('serverAwake', handleServerAwake);

    return () => {
      window.removeEventListener('serverWaking', handleServerWaking);
      window.removeEventListener('serverAwake', handleServerAwake);
    };
  }, []);

  // Check Spotify token expiration periodically
  useEffect(() => {
    if (!loggedIn || !token) return;

    const checkTokenExpiration = () => {
      const expirationTime = localStorage.getItem('spotify_token_expiration');
      if (!expirationTime) return;

      const timeUntilExpiration = parseInt(expirationTime) - Date.now();
      const minutesUntilExpiration = timeUntilExpiration / 60000;

      if (minutesUntilExpiration < 10 && minutesUntilExpiration > 0) {
        setTokenWarning(`⚠️ El token de Spotify expirará en ${Math.floor(minutesUntilExpiration)} minutos. Considera finalizar la partida pronto.`);
      } else if (timeUntilExpiration <= 0) {
        setConnectionError('❌ Token de Spotify expirado. Por favor, vuelve a iniciar sesión.');
        setIsTokenValid(false);
        logout();
      } else {
        setTokenWarning(null); // Clear warning if we have more than 10 minutes
      }
    };

    checkTokenExpiration();
    const interval = setInterval(checkTokenExpiration, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [loggedIn, token, logout]);

  useEffect(() => {
    if (!loggedIn || !isTokenValid || !roomCode) {
      if (!token) setGameState(prev => ({ ...prev, gameStep: 'init' }));
      return;
    }

    const initializeSocketConnection = async () => {
      try {
        await gameSocket.connect();

        const response = await gameSocket.joinRoom(roomCode, {
          name: 'Game Master',
          isHost: true,
          reconnecting: true
        });

        if (response && response.success) {
          console.log('✅ Sala unida/creada como Host. Estado inicial:', response.data);
          setGameState(prevState => ({
            ...prevState,
            connectedPlayers: response.data.players || [],
            difficulty: response.data.difficulty || initialDifficulty,
            gameStep: response.data.gameStep || 'waiting',
          }));
        } else if (response && response.success === false) {
          console.error('Error al unirse a la sala:', response.error);
          setConnectionError(response.error);
        } else {
          console.log('✅ Conexión establecida, esperando actualización de estado...');
          setGameState(prevState => ({
            ...prevState,
            gameStep: 'waiting',
          }));
        }

      } catch (error) {
        console.error('🔥 Error al inicializar conexión del Host:', error);
        setConnectionError(error.message);
      }
    };

    initializeSocketConnection();

    const handleGameStateUpdate = (newGameState) => {
      console.log('🎮 GameMaster recibió gameStateUpdate:', newGameState);

      // CRÍTICO: Actualizar TODO el estado que viene del servidor
      setGameState(prevState => {
        const updates = {
          ...prevState,
          ...newGameState,
          // Asegurar que estos campos críticos se actualicen
          isMarkingEnabled: newGameState.isMarkingEnabled !== undefined
            ? newGameState.isMarkingEnabled
            : prevState.isMarkingEnabled,
        };

        // Resetear predicciones cuando empieza una nueva canción
        if (newGameState.currentSong &&
            (!prevState.currentSong || newGameState.currentSong.uri !== prevState.currentSong.uri)) {
          console.log('🔄 Nueva canción detectada, reseteando predicciones');
          updates.playerPredictions = {};
        }

        // BUGFIX: Merge inteligente de playerCorrectStatus
        // No sobrescribir con objeto vacío, hacer merge para preservar estado local
        if (newGameState.playerCorrectStatus !== undefined) {
          updates.playerCorrectStatus = {
            ...prevState.playerCorrectStatus,
            ...newGameState.playerCorrectStatus
          };
        }

        // Añadir canción al historial cuando se revela por primera vez
        if (newGameState.currentSong?.revealed && prevState.currentSong && !prevState.currentSong.revealed) {
          console.log('📜 Canción revelada, añadiendo al historial');
          setSongHistory(prev => [newGameState.currentSong, ...prev].slice(0, 10)); // Mantener solo últimas 10
        }

        // BUGFIX: NO resetear playerCorrectStatus automáticamente
        // El servidor es la fuente de verdad y debe controlar este estado.
        // Resetear aquí causa una race condition que impide marcar casillas.
        // if (!newGameState.currentSong && prevState.currentSong) {
        //   console.log('🔄 Nueva ronda detectada, reseteando estado de acertantes');
        //   updates.playerCorrectStatus = {};
        // }

        return updates;
      });
    };

    const handlePlayerPrediction = ({ playerName, prediction }) => {
      console.log(`[PREDICTION RECEIVED] ${playerName}: ${prediction}`);
      setGameState(prev => ({
        ...prev,
        playerPredictions: {
          ...prev.playerPredictions,
          [playerName]: prediction  // Solo la última predicción, no un array
        }
      }));
    };

    const handleError = (error) => {
      setConnectionError(error.message || 'Error desconocido');
    };

    const handlePlayerMarked = (data) => {
      console.log('🎯 GameMaster recibió playerMarkedCorrect:', data);
      setGameState(prev => ({
        ...prev,
        playerCorrectStatus: {
          ...prev.playerCorrectStatus,
          [data.playerId]: data.correct
        }
      }));
    };

    const handleMarkingEnabled = () => {
      console.log('✅ GameMaster recibió markingEnabled');
      setGameState(prev => ({ ...prev, isMarkingEnabled: true }));
    };

    const handleMarkingDisabled = () => {
      console.log('❌ GameMaster recibió markingDisabled');
      setGameState(prev => ({ ...prev, isMarkingEnabled: false }));
    };

    gameSocket.on('gameStateUpdate', handleGameStateUpdate);
    gameSocket.on('playerPrediction', handlePlayerPrediction);
    gameSocket.on('playerMarkedCorrect', handlePlayerMarked);
    gameSocket.on('markingEnabled', handleMarkingEnabled);
    gameSocket.on('markingDisabled', handleMarkingDisabled);
    gameSocket.on('error', handleError);

    return () => {
      gameSocket.off('gameStateUpdate', handleGameStateUpdate);
      gameSocket.off('playerPrediction', handlePlayerPrediction);
      gameSocket.off('playerMarkedCorrect', handlePlayerMarked);
      gameSocket.off('markingEnabled', handleMarkingEnabled);
      gameSocket.off('markingDisabled', handleMarkingDisabled);
      gameSocket.off('error', handleError);
    };
  }, [loggedIn, isTokenValid, roomCode, initialDifficulty, token]);

  // useEffect para el countdown del timer
  useEffect(() => {
    if (!timerRunning || timerPaused || timeRemaining <= 0) return;

    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          setTimerRunning(false);
          console.log('⏰ Timer completado');
          // Opcional: emitir evento al servidor
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timerRunning, timerPaused, timeRemaining]);

  // Funciones de control del timer
  const startTimer = useCallback((duration = timerDuration) => {
    console.log(`⏱️ Iniciando timer de ${duration} segundos`);
    setTimeRemaining(duration);
    setTimerRunning(true);
    setTimerPaused(false);
  }, [timerDuration]);

  const pauseTimer = useCallback(() => {
    console.log('⏸️ Timer pausado');
    setTimerPaused(true);
  }, []);

  const resumeTimer = useCallback(() => {
    console.log('▶️ Timer reanudado');
    setTimerPaused(false);
  }, []);

  const stopTimer = useCallback(() => {
    console.log('⏹️ Timer detenido');
    setTimerRunning(false);
    setTimerPaused(false);
    setTimeRemaining(timerDuration);
  }, [timerDuration]);

  const addTime = useCallback((seconds = 15) => {
    console.log(`➕ Agregando ${seconds} segundos al timer`);
    setTimeRemaining(prev => prev + seconds);
  }, []);

  const handlePlayerCorrectToggle = useCallback(async (playerId) => {
    try {
      console.log('🎯 Marcando jugador como correcto:', playerId);

      // NOTA: No hacemos actualización optimista aquí.
      // El estado se actualizará cuando recibamos el evento 'playerMarkedCorrect' del servidor
      const response = await gameSocket.markPlayerCorrect({ roomCode, playerId });

      if (response && response.error) {
        throw new Error(response.error);
      }

      console.log('✅ Solicitud de marcado confirmada por el servidor');

    } catch (error) {
      console.error('Error al marcar jugador:', error);
      setConnectionError('Error al marcar el acierto del jugador');
    }
  }, [roomCode]);

  const handleDifficultyChange = useCallback(async (newDifficulty) => {
    try {
      setDifficulty(newDifficulty);
      await gameSocket.updateRoom({ roomCode, difficulty: newDifficulty });
    } catch (error) {
      console.error('Error al cambiar dificultad:', error);
      setConnectionError(error.message);
      setDifficulty(difficulty);
    }
  }, [roomCode, difficulty]);

  const handleCategorySelected = useCallback(async (category) => {
    try {
      const response = await gameSocket.selectCategory({ roomCode, category });
      if (response && response.success === false) {
        console.error('Error al seleccionar categoría:', response.error);
        setConnectionError(response.error);
      }
    } catch (error) {
      console.error('Error al seleccionar categoría:', error);
      setConnectionError(error.message);
    }
  }, [roomCode]);

  const generateNewCard = useCallback(async () => {
    if (!gameState.currentCategory || !spotify) {
      console.log('No hay categoría seleccionada o Spotify no está disponible');
      setConnectionError('Debe seleccionar una categoría primero');
      return;
    }

    setIsLoading(true);
    setConnectionError(null);

    try {
      // Determinar qué tema musical usar
      let musicCategoryToUse;

      if (selectedMusicTheme === 'auto') {
        // Modo automático: elegir al azar entre los temas disponibles
        // TODO: cuando el servidor envíe los temas configurados, usarlos aquí
        // Por ahora, usamos todos los temas disponibles
        const availableCategories = Object.keys(ARTISTS);
        musicCategoryToUse = availableCategories[Math.floor(Math.random() * availableCategories.length)];
        console.log('🎲 Tema aleatorio seleccionado:', musicCategoryToUse);
      } else {
        // Modo manual: usar el tema seleccionado
        musicCategoryToUse = selectedMusicTheme;
        console.log('🎯 Tema manual seleccionado:', musicCategoryToUse);
      }

      const artistsInCategory = ARTISTS[musicCategoryToUse];
      if (!artistsInCategory || artistsInCategory.length === 0) {
        throw new Error(`No hay artistas disponibles en la categoría: ${musicCategoryToUse}`);
      }

      const randomArtist = artistsInCategory[Math.floor(Math.random() * artistsInCategory.length)];

      // 🎯 NUEVA LÓGICA DE SELECCIÓN CON FILTROS DE CALIDAD
      let randomTrack = null;

      try {
        // 1. Buscar el artista en Spotify para obtener su ID
        const artistSearchResponse = await spotify.searchArtists(randomArtist, { limit: 1 });

        if (artistSearchResponse.artists.items.length > 0) {
          const artistId = artistSearchResponse.artists.items[0].id;

          // 2. Obtener las canciones más populares del artista (Top Tracks)
          const topTracksResponse = await spotify.getArtistTopTracks(artistId, 'ES');
          let tracks = topTracksResponse.tracks || [];

          console.log(`🎵 ${tracks.length} canciones encontradas para ${randomArtist}`);

          if (tracks.length > 0) {
            // 3. Aplicar filtros de calidad
            const MIN_POPULARITY = 40;  // Popularidad mínima (0-100)
            const MIN_DURATION = 60000;  // 60 segundos en ms
            const MAX_DURATION = 480000; // 8 minutos en ms

            // Palabras que indican versiones no deseadas
            const unwantedKeywords = ['live', 'remix', 'version', 'remaster', 'remastered', 'demo', 'acoustic', 'instrumental'];

            // Aplicar todos los filtros
            let filteredTracks = tracks.filter(track => {
              // Filtro de popularidad
              if (track.popularity < MIN_POPULARITY) return false;

              // Filtro de duración
              if (track.duration_ms < MIN_DURATION || track.duration_ms > MAX_DURATION) return false;

              // Filtro de versiones no deseadas (priorizar versiones de álbum)
              const trackNameLower = track.name.toLowerCase();
              const hasUnwantedKeyword = unwantedKeywords.some(keyword => trackNameLower.includes(keyword));
              if (hasUnwantedKeyword) return false;

              return true;
            });

            console.log(`✅ ${filteredTracks.length} canciones después de aplicar filtros de calidad`);

            // Si no quedan canciones después de filtros estrictos, relajar filtros
            if (filteredTracks.length === 0) {
              console.log('⚠️ Relajando filtros...');
              filteredTracks = tracks.filter(track => {
                // Solo mantener filtros básicos
                return track.popularity >= MIN_POPULARITY &&
                       track.duration_ms >= MIN_DURATION &&
                       track.duration_ms <= MAX_DURATION;
              });
            }

            // Si aún no hay canciones, usar todas las top tracks
            if (filteredTracks.length === 0) {
              console.log('⚠️ Usando todas las top tracks sin filtros');
              filteredTracks = tracks;
            }

            // Seleccionar una canción aleatoria de las filtradas
            randomTrack = filteredTracks[Math.floor(Math.random() * filteredTracks.length)];
            console.log(`🎵 Canción seleccionada: ${randomTrack.name} (popularidad: ${randomTrack.popularity})`);
          }
        }
      } catch (error) {
        console.warn('⚠️ Error usando Top Tracks API, usando búsqueda tradicional:', error);
      }

      // Fallback: si no se pudo obtener con Top Tracks, usar búsqueda tradicional mejorada
      if (!randomTrack) {
        const response = await spotify.searchTracks(`artist:"${randomArtist}"`, { limit: 50, market: 'ES' });

        if (!response.tracks.items.length) {
          throw new Error('No se encontraron canciones para este artista.');
        }

        // Aplicar filtros básicos a la búsqueda tradicional
        let filteredTracks = response.tracks.items.filter(track =>
          track.popularity >= 40 &&
          track.duration_ms >= 60000 &&
          track.duration_ms <= 480000
        );

        if (filteredTracks.length === 0) {
          filteredTracks = response.tracks.items;
        }

        randomTrack = filteredTracks[Math.floor(Math.random() * filteredTracks.length)];
      }

      if (!randomTrack) {
        throw new Error('No se encontraron canciones.');
      }

      try {
        await spotify.playTrack(randomTrack.uri);
        console.log('✅ Canción enviada a Spotify para reproducción.');
      } catch (e) {
        console.error('🔥 Error de Spotify API:', e);
        setConnectionError('Error de Spotify: No se encontró un dispositivo activo. Asegúrate de tener Spotify abierto.');
        setIsLoading(false);
        return;
      }

      // Obtener la imagen del álbum (preferir tamaño mediano)
      const albumImage = randomTrack.album.images && randomTrack.album.images.length > 0
        ? randomTrack.album.images[1]?.url || randomTrack.album.images[0]?.url
        : null;

      const response2 = await gameSocket.startSong({
        roomCode,
        track: {
          uri: randomTrack.uri,
          title: randomTrack.name,
          artist: randomTrack.artists[0].name,
          year: parseInt(randomTrack.album.release_date.split('-')[0]),
          musicCategory: musicCategoryToUse,
          spotifyUrl: randomTrack.external_urls.spotify,
          albumImage: albumImage,
          albumName: randomTrack.album.name
        }
      });

      if (response2 && response2.success === false) {
        console.error('Error al iniciar canción:', response2.error);
        setConnectionError(response2.error);
      } else {
        // Abrir Spotify automáticamente para que el GM pueda dar play
        window.open(randomTrack.external_urls.spotify, '_blank');
        console.log('🎵 Abriendo Spotify en nueva pestaña');

        // Iniciar timer automáticamente después de generar la tarjeta
        startTimer();
      }

    } catch (error) {
      console.error("Error generando tarjeta:", error);
      if (error?.status === 401 || error?.body?.error?.status === 401) {
        setIsTokenValid(false);
        logout();
      } else {
        setConnectionError(error.message || 'Error al generar la tarjeta');
      }
    } finally {
      setIsLoading(false);
    }
  }, [gameState.currentCategory, spotify, roomCode, logout, startTimer, selectedMusicTheme]);

  const handleRevealSong = useCallback(async () => {
    try {
      // Detener el timer cuando se revela la canción
      stopTimer();
      await gameSocket.revealSong({ roomCode });
    } catch (error) {
      console.error('Error al revelar canción:', error);
      setConnectionError('Error al revelar la canción');
    }
  }, [roomCode, stopTimer]);

  const handleMarkingToggle = useCallback(async () => {
    const action = gameState.isMarkingEnabled ? 'disableMarking' : 'enableMarking';
    const newMarkingState = !gameState.isMarkingEnabled;

    console.log(`🚀 Cambiando estado de marcado a: ${newMarkingState}`);

    try {
      // NOTA: No hacemos actualización optimista aquí.
      // El estado se actualizará cuando recibamos los eventos 'markingEnabled' o 'markingDisabled' del servidor
      const response = await gameSocket[action]({ roomCode });
      console.log(`✅ Acción '${action}' confirmada:`, response);

    } catch (error) {
      console.error(`🔥 Error en '${action}':`, error);
      setConnectionError(`Error al cambiar el estado de marcado: ${error.message}`);
    }
  }, [roomCode, gameState.isMarkingEnabled]);

  const finishGame = useCallback(async () => {
    try {
      await gameSocket.gameOver({ roomCode });
    } catch (error) {
      console.error('Error al finalizar el juego:', error);
      setConnectionError('Error al finalizar el juego');
    }
  }, [roomCode]);

  const startNewRound = useCallback(async () => {
    try {
      console.log('🔄 Iniciando nueva ronda...');
      // Detener y resetear el timer
      stopTimer();
      const response = await gameSocket.restartGame({ roomCode });

      if (response && response.error) {
        throw new Error(response.error);
      }

      console.log('✅ Nueva ronda iniciada exitosamente');
    } catch (error) {
      console.error('❌ Error al iniciar nueva ronda:', error);
      setConnectionError(`Error al iniciar nueva ronda: ${error.message}`);
    }
  }, [roomCode, stopTimer]);

  return {
    ...gameState,
    selectedCategory: gameState.currentCategory,
    difficulty,
    isLoading,
    connectionError,
    isTokenValid,
    tokenWarning,
    serverWaking,
    songHistory,
    loggedIn,
    login,
    logout,
    setConnectionError,
    handlePlayerCorrectToggle,
    handleDifficultyChange,
    handleCategorySelected,
    generateNewCard,
    handleRevealSong,
    handleMarkingToggle,
    startNewRound,
    finishGame,
    // Timer
    timerDuration,
    timerRunning,
    timerPaused,
    timeRemaining,
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    addTime,
    // Music theme selection
    selectedMusicTheme,
    setSelectedMusicTheme
  };
};