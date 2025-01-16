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
  const [isReconnecting, setIsReconnecting] = useState(false);

  // Función para verificar si todos los jugadores están listos
  const checkAllPlayersReady = useCallback((players) => {
    if (!players?.length) return;
    const ready = players.every(player => player.ready || player.isHost);
    setAllPlayersReady(ready);
  }, []);

  // Función para manejar errores mejorada
  const handleError = useCallback((error, customMessage) => {
    console.error(customMessage, error);
    setConnectionError(error.message || customMessage);
    
    if (error?.type === 'CONNECTION_ERROR') {
      setCurrentCard(null);
      setIsMarkingEnabled(false);
      setGameStep('wheel');
    }
  }, []);

  // Habilitar/Deshabilitar marcado mejorado
  const handleMarkingToggle = useCallback(async () => {
    try {
      if (isMarkingEnabled) {
        await gameSocket.disableMarking({ roomCode, timestamp: Date.now() });
        setIsMarkingEnabled(false);
      } else {
        await gameSocket.enableMarking({ roomCode, timestamp: Date.now() });
        setIsMarkingEnabled(true);
      }
    } catch (error) {
      handleError(error, 'Error al cambiar estado de marcado');
      // Revertir el estado en caso de error
      setIsMarkingEnabled(prev => !prev);
    }
  }, [isMarkingEnabled, roomCode, handleError]);

  // Iniciar sala mejorado
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
        isHost: true
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

  // Manejar cambio de dificultad mejorado
  const handleDifficultyChange = useCallback(async (newDifficulty) => {
    try {
      setDifficulty(newDifficulty);
      await gameSocket.updateRoom({
        roomCode,
        difficulty: newDifficulty,
        timestamp: Date.now()
      });
    } catch (error) {
      handleError(error, 'Error al cambiar dificultad');
      setDifficulty(prev => prev); // Revertir en caso de error
    }
  }, [roomCode, handleError]);

  // Manejar selección de categoría mejorado
  const handleCategorySelected = useCallback(async (category) => {
    try {
      setSelectedCategory(category);
      setGameStep('card');
      setIsMarkingEnabled(false);
      setCurrentCard(null);

      await gameSocket.selectCategory({
        roomCode,
        category,
        timestamp: Date.now()
      });
    } catch (error) {
      setSelectedCategory(null);
      setGameStep('wheel');
      handleError(error, 'Error al seleccionar categoría');
    }
  }, [roomCode, handleError]);

  // Generar nueva carta mejorado
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

      if (!response?.tracks?.items?.length) {
        throw new Error('No se encontraron canciones');
      }

      const randomTrack = response.tracks.items[Math.floor(Math.random() * response.tracks.items.length)];
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

  // Revelar canción mejorado
  const handleRevealSong = useCallback(async () => {
    if (!currentCard) return;
    try {
      const songData = {
        title: currentCard.title,
        artist: currentCard.artist,
        year: currentCard.year,
        timestamp: Date.now()
      };

      await gameSocket.revealSong({
        roomCode,
        songData
      });
      
      setCurrentCard(prev => ({ ...prev, revealed: true }));
    } catch (error) {
      handleError(error, 'Error al revelar la canción');
      // No revertimos el estado porque podría causar desincronización
    }
  }, [currentCard, roomCode, handleError]);

  // Iniciar nueva ronda mejorado
  const startNewRound = useCallback(async () => {
    try {
      await gameSocket.disableMarking({ 
        roomCode,
        timestamp: Date.now()
      });
      
      setCurrentCard(null);
      setSelectedCategory(null);
      setGameStep('wheel');
      setIsMarkingEnabled(false);
    } catch (error) {
      handleError(error, 'Error al iniciar nueva ronda');
    }
  }, [roomCode, handleError]);

  // Efecto para eventos del socket mejorado
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
      playerJoinedRoom: (player) => {
        console.log('Jugador unido:', player);
        setConnectedPlayers(prev => [...prev, player]);
      },
      playerLeftRoom: (playerId) => {
        console.log('Jugador abandonó:', playerId);
        setConnectedPlayers(prev => prev.filter(p => p.id !== playerId));
      },
      error: (error) => {
        handleError(error, 'Error en socket');
      },
      disconnect: (reason) => {
        console.log('Desconectado del servidor:', reason);
        setIsReconnecting(true);
        handleError({ 
          message: 'Desconectado del servidor', 
          type: 'CONNECTION_ERROR' 
        }, 'Error de conexión');
      },
      reconnect: (attemptNumber) => {
        console.log('Reconectando... intento:', attemptNumber);
        setIsReconnecting(true);
      },
      reconnect_error: (error) => {
        handleError(error, 'Error al reconectar');
      },
      reconnect_failed: () => {
        setIsReconnecting(false);
        handleError(new Error('Falló la reconexión'), 'Error de conexión');
      },
      connect: () => {
        if (isReconnecting) {
          console.log('Reconectado exitosamente');
          setIsReconnecting(false);
          setConnectionError(null);
          // Intentar reiniciar la sala
          initializeRoom().catch(console.error);
        }
      }
    };

    // Registrar handlers
    Object.entries(handlers).forEach(([event, handler]) => {
      gameSocket.on(event, handler);
    });

    // Solo inicializar si tenemos roomCode y no hay error
    if (roomCode && !connectionError && !isReconnecting) {
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
  }, [initializeRoom, checkAllPlayersReady, roomCode, handleError, connectionError, isReconnecting]);

  // Efecto para limpiar estados cuando hay error
  useEffect(() => {
    if (connectionError) {
      setCurrentCard(null);
      setIsMarkingEnabled(false);
      setGameStep('wheel');
    }
  }, [connectionError]);

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