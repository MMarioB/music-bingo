import { useState, useCallback, useEffect } from 'react';
import { useSpotify } from '../../hooks/useSpotify';
import { gameSocket } from '../../services/socketService';
import { ARTISTS } from './constants';

export const useGameMasterLogic = ({ roomCode, initialDifficulty }) => {
  const { spotify, loggedIn, login, logout, token } = useSpotify();
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
  const [playerCorrect, setPlayerCorrect] = useState({});

  useEffect(() => {
    const initialPlayerCorrect = connectedPlayers.reduce((acc, player) => {
      acc[player.id] = false;
      return acc;
    }, {});
    setPlayerCorrect(initialPlayerCorrect);
  }, [connectedPlayers]);

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

  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (!document.hidden) {
        const savedState = localStorage.getItem('musicBingoState');
        if (savedState) {
          try {
            const parsedState = JSON.parse(savedState);
            if (Date.now() - parsedState.timestamp < 300000) {
              if (parsedState.cardState && !currentCard) {
                setCurrentCard(parsedState.cardState);
                setSongPlaying(true);
              }
            }
          } catch (error) {
            console.error('Error restaurando estado:', error);
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [currentCard]);

  const initializeRoom = useCallback(async () => {
    if (!loggedIn || !isTokenValid) {
      setGameStep('init');
      return;
    }

    try {
      console.log('Iniciando sala:', roomCode);
      await gameSocket.connect();

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
    }
  }, [roomCode, difficulty, loggedIn, isTokenValid]);

  const checkAllPlayersReady = useCallback((players) => {
    const ready = players.every(player => player.ready || player.isHost);
    setAllPlayersReady(ready);
  }, []);

  const handlePlayerCorrectToggle = useCallback(async (playerId) => {
    if (!loggedIn || !isTokenValid) return;

    try {
      const newCorrectState = !playerCorrect[playerId];
      const player = connectedPlayers.find(p => p.id === playerId);
      console.log('Marcando jugador:', player?.name, '(ID:', playerId, ') como:', newCorrectState);

      await gameSocket.markPlayerCorrect({
        roomCode,
        playerId,
        isCorrect: newCorrectState
      });

      setPlayerCorrect(prev => {
        const newState = {
          ...prev,
          [playerId]: newCorrectState
        };
        console.log('Nuevo estado de playerCorrect:', newState);
        return newState;
      });

    } catch (error) {
      console.error('Error al marcar jugador:', error);
      setConnectionError('Error al marcar el acierto del jugador');
    }
  }, [roomCode, loggedIn, isTokenValid, playerCorrect, connectedPlayers]);

  useEffect(() => {
    if (!loggedIn || !isTokenValid) return;

    gameSocket.off('playersUpdate');
    gameSocket.off('playerPrediction');
    gameSocket.off('playerMarked');
    gameSocket.off('markingEnabled');
    gameSocket.off('markingDisabled');
    gameSocket.off('gameStartFailed');
    gameSocket.off('error');

    const handlers = {
      playersUpdate: ({ players }) => {
        console.log('Actualización de jugadores recibida:', players);
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
      playerMarked: ({ playerId, isCorrect }) => {
        console.log('Jugador marcado:', playerId, isCorrect);
        setPlayerCorrect(prev => ({
          ...prev,
          [playerId]: isCorrect
        }));
      },
      markingEnabled: () => {
        setIsMarkingEnabled(true);
      },
      markingDisabled: () => {
        setIsMarkingEnabled(false);
      },
      gameStartFailed: (error) => {
        console.error('Error al iniciar juego:', error);
        setConnectionError(error.message);
        setGameStep('wheel');
      },
      error: (error) => {
        console.error('Error en socket:', error);
        setConnectionError(error.message);
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
    };
  }, [initializeRoom, loggedIn, isTokenValid, checkAllPlayersReady]);

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
      setPlayerCorrect({});
    } catch (error) {
      console.error('Error al seleccionar categoría:', error);
      setConnectionError(error.message);
    }
  }, [roomCode, loggedIn, isTokenValid]);

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
        uri: randomTrack.uri,
        musicCategory: randomMusicCategory,
        revealed: false
      };

      const gameState = {
        currentTrack: randomTrack.uri,
        timestamp: Date.now(),
        cardState: newCard
      };
      localStorage.setItem('musicBingoState', JSON.stringify(gameState));

      setCurrentCard(newCard);
      await spotify.playTrack(randomTrack.uri);
      await gameSocket.startSong({ roomCode });
      setSongPlaying(true);
      setPlayerCorrect({});

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
      setPlayerCorrect({});
    } catch (error) {
      console.error('Error al revelar canción:', error);
      setConnectionError('Error al revelar la canción');
    }
  }, [currentCard, roomCode, loggedIn, isTokenValid]);

  const handleMarkingToggle = useCallback(async () => {
    if (!loggedIn || !isTokenValid) return;

    try {
      if (isMarkingEnabled) {
        await gameSocket.disableMarking({ roomCode });
        setIsMarkingEnabled(false);
      } else {
        console.log('Estado actual de playerCorrect:', playerCorrect);
        console.log('Jugadores conectados:', connectedPlayers);

        const eligiblePlayers = Object.entries(playerCorrect)
          .filter(([, isCorrect]) => isCorrect === true)
          .map(([playerId]) => playerId);

        console.log('Jugadores elegibles a enviar:', eligiblePlayers);
        
        eligiblePlayers.forEach(id => {
          const player = connectedPlayers.find(p => p.id === id);
          console.log(`Jugador elegible: ${player?.name} (ID: ${id})`);
        });

        if (eligiblePlayers.length === 0) {
          console.log('⚠️ Advertencia: No hay jugadores elegibles para marcar');
          return;
        }

        const validEligiblePlayers = eligiblePlayers.filter(id => 
          connectedPlayers.some(player => player.id === id)
        );

        if (validEligiblePlayers.length === 0) {
          console.log('⚠️ Error: Ninguno de los jugadores elegibles está conectado');
          setConnectionError('Error: No hay jugadores válidos para marcar');
          return;
        }

        await gameSocket.enableMarking({ 
          roomCode,
          eligiblePlayers: validEligiblePlayers 
        });

        setIsMarkingEnabled(true);
        console.log('Marcado habilitado exitosamente para:', validEligiblePlayers);
      }
    } catch (error) {
      console.error('Error al cambiar estado de marcado:', error);
      setConnectionError('Error al cambiar estado de marcado');
    }
  }, [isMarkingEnabled, roomCode, loggedIn, isTokenValid, playerCorrect, connectedPlayers]);

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
      setPlayerCorrect({});
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
    playerCorrect,
    handlePlayerCorrectToggle,
    handleDifficultyChange,
    handleCategorySelected,
    generateNewCard,
    handleRevealSong,
    handleMarkingToggle,
    startNewRound,
    setCurrentCard
  };
};