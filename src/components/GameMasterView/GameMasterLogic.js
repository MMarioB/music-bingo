import { useState, useCallback, useEffect } from 'react';
import { useSpotify } from '../../hooks/useSpotify';
import { gameSocket } from '../../services/socketService';
import { ARTISTS } from './constants';
import { getStoredToken } from '../../lib/spotify';

export const useGameMasterLogic = ({ roomCode, initialDifficulty }) => {
  const { spotify, loggedIn, login, logout, token, initializeRoom } = useSpotify();
  const [currentCard, setCurrentCard] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [gameStep, setGameStep] = useState('init');
  const [connectedPlayers, setConnectedPlayers] = useState([]);
  const [difficulty, setDifficulty] = useState(initialDifficulty);
  const [connectionError, setConnectionError] = useState(null);
  const [isMarkingEnabled, setIsMarkingEnabled] = useState(false);
  const [allPlayersReady, setAllPlayersReady] = useState(false);
  const [isTokenValid, setIsTokenValid] = useState(true);
  const [songPlaying, setSongPlaying] = useState(false);
  const [playerPredictions, setPlayerPredictions] = useState({});

  // Verificar estado de autenticación al inicio y cuando cambie el token
  useEffect(() => {
    const checkAuthState = () => {
      if (!token) {
        setGameStep('init');
        return;
      }

      const tokenData = localStorage.getItem('spotify_token');
      if (!tokenData || !isTokenValid) {
        setIsTokenValid(false);
        logout();
        setGameStep('init');
        return;
      }

      setIsTokenValid(true);
      if (gameStep === 'init') {
        setGameStep('wheel');
      }
    };

    checkAuthState();
  }, [token, logout, gameStep, isTokenValid]);

  // Verificar si todos los jugadores están listos
  const checkAllPlayersReady = useCallback((players) => {
    const ready = players.every(player => player.ready || player.isHost);
    setAllPlayersReady(ready);
  }, []);

  // Inicializar sala con el token de Spotify
  const initializeGameRoom = useCallback(async () => {
    if (!loggedIn || !isTokenValid) {
      setGameStep('init');
      return;
    }

    try {
      console.log('Iniciando sala:', roomCode);
      await gameSocket.connect();
      
      // Obtener el token almacenado
      const tokenData = getStoredToken();
      if (!tokenData) {
        throw new Error('No token available');
      }

      // Inicializar la sala con el token
      await initializeRoom(roomCode, tokenData.access_token, tokenData.expires_in);
      
      const roomResponse = await gameSocket.createRoom({
        roomCode,
        difficulty,
        maxPlayers: 12,
        host: true
      });

      if (roomResponse?.players) {
        console.log('Jugadores iniciales:', roomResponse.players);
        setConnectedPlayers(roomResponse.players);
        checkAllPlayersReady(roomResponse.players);
      }
    } catch (error) {
      console.error('Error inicializando sala:', error);
      setConnectionError(error.message);
      if (error.message.includes('token')) {
        setIsTokenValid(false);
        logout();
        setGameStep('init');
      }
    }
  }, [roomCode, difficulty, loggedIn, isTokenValid, initializeRoom, logout, checkAllPlayersReady]);

  // Efecto para eventos del socket y manejo de token
  useEffect(() => {
    if (!loggedIn || !isTokenValid) return;

    const handlers = {
      playersUpdate: ({ players }) => {
        console.log('Actualización de jugadores:', players);
        setConnectedPlayers(players);
        checkAllPlayersReady(players);
      },
      playerPrediction: ({ playerName, prediction }) => {
        console.log('Predicción recibida:', playerName, prediction);
        setPlayerPredictions(prev => ({
          ...prev,
          [playerName]: [...(prev[playerName] || []), prediction]
        }));
      },
      spotifyTokenUpdated: () => {
        console.log('Token de Spotify actualizado');
        // El hook useSpotify se encargará de actualizar el token
      },
      gameStartFailed: (error) => {
        console.error('Error al iniciar juego:', error);
        setConnectionError(error.message);
        setGameStep('wheel');
      },
      error: (error) => {
        console.error('Error en socket:', error);
        setConnectionError(error.message);
        if (error.message.includes('token')) {
          setIsTokenValid(false);
          logout();
          setGameStep('init');
        }
      }
    };

    Object.entries(handlers).forEach(([event, handler]) => {
      gameSocket.on(event, handler);
    });

    initializeGameRoom();

    return () => {
      Object.keys(handlers).forEach(event => {
        gameSocket.off(event);
      });
      gameSocket.disconnect();
    };
  }, [initializeGameRoom, loggedIn, isTokenValid, logout, checkAllPlayersReady]);

  // Manejar cambio de dificultad
  const handleDifficultyChange = useCallback(async (newDifficulty) => {
    if (!loggedIn || !isTokenValid) {
      setGameStep('init');
      return;
    }

    try {
      setDifficulty(newDifficulty);
      await gameSocket.updateRoom({
        roomCode,
        difficulty: newDifficulty
      });
    } catch (error) {
      console.error('Error al cambiar dificultad:', error);
      setConnectionError(error.message);
    }
  }, [roomCode, loggedIn, isTokenValid]);

  // Manejar selección de categoría
  const handleCategorySelected = useCallback(async (category) => {
    if (!loggedIn || !isTokenValid) {
      setGameStep('init');
      return;
    }

    try {
      await gameSocket.selectCategory({
        roomCode,
        category
      });
      setSelectedCategory(category);
      setGameStep('card');
      setIsMarkingEnabled(false);
      setCurrentCard(null);
      setSongPlaying(false);
      setPlayerPredictions({});
    } catch (error) {
      console.error('Error al seleccionar categoría:', error);
      setConnectionError(error.message);
    }
  }, [roomCode, loggedIn, isTokenValid]);

  // Generar nueva carta
  const generateNewCard = useCallback(async () => {
    if (!loggedIn || !isTokenValid || !selectedCategory || !spotify) return;

    setIsLoading(true);
    try {
      const randomMusicCategory = Object.keys(ARTISTS)[Math.floor(Math.random() * Object.keys(ARTISTS).length)];
      const artistsInCategory = ARTISTS[randomMusicCategory];
      const randomArtist = artistsInCategory[Math.floor(Math.random() * artistsInCategory.length)];

      const response = await spotify.searchTracks(`artist:"${randomArtist}"`, {
        limit: 50,
        market: 'ES'
      });

      const tracks = response.tracks.items;
      if (!tracks.length) {
        throw new Error('No se encontraron canciones');
      }

      const randomTrack = tracks[Math.floor(Math.random() * tracks.length)];
      const year = parseInt(randomTrack.album.release_date.split('-')[0]);

      const newCard = {
        title: randomTrack.name,
        artist: randomTrack.artists[0].name,
        year,
        spotifyUrl: randomTrack.external_urls.spotify,
        musicCategory: randomMusicCategory,
        revealed: false
      };

      setCurrentCard(newCard);
      
      // Notificar que la canción ha comenzado
      await gameSocket.startSong({ roomCode });
      setSongPlaying(true);
      
    } catch (error) {
      console.error("Error generando tarjeta:", error);
      if (error.status === 401) {
        setIsTokenValid(false);
        logout();
        setGameStep('init');
      } else {
        setConnectionError('Error al generar la tarjeta');
      }
    } finally {
      setIsLoading(false);
    }
  }, [loggedIn, isTokenValid, selectedCategory, spotify, roomCode, logout]);

  // Revelar canción
  const handleRevealSong = useCallback(async () => {
    if (!currentCard || !loggedIn || !isTokenValid) return;

    try {
      await gameSocket.revealSong({
        roomCode,
        songData: {
          title: currentCard.title,
          artist: currentCard.artist,
          year: currentCard.year
        }
      });
      setCurrentCard(prev => ({ ...prev, revealed: true }));
      setSongPlaying(false);
    } catch (error) {
      console.error('Error al revelar canción:', error);
      setConnectionError('Error al revelar la canción');
    }
  }, [currentCard, roomCode, loggedIn, isTokenValid]);

  // Manejar marcado
  const handleMarkingToggle = useCallback(async () => {
    if (!loggedIn || !isTokenValid) return;

    try {
      if (isMarkingEnabled) {
        await gameSocket.disableMarking({ roomCode });
        setIsMarkingEnabled(false);
      } else {
        await gameSocket.enableMarking({ roomCode });
        setIsMarkingEnabled(true);
      }
    } catch (error) {
      console.error('Error al cambiar estado de marcado:', error);
      setConnectionError('Error al cambiar estado de marcado');
    }
  }, [isMarkingEnabled, roomCode, loggedIn, isTokenValid]);

  // Iniciar nueva ronda
  const startNewRound = useCallback(async () => {
    if (!loggedIn || !isTokenValid) return;

    try {
      await gameSocket.disableMarking({ roomCode });
      setCurrentCard(null);
      setSelectedCategory(null);
      setGameStep('wheel');
      setIsMarkingEnabled(false);
      setSongPlaying(false);
      setPlayerPredictions({});
    } catch (error) {
      console.error('Error al iniciar nueva ronda:', error);
      setConnectionError('Error al iniciar nueva ronda');
    }
  }, [roomCode, loggedIn, isTokenValid]);

  return {
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
    handleDifficultyChange,
    handleCategorySelected,
    generateNewCard,
    handleRevealSong,
    handleMarkingToggle,
    startNewRound,
    setCurrentCard
  };
};