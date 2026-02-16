import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
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

  // Ref para acceso estable en event handlers
  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;

  // Listen for server waking events
  useEffect(() => {
    const handleServerWaking = (event) => {
      setServerWaking(true);
      setConnectionError(event.detail?.message || '⏳ El servidor está despertando...');
    };
    const handleServerAwake = () => {
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
        setTokenWarning(null);
      }
    };

    checkTokenExpiration();
    const interval = setInterval(checkTokenExpiration, 60000);
    return () => clearInterval(interval);
  }, [loggedIn, token, logout]);

  // Socket connection and event handlers
  // Separar initializeSocketConnection para no re-registrar listeners por token
  const hasInitialized = useRef(false);

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
          setGameState(prevState => ({
            ...prevState,
            gameStep: 'waiting',
          }));
        }
      } catch (error) {
        console.error('Error al inicializar conexión del Host:', error);
        setConnectionError(error.message);
      }
    };

    initializeSocketConnection();

    const handleGameStateUpdate = (newGameState) => {
      setGameState(prevState => {
        const updates = {
          ...prevState,
          ...newGameState,
          isMarkingEnabled: newGameState.isMarkingEnabled !== undefined
            ? newGameState.isMarkingEnabled
            : prevState.isMarkingEnabled,
        };

        if (newGameState.currentSong &&
            (!prevState.currentSong || newGameState.currentSong.uri !== prevState.currentSong.uri)) {
          updates.playerPredictions = {};
        }

        if (newGameState.playerCorrectStatus !== undefined) {
          updates.playerCorrectStatus = {
            ...prevState.playerCorrectStatus,
            ...newGameState.playerCorrectStatus
          };
        }

        if (newGameState.currentSong?.revealed && prevState.currentSong && !prevState.currentSong.revealed) {
          setSongHistory(prev => [newGameState.currentSong, ...prev].slice(0, 10));
        }

        return updates;
      });
    };

    const handlePlayerPrediction = ({ playerName, prediction }) => {
      setGameState(prev => ({
        ...prev,
        playerPredictions: {
          ...prev.playerPredictions,
          [playerName]: prediction
        }
      }));
    };

    const handleError = (error) => {
      setConnectionError(error.message || 'Error desconocido');
    };

    const handlePlayerMarked = (data) => {
      setGameState(prev => ({
        ...prev,
        playerCorrectStatus: {
          ...prev.playerCorrectStatus,
          [data.playerId]: data.correct
        }
      }));
    };

    const handleMarkingEnabled = () => {
      setGameState(prev => ({ ...prev, isMarkingEnabled: true }));
    };

    const handleMarkingDisabled = () => {
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

  // Timer countdown
  useEffect(() => {
    if (!timerRunning || timerPaused || timeRemaining <= 0) return;

    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          setTimerRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timerRunning, timerPaused, timeRemaining]);

  // Timer control functions
  const startTimer = useCallback((duration = timerDuration) => {
    setTimeRemaining(duration);
    setTimerRunning(true);
    setTimerPaused(false);
  }, [timerDuration]);

  const pauseTimer = useCallback(() => {
    setTimerPaused(true);
  }, []);

  const resumeTimer = useCallback(() => {
    setTimerPaused(false);
  }, []);

  const stopTimer = useCallback(() => {
    setTimerRunning(false);
    setTimerPaused(false);
    setTimeRemaining(timerDuration);
  }, [timerDuration]);

  const addTime = useCallback((seconds = 15) => {
    setTimeRemaining(prev => prev + seconds);
  }, []);

  const handlePlayerCorrectToggle = useCallback(async (playerId) => {
    try {
      const response = await gameSocket.markPlayerCorrect({ roomCode, playerId });
      if (response && response.error) {
        throw new Error(response.error);
      }
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
    const currentState = gameStateRef.current;
    if (!currentState.currentCategory || !spotify) {
      setConnectionError('Debe seleccionar una categoría primero');
      return;
    }

    setIsLoading(true);
    setConnectionError(null);

    try {
      let musicCategoryToUse;

      if (selectedMusicTheme === 'auto') {
        const availableCategories = Object.keys(ARTISTS);
        musicCategoryToUse = availableCategories[Math.floor(Math.random() * availableCategories.length)];
      } else {
        musicCategoryToUse = selectedMusicTheme;
      }

      const artistsInCategory = ARTISTS[musicCategoryToUse];
      if (!artistsInCategory || artistsInCategory.length === 0) {
        throw new Error(`No hay artistas disponibles en la categoría: ${musicCategoryToUse}`);
      }

      const randomArtist = artistsInCategory[Math.floor(Math.random() * artistsInCategory.length)];

      let randomTrack = null;

      try {
        const artistSearchResponse = await spotify.searchArtists(randomArtist, { limit: 10 });

        if (artistSearchResponse.artists.items.length > 0) {
          const exactMatch = artistSearchResponse.artists.items.find(artist => {
            const artistNameLower = artist.name.toLowerCase().trim();
            const searchNameLower = randomArtist.toLowerCase().trim();
            return artistNameLower === searchNameLower ||
                   artistNameLower.replace(/\s+/g, '') === searchNameLower.replace(/\s+/g, '');
          });

          let artistId;

          if (exactMatch) {
            artistId = exactMatch.id;
          } else {
            const partialMatch = artistSearchResponse.artists.items.find(artist => {
              const artistNameLower = artist.name.toLowerCase();
              const searchNameLower = randomArtist.toLowerCase();
              return artistNameLower.includes(searchNameLower) && artist.popularity > 30;
            });

            if (!partialMatch) {
              throw new Error('No se encontró un artista válido');
            }
            artistId = partialMatch.id;
          }

          if (!artistId) {
            throw new Error('No se encontró un artista válido');
          }

          const topTracksResponse = await spotify.getArtistTopTracks(artistId, 'ES');
          let tracks = topTracksResponse.tracks || [];

          if (tracks.length > 0) {
            const MIN_POPULARITY = 40;
            const MIN_DURATION = 60000;
            const MAX_DURATION = 480000;
            const unwantedKeywords = ['live', 'remix', 'version', 'remaster', 'remastered', 'demo', 'acoustic', 'instrumental'];

            let filteredTracks = tracks.filter(track => {
              if (track.popularity < MIN_POPULARITY) return false;
              if (track.duration_ms < MIN_DURATION || track.duration_ms > MAX_DURATION) return false;
              const trackNameLower = track.name.toLowerCase();
              return !unwantedKeywords.some(keyword => trackNameLower.includes(keyword));
            });

            if (filteredTracks.length === 0) {
              filteredTracks = tracks.filter(track =>
                track.popularity >= MIN_POPULARITY &&
                track.duration_ms >= MIN_DURATION &&
                track.duration_ms <= MAX_DURATION
              );
            }

            if (filteredTracks.length === 0) {
              filteredTracks = tracks;
            }

            randomTrack = filteredTracks[Math.floor(Math.random() * filteredTracks.length)];
          }
        }
      } catch (error) {
        console.warn('Error usando Top Tracks API, usando búsqueda tradicional:', error);
      }

      if (!randomTrack) {
        const response = await spotify.searchTracks(`artist:"${randomArtist}"`, { limit: 50, market: 'ES' });

        if (!response.tracks.items.length) {
          throw new Error('No se encontraron canciones para este artista.');
        }

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
          previewUrl: randomTrack.preview_url || null,
          albumImage: albumImage,
          albumName: randomTrack.album.name
        }
      });

      if (response2 && response2.success === false) {
        console.error('Error al iniciar canción:', response2.error);
        setConnectionError(response2.error);
      } else {
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
  }, [spotify, roomCode, logout, startTimer, selectedMusicTheme]);

  const handleRevealSong = useCallback(async () => {
    try {
      stopTimer();
      await gameSocket.revealSong({ roomCode });
    } catch (error) {
      console.error('Error al revelar canción:', error);
      setConnectionError('Error al revelar la canción');
    }
  }, [roomCode, stopTimer]);

  const handleMarkingToggle = useCallback(async () => {
    const currentState = gameStateRef.current;
    const action = currentState.isMarkingEnabled ? 'disableMarking' : 'enableMarking';

    try {
      const response = await gameSocket[action]({ roomCode });
      if (response && response.error) {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error(`Error en '${action}':`, error);
      setConnectionError(`Error al cambiar el estado de marcado: ${error.message}`);
    }
  }, [roomCode]);

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
      stopTimer();
      const response = await gameSocket.restartGame({ roomCode });
      if (response && response.error) {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('Error al iniciar nueva ronda:', error);
      setConnectionError(`Error al iniciar nueva ronda: ${error.message}`);
    }
  }, [roomCode, stopTimer]);

  // Memoizar retorno para estabilizar referencia
  return useMemo(() => ({
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
    timerDuration,
    timerRunning,
    timerPaused,
    timeRemaining,
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    addTime,
    selectedMusicTheme,
    setSelectedMusicTheme
  }), [
    gameState, difficulty, isLoading, connectionError, isTokenValid,
    tokenWarning, serverWaking, songHistory, loggedIn, login, logout,
    handlePlayerCorrectToggle, handleDifficultyChange, handleCategorySelected,
    generateNewCard, handleRevealSong, handleMarkingToggle, startNewRound,
    finishGame, timerDuration, timerRunning, timerPaused, timeRemaining,
    startTimer, pauseTimer, resumeTimer, stopTimer, addTime,
    selectedMusicTheme
  ]);
};
