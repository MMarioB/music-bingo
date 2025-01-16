import { useState, useCallback, useEffect } from 'react';
import { useSpotify } from '../../hooks/useSpotify';
import { gameSocket } from '../../services/socketService';
import { ARTISTS } from './constants';

export const useGameMasterLogic = ({ roomCode, initialDifficulty }) => {
  const { spotify, loggedIn, login } = useSpotify();
  const [currentCard, setCurrentCard] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [gameStep, setGameStep] = useState('wheel');
  const [connectedPlayers, setConnectedPlayers] = useState([]);
  const [difficulty, setDifficulty] = useState(initialDifficulty);
  const [connectionError, setConnectionError] = useState(null);
  const [isMarkingEnabled, setIsMarkingEnabled] = useState(false);
  const [allPlayersReady, setAllPlayersReady] = useState(false);

  // Función para verificar si todos los jugadores están listos
  const checkAllPlayersReady = useCallback((players) => {
    const ready = players.every(player => player.ready || player.isHost);
    setAllPlayersReady(ready);
  }, []);

  // Función para manejar errores
  const handleError = useCallback((error, customMessage) => {
    console.error(customMessage, error);
    setConnectionError(error.message || customMessage);
  }, []);

  // Habilitar/Deshabilitar marcado
  const handleMarkingToggle = useCallback(async () => {
    try {
      if (isMarkingEnabled) {
        await gameSocket.disableMarking({ roomCode });
        setIsMarkingEnabled(false);
      } else {
        await gameSocket.enableMarking({ roomCode });
        setIsMarkingEnabled(true);
      }
    } catch (error) {
      handleError(error, 'Error al cambiar estado de marcado');
    }
  }, [isMarkingEnabled, roomCode, handleError]);

  // Iniciar sala
  const initializeRoom = useCallback(async () => {
    try {
      console.log('Iniciando sala:', roomCode);
      await gameSocket.connect();
      
      const roomResponse = await gameSocket.createRoom({
        roomCode,
        difficulty,
        maxPlayers: 8,
        host: true
      });

      if (roomResponse?.players) {
        console.log('Jugadores iniciales:', roomResponse.players);
        setConnectedPlayers(roomResponse.players);
        checkAllPlayersReady(roomResponse.players);
      }
    } catch (error) {
      handleError(error, 'Error inicializando sala');
    }
  }, [roomCode, difficulty, checkAllPlayersReady, handleError]);

  // Manejar cambio de dificultad
  const handleDifficultyChange = useCallback(async (newDifficulty) => {
    try {
      setDifficulty(newDifficulty);
      await gameSocket.updateRoom({
        roomCode,
        difficulty: newDifficulty
      });
    } catch (error) {
      handleError(error, 'Error al cambiar dificultad');
    }
  }, [roomCode, handleError]);

  // Manejar selección de categoría
  const handleCategorySelected = useCallback(async (category) => {
    try {
      await gameSocket.selectCategory({
        roomCode,
        category
      });
      setSelectedCategory(category);
      setGameStep('card');
      setIsMarkingEnabled(false);
      setCurrentCard(null);
    } catch (error) {
      handleError(error, 'Error al seleccionar categoría');
    }
  }, [roomCode, handleError]);

  // Generar nueva carta
  const generateNewCard = useCallback(async () => {
    if (!loggedIn || !selectedCategory || !spotify) return;

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
    } catch (error) {
      handleError(error, 'Error al generar la tarjeta');
    } finally {
      setIsLoading(false);
    }
  }, [loggedIn, selectedCategory, spotify, handleError]);

  // Revelar canción
  const handleRevealSong = useCallback(async () => {
    if (!currentCard) return;
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
    } catch (error) {
      handleError(error, 'Error al revelar la canción');
    }
  }, [currentCard, roomCode, handleError]);

  // Iniciar nueva ronda
  const startNewRound = useCallback(async () => {
    try {
      await gameSocket.disableMarking({ roomCode });
      setCurrentCard(null);
      setSelectedCategory(null);
      setGameStep('wheel');
      setIsMarkingEnabled(false);
    } catch (error) {
      handleError(error, 'Error al iniciar nueva ronda');
    }
  }, [roomCode, handleError]);

  // Efecto para eventos del socket
  useEffect(() => {
    const handlers = {
      playersUpdate: ({ players }) => {
        console.log('Actualización de jugadores:', players);
        setConnectedPlayers(players);
        checkAllPlayersReady(players);
      },
      gameStartFailed: (error) => {
        handleError(error, 'Error al iniciar juego');
        setGameStep('wheel');
      },
      error: (error) => {
        handleError(error, 'Error en socket');
      }
    };

    // Registrar handlers
    Object.entries(handlers).forEach(([event, handler]) => {
      gameSocket.on(event, handler);
    });

    // Inicializar sala solo si tenemos un roomCode válido
    if (roomCode) {
      initializeRoom();
    }

    // Limpieza
    return () => {
      Object.keys(handlers).forEach(event => {
        gameSocket.off(event);
      });
      gameSocket.disconnect();
    };
  }, [initializeRoom, checkAllPlayersReady, roomCode, handleError]);

  return {
    loggedIn,
    login,
    currentCard,
    isLoading,
    selectedCategory,
    gameStep,
    connectedPlayers,
    difficulty,
    connectionError,
    isMarkingEnabled,
    allPlayersReady,
    handleDifficultyChange,
    handleCategorySelected,
    generateNewCard,
    handleRevealSong,
    handleMarkingToggle,
    startNewRound,
    setCurrentCard
  };
};