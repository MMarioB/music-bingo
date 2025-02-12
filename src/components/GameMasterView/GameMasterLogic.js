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
  const [gamePhase, setGamePhase] = useState('waiting');
  const [connectedPlayers, setConnectedPlayers] = useState([]);
  const [difficulty, setDifficulty] = useState(initialDifficulty);
  const [connectionError, setConnectionError] = useState(null);
  const [isMarkingEnabled, setIsMarkingEnabled] = useState(false);
  const [allPlayersReady, setAllPlayersReady] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 2000;

  const handleSocketError = useCallback((error) => {
    console.error('Error en socket:', error);
    setConnectionError(error.message);
    handleReconnect();
  }, []);

  // Función auxiliar para manejar reconexiones
  const handleReconnect = useCallback(async () => {
    if (retryCount >= MAX_RETRIES) {
      setConnectionError('No se pudo reconectar después de varios intentos');
      return false;
    }

    try {
      await gameSocket.connect();
      setRetryCount(0);
      return true;
    } catch (error) {
      console.log(error);
      setRetryCount(prev => prev + 1);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return false;
    }
  }, [retryCount]);

  // Inicializar sala con manejo de reconexión
  const initializeRoom = useCallback(async () => {
    try {
      console.log('Iniciando sala:', roomCode);
  
      if (!gameSocket.isConnected()) {
        const connected = await handleReconnect();
        if (!connected) return;
      }
  
      const roomResponse = await Promise.race([
        gameSocket.createRoom({
          roomCode,
          difficulty,
          maxPlayers: 12
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout al crear sala')), 10000)
        )
      ]);
  
      if (roomResponse?.players) {
        console.log('Jugadores iniciales:', roomResponse.players);
        setConnectedPlayers(roomResponse.players);
        checkAllPlayersReady(roomResponse.players);
      }
    } catch (error) {
      console.error('Error inicializando sala:', error);
      setConnectionError(error.message);
      if (error.message.includes('conectado') || error.message.includes('connection')) {
        handleReconnect();
      }
    }
  }, [roomCode, difficulty, handleReconnect]);

  // Función para verificar si todos los jugadores están listos
  const checkAllPlayersReady = useCallback((players) => {
    const ready = players.every(player => player.ready || player.isHost);
    setAllPlayersReady(ready);
  }, []);

  // Manejar cambio de dificultad con retry
  const handleDifficultyChange = useCallback(async (newDifficulty) => {
    try {
      if (!gameSocket.isConnected()) {
        const connected = await handleReconnect();
        if (!connected) return;
      }

      setDifficulty(newDifficulty);
      await Promise.race([
        gameSocket.updateRoom({
          roomCode,
          difficulty: newDifficulty,
          phase: gamePhase
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout al actualizar dificultad')), 5000)
        )
      ]);
    } catch (error) {
      console.error('Error al cambiar dificultad:', error);
      setConnectionError(error.message);
    }
  }, [roomCode, handleReconnect, gamePhase]);

  // Manejar selección de categoría con retry
  const handleCategorySelected = useCallback(async (category) => {
    try {
      if (!gameSocket.isConnected()) {
        const connected = await handleReconnect();
        if (!connected) return;
      }

      await Promise.race([
        gameSocket.selectCategory({
          roomCode,
          category,
          phase: gamePhase
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout al seleccionar categoría')), 5000)
        )
      ]);

      setSelectedCategory(category);
      setGameStep('card');
      setIsMarkingEnabled(false);
      setCurrentCard(null);
    } catch (error) {
      console.error('Error al seleccionar categoría:', error);
      setConnectionError(error.message);
    }
  }, [roomCode, handleReconnect, gamePhase]);

  // Generar nueva carta con manejo mejorado de errores
  const generateNewCard = useCallback(async () => {
    if (!loggedIn || !selectedCategory || !spotify) return;

    setIsLoading(true);
    try {
      const randomMusicCategory = Object.keys(ARTISTS)[Math.floor(Math.random() * Object.keys(ARTISTS).length)];
      const artistsInCategory = ARTISTS[randomMusicCategory];
      const randomArtist = artistsInCategory[Math.floor(Math.random() * artistsInCategory.length)];

      const response = await Promise.race([
        spotify.searchTracks(`artist:"${randomArtist}"`, {
          limit: 50,
          market: 'ES'
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout al buscar canciones')), 10000)
        )
      ]);

      const tracks = response.tracks.items;
      if (!tracks || tracks.length === 0) {
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

      if (gameSocket.isConnected()) {
        await gameSocket.updateGameState({
          roomCode,
          currentCard: newCard,
          phase: gamePhase
        });
      }

    } catch (error) {
      console.error("Error generando tarjeta:", error);
      setConnectionError('Error al generar la tarjeta');
    } finally {
      setIsLoading(false);
    }
  }, [loggedIn, selectedCategory, spotify, roomCode, gamePhase]);

  // Revelar canción con retry
  const handleRevealSong = useCallback(async () => {
    if (!currentCard) return;

    try {
      if (!gameSocket.isConnected()) {
        const connected = await handleReconnect();
        if (!connected) return;
      }

      await Promise.race([
        gameSocket.revealSong({
          roomCode,
          songData: {
            title: currentCard.title,
            artist: currentCard.artist,
            year: currentCard.year
          },
          phase: gamePhase
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout al revelar canción')), 5000)
        )
      ]);

      setCurrentCard(prev => ({ ...prev, revealed: true }));
    } catch (error) {
      console.error('Error al revelar canción:', error);
      setConnectionError('Error al revelar la canción');
    }
  }, [currentCard, roomCode, handleReconnect, gamePhase]);

  // Habilitar/Deshabilitar marcado con retry
  const handleMarkingToggle = useCallback(async () => {
    try {
      if (!gameSocket.isConnected()) {
        const connected = await handleReconnect();
        if (!connected) return;
      }

      if (isMarkingEnabled) {
        await Promise.race([
          gameSocket.disableMarking({
            roomCode,
            phase: gamePhase
          }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout al deshabilitar marcado')), 5000)
          )
        ]);
        setIsMarkingEnabled(false);
      } else {
        await Promise.race([
          gameSocket.enableMarking({
            roomCode,
            phase: gamePhase
          }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout al habilitar marcado')), 5000)
          )
        ]);
        setIsMarkingEnabled(true);
      }
    } catch (error) {
      console.error('Error al cambiar estado de marcado:', error);
      setConnectionError('Error al cambiar estado de marcado');
    }
  }, [isMarkingEnabled, roomCode, handleReconnect, gamePhase]);

  // Iniciar nueva ronda con retry
  const startNewRound = useCallback(async () => {
    try {
      if (!gameSocket.isConnected()) {
        const connected = await handleReconnect();
        if (!connected) return;
      }

      await Promise.race([
        gameSocket.disableMarking({
          roomCode,
          phase: gamePhase
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout al iniciar nueva ronda')), 5000)
        )
      ]);

      setCurrentCard(null);
      setSelectedCategory(null);
      setGameStep('wheel');
      setIsMarkingEnabled(false);
    } catch (error) {
      console.error('Error al iniciar nueva ronda:', error);
      setConnectionError('Error al iniciar nueva ronda');
    }
  }, [roomCode, handleReconnect, gamePhase]);

  // Efecto para eventos del socket
  useEffect(() => {
    const handlers = {
      playersUpdate: ({ players }) => {
        console.log('Actualización de jugadores:', players);
        const updatedPlayers = players.map(player => ({
          ...player,
          ready: player.isHost || gamePhase === 'playing' || gameStep !== 'wheel' ? true : player.ready
        }));
        setConnectedPlayers(updatedPlayers);
        checkAllPlayersReady(updatedPlayers);
      },
      gameStarted: ({ difficulty: newDifficulty, gameState, players, phase }) => {
        console.log('Juego iniciado con dificultad:', newDifficulty);
        if (phase) setGamePhase(phase);
        setGameStep('wheel');

        if (players) {
          const updatedPlayers = players.map(player => ({
            ...player,
            ready: true
          }));
          setConnectedPlayers(updatedPlayers);
          checkAllPlayersReady(updatedPlayers);
        }

        if (gameState) {
          if (gameState.currentCard) setCurrentCard(gameState.currentCard);
          if (gameState.category) setSelectedCategory(gameState.category);
        }

        if (newDifficulty) {
          setDifficulty(newDifficulty);
        }
      },
      categorySelected: ({ category }) => {
        console.log('Categoría seleccionada:', category);
        setSelectedCategory(category);
        setGameStep('card');
      },
      songRevealed: (songData) => {
        console.log('Canción revelada:', songData);
        setCurrentCard(prev => ({ ...prev, revealed: true }));
      },
      gameStateUpdated: (state) => {
        console.log('Estado del juego actualizado:', state);
        if (state.currentCard) setCurrentCard(state.currentCard);
        if (state.category) setSelectedCategory(state.category);
        if (state.isMarkingEnabled !== undefined) setIsMarkingEnabled(state.isMarkingEnabled);
        if (state.phase) setGamePhase(state.phase);
      },
      gameStartFailed: (error) => {
        console.error('Error al iniciar juego:', error);
        setConnectionError(error.message);
        setGameStep('wheel');
      },
      error: handleSocketError,
      disconnect: () => {
        console.log('Desconexión detectada');
        handleReconnect();
      }
    };

    Object.entries(handlers).forEach(([event, handler]) => {
      gameSocket.on(event, handler);
    });

    initializeRoom();

    return () => {
      Object.keys(handlers).forEach(event => {
        gameSocket.off(event);
      });
      gameSocket.disconnect();
    };
  }, [initializeRoom, handleReconnect, checkAllPlayersReady, handleSocketError, gameStep, gamePhase]);

  // Efecto para auto-reconexión cuando hay error de conexión
  useEffect(() => {
    if (connectionError?.includes('conexión') || connectionError?.includes('connection')) {
      const timer = setTimeout(() => {
        handleReconnect();
      }, RETRY_DELAY);

      return () => clearTimeout(timer);
    }
  }, [connectionError, handleReconnect]);

  // Efecto para limpiar el error de conexión después de un tiempo
  useEffect(() => {
    if (connectionError) {
      const timer = setTimeout(() => {
        setConnectionError(null);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [connectionError]);

  return {
    loggedIn,
    login,
    currentCard,
    isLoading,
    selectedCategory,
    gameStep,
    gamePhase,
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
    setConnectionError,
    setCurrentCard
  };
};