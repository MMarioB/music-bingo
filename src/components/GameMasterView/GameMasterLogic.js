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

  // Manejo centralizado de errores
  const handleError = useCallback((error, customMessage) => {
    const errorMessage = error?.message || customMessage;
    console.error(customMessage, error);
    setConnectionError(errorMessage);
    
    // Reiniciar estados si es necesario
    if (error?.type === 'CONNECTION_ERROR') {
      setGameStep('wheel');
      setCurrentCard(null);
      setIsMarkingEnabled(false);
    }
  }, []);

  // Verificación de jugadores listos
  const checkAllPlayersReady = useCallback((players) => {
    if (!players?.length) return false;
    const ready = players.every(player => player.ready || player.isHost);
    setAllPlayersReady(ready);
    return ready;
  }, []);

  // Inicialización de sala mejorada
  const initializeRoom = useCallback(async () => {
    try {
      console.log('Iniciando sala:', roomCode);
      await gameSocket.disconnect();
      await new Promise(resolve => setTimeout(resolve, 100));
      await gameSocket.connect();
      
      const roomResponse = await gameSocket.createRoom({
        roomCode,
        difficulty,
        maxPlayers: 8,
        host: true,
        isHost: true,
        isGameMaster: true
      });

      console.log('Respuesta de creación de sala:', roomResponse);

      if (!roomResponse) {
        throw new Error('No se pudo crear la sala');
      }

      if (roomResponse?.players) {
        console.log('Jugadores iniciales:', roomResponse.players);
        setConnectedPlayers(roomResponse.players);
        checkAllPlayersReady(roomResponse.players);
      }

    } catch (error) {
      console.error('Error inicializando sala:', error);
      handleError(error, 'Error inicializando sala');
    }
  }, [roomCode, difficulty, checkAllPlayersReady, handleError]);

  // Manejo de dificultad mejorado
  const handleDifficultyChange = useCallback(async (newDifficulty) => {
    try {
      setDifficulty(newDifficulty);
      await gameSocket.updateRoom({
        roomCode,
        difficulty: newDifficulty,
        updateType: 'difficulty'
      });
    } catch (error) {
      handleError(error, 'Error al cambiar dificultad');
    }
  }, [roomCode, handleError]);

  // Selección de categoría mejorada
  const handleCategorySelected = useCallback(async (category) => {
    try {
      const response = await gameSocket.selectCategory({
        roomCode,
        category,
        timestamp: Date.now()
      });

      if (!response) {
        throw new Error('No se recibió respuesta al seleccionar categoría');
      }

      setSelectedCategory(category);
      setGameStep('card');
      setIsMarkingEnabled(false);
      setCurrentCard(null);
    } catch (error) {
      handleError(error, 'Error al seleccionar categoría');
    }
  }, [roomCode, handleError]);

  // Generación de carta mejorada
  const generateNewCard = useCallback(async () => {
    if (!loggedIn || !selectedCategory || !spotify) {
      console.log('No se cumplen las condiciones para generar carta');
      return;
    }

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
      if (!tracks?.length) {
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

  // Revelación de canción mejorada
  const handleRevealSong = useCallback(async () => {
    if (!currentCard) {
      console.log('No hay carta para revelar');
      return;
    }

    try {
      await gameSocket.revealSong({
        roomCode,
        songData: {
          title: currentCard.title,
          artist: currentCard.artist,
          year: currentCard.year,
          timestamp: Date.now()
        }
      });
      
      setCurrentCard(prev => ({ ...prev, revealed: true }));
    } catch (error) {
      handleError(error, 'Error al revelar la canción');
    }
  }, [currentCard, roomCode, handleError]);

  // Control de marcado mejorado
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

  // Nueva ronda mejorada
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

  // Manejo de eventos del socket mejorado
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
      roomCreated: (response) => {
        console.log('Sala creada exitosamente:', response);
      },
      roomError: (error) => {
        handleError(error, 'Error en la sala');
      },
      playerLeft: (playerId) => {
        console.log('Jugador abandonó la sala:', playerId);
        setConnectedPlayers(prev => prev.filter(p => p.id !== playerId));
      },
      error: (error) => {
        handleError(error, 'Error en socket');
      },
      disconnect: (reason) => {
        console.log('Desconectado:', reason);
        handleError({ message: 'Desconectado del servidor', type: 'CONNECTION_ERROR' });
      },
      reconnect: (attemptNumber) => {
        console.log('Reconectando... intento:', attemptNumber);
      },
      reconnect_error: (error) => {
        handleError(error, 'Error al reconectar');
      }
    };

    // Registrar handlers
    Object.entries(handlers).forEach(([event, handler]) => {
      gameSocket.on(event, handler);
    });

    // Solo inicializar si tenemos roomCode y no hay error
    if (roomCode && !connectionError) {
      initializeRoom().catch(error => 
        handleError(error, 'Error en la inicialización de la sala')
      );
    }

    return () => {
      Object.keys(handlers).forEach(event => {
        gameSocket.off(event);
      });
      gameSocket.disconnect();
    };
  }, [initializeRoom, checkAllPlayersReady, roomCode, handleError, connectionError]);

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
    setConnectionError,
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