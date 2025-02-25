import { useState, useCallback, useEffect, useRef } from 'react';
import { gameSocket } from '../../services/socketService';
import {
  BOARD_SIZE,
  MIN_DIFFERENT_CATEGORIES,
  CATEGORIES_A,
  CATEGORIES_B
} from '../Wheel/constants';

export const useMusicBingoLogic = ({ playerName, roomCode, difficulty }) => {
  const [board, setBoard] = useState([]);
  const [connectedPlayers, setConnectedPlayers] = useState([]);
  const [currentCategory, setCurrentCategory] = useState(null);
  const [currentSong, setCurrentSong] = useState(null);
  const [canMark, setCanMark] = useState(false);
  const [hasWinner, setHasWinner] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [gamePhase, setGamePhase] = useState('waiting');
  const [predictions, setPredictions] = useState([]);
  const [songStarted, setSongStarted] = useState(false);
  const [isEligibleToMark, setIsEligibleToMark] = useState(false);

  // Timer states para predicciones
  const [predictionTimeRemaining, setPredictionTimeRemaining] = useState(30);
  const predictionTimerRef = useRef(null);
  const [canPredict, setCanPredict] = useState(true);

  // Añadir un estado para saber explícitamente si este jugador ha sido marcado como incorrecto
  const [isMarkedAsIncorrect, setIsMarkedAsIncorrect] = useState(false);

  // Estados para manejo del fin de juego
  const [gameOver, setGameOver] = useState(false);
  const [winners, setWinners] = useState([]);

  // Usar useRef para controlar si el tablero ya ha sido generado
  const boardGenerated = useRef(false);

  // Función para iniciar el timer de predicciones
  const startPredictionTimer = useCallback((seconds = 30) => {
    // Limpiar cualquier timer existente primero
    if (predictionTimerRef.current) {
      clearInterval(predictionTimerRef.current);
    }

    setPredictionTimeRemaining(seconds);
    setCanPredict(true);

    predictionTimerRef.current = setInterval(() => {
      setPredictionTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(predictionTimerRef.current);
          setCanPredict(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // Función para detener el timer de predicciones
  const stopPredictionTimer = useCallback(() => {
    if (predictionTimerRef.current) {
      clearInterval(predictionTimerRef.current);
      predictionTimerRef.current = null;
    }
  }, []);

  // Función para validar la distribución de categorías
  const validateLine = useCallback((line) => {
    const categoryCounts = {};
    let markedCount = 0;

    line.forEach(cell => {
      if (cell.marked) {
        categoryCounts[cell.name] = (categoryCounts[cell.name] || 0) + 1;
        markedCount++;
      }
    });

    if (markedCount !== BOARD_SIZE) return false;

    // Verificar que no haya más de 2 casillas de la misma categoría
    const hasMoreThanTwoOfSameCategory = Object.values(categoryCounts).some(count => count > 2);
    if (hasMoreThanTwoOfSameCategory) return false;

    const differentCategories = Object.keys(categoryCounts).length;
    return differentCategories >= MIN_DIFFERENT_CATEGORIES;
  }, []);

  // Función auxiliar para validar una línea durante la generación
  const validateGeneratedLine = useCallback((line) => {
    const categoryCounts = {};
    line.forEach(cell => {
      categoryCounts[cell.name] = (categoryCounts[cell.name] || 0) + 1;
    });
    return !Object.values(categoryCounts).some(count => count > 2);
  }, []);

  // Función auxiliar para validar todo el tablero durante la generación
  const validateGeneratedBoard = useCallback((board) => {
    // Verificar filas
    for (let i = 0; i < BOARD_SIZE; i++) {
      const row = board.slice(i * BOARD_SIZE, (i + 1) * BOARD_SIZE);
      if (!validateGeneratedLine(row)) return false;
    }

    // Verificar columnas
    for (let i = 0; i < BOARD_SIZE; i++) {
      const column = Array(BOARD_SIZE).fill(0).map((_, j) => board[j * BOARD_SIZE + i]);
      if (!validateGeneratedLine(column)) return false;
    }

    // Verificar diagonales
    const diagonal1 = Array(BOARD_SIZE).fill(0).map((_, i) => board[i * BOARD_SIZE + i]);
    const diagonal2 = Array(BOARD_SIZE).fill(0).map((_, i) => board[i * BOARD_SIZE + (BOARD_SIZE - 1 - i)]);

    return validateGeneratedLine(diagonal1) && validateGeneratedLine(diagonal2);
  }, [validateGeneratedLine]);

  // Función para verificar victoria
  const checkWinner = useCallback((newBoard) => {
    // Verificar filas
    for (let i = 0; i < BOARD_SIZE; i++) {
      const row = newBoard.slice(i * BOARD_SIZE, (i + 1) * BOARD_SIZE);
      if (validateLine(row)) return true;
    }

    // Verificar columnas
    for (let i = 0; i < BOARD_SIZE; i++) {
      const column = Array(BOARD_SIZE).fill(0).map((_, j) => newBoard[j * BOARD_SIZE + i]);
      if (validateLine(column)) return true;
    }

    // Verificar diagonales
    const diagonal1 = Array(BOARD_SIZE).fill(0).map((_, i) => newBoard[i * BOARD_SIZE + i]);
    const diagonal2 = Array(BOARD_SIZE).fill(0).map((_, i) => newBoard[i * BOARD_SIZE + (BOARD_SIZE - 1 - i)]);

    return validateLine(diagonal1) || validateLine(diagonal2);
  }, [validateLine]);

  // Función para generar tablero balanceado
  const generateValidBoard = useCallback(() => {
    const categories = difficulty === 'experto' ? CATEGORIES_B : CATEGORIES_A;
    const MAX_ATTEMPTS = 100;
    let attempts = 0;
    let cells = [];

    while (attempts < MAX_ATTEMPTS) {
      attempts++;

      // Crear array con 5 instancias de cada categoría
      cells = [];
      categories.forEach(category => {
        for (let i = 0; i < 5; i++) {
          cells.push({ ...category, marked: false });
        }
      });

      // Mezclar el array usando Fisher-Yates shuffle
      for (let i = cells.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cells[i], cells[j]] = [cells[j], cells[i]];
      }

      if (validateGeneratedBoard(cells)) {
        return cells;
      }
    }

    console.warn('No se pudo generar un tablero perfectamente balanceado después de', MAX_ATTEMPTS, 'intentos');
    return cells;
  }, [difficulty, validateGeneratedBoard]);

  // Función para unirse a la sala
  const joinGame = useCallback(async () => {
    try {
      console.log('Intentando conectar al juego:', { roomCode, playerName });
      await gameSocket.connect();

      const joinResponse = await gameSocket.joinRoom(roomCode, {
        name: playerName,
        difficulty
      });

      if (joinResponse?.players) {
        setConnectedPlayers(joinResponse.players);
      }

      // Solo generar el tablero si no existe
      if (!boardGenerated.current) {
        console.log('Generando nuevo tablero - primera vez');
        const newBoard = generateValidBoard();
        setBoard(newBoard);
        boardGenerated.current = true;
      }

      if (joinResponse?.phase) {
        setGamePhase(joinResponse.phase);
      }
      if (joinResponse?.currentCategory) {
        setCurrentCategory(joinResponse.currentCategory);
        setGamePhase('playing');
      }
    } catch (error) {
      console.error('Error uniéndose al juego:', error);
      setConnectionError(error.message);
    }
  }, [roomCode, playerName, difficulty, generateValidBoard]);

  // Manejo de click en casillas
  const handleCellClick = useCallback((index, isUnmarking = false) => {
    if (!canMark && !isUnmarking) return;
    if (!isEligibleToMark && !isUnmarking) return;
    if (isMarkedAsIncorrect && !isUnmarking) return;

    setBoard(prev => {
      const newBoard = [...prev];
      const cell = newBoard[index];

      if (currentCategory && cell.name === currentCategory.name) {
        newBoard[index] = { ...cell, marked: !cell.marked };

        if (checkWinner(newBoard)) {
          setHasWinner(true);
          gameSocket.winner({ roomCode, playerName });
        }

        return newBoard;
      }
      return prev;
    });
  }, [canMark, isEligibleToMark, isMarkedAsIncorrect, currentCategory, checkWinner, roomCode, playerName]);

  const handlePrediction = useCallback((prediction) => {
    if (!canPredict) return;

    setPredictions(prev => [...prev, prediction]);
    gameSocket.submitPrediction({
      roomCode,
      prediction
    });
  }, [roomCode, canPredict]);

  // Resetear boardGenerated cuando cambie el roomCode
  useEffect(() => {
    boardGenerated.current = false;
  }, [roomCode]);

  // Efecto para timer
  useEffect(() => {
    return () => {
      // Cleanup timer on unmount
      if (predictionTimerRef.current) {
        clearInterval(predictionTimerRef.current);
      }
    };
  }, []);

  // Efecto para eventos del socket - modificado para manejar mejor el estado de elegibilidad
  useEffect(() => {
    const handlers = {
      playersUpdate: ({ players }) => {
        setConnectedPlayers(players);
      },
      categorySelected: ({ category }) => {
        setCurrentCategory(category);
        setCurrentSong(null);
        setCanMark(false);
        setIsEligibleToMark(false);
        setIsMarkedAsIncorrect(false); // Resetear al cambiar de categoría
        setSongStarted(false);
        setPredictions([]);
        setGamePhase('playing');
        // Detener cualquier timer activo cuando se cambia de categoría
        stopPredictionTimer();
      },
      songStarted: () => {
        setSongStarted(true);
        // Iniciar el timer de predicciones cuando comienza la canción
        startPredictionTimer(30);
      },
      songRevealed: (songData) => {
        setCurrentSong(songData);
        setSongStarted(false);
        setIsEligibleToMark(false);
        // Detener el timer de predicciones cuando se revela la canción
        stopPredictionTimer();
        setCanPredict(false);
      },
      markingEnabled: ({ eligiblePlayers }) => {
        console.log('Recibido evento markingEnabled con elegibles:', eligiblePlayers);
        setCanMark(true);

        const currentPlayerInList = connectedPlayers.find(p => p.name === playerName);
        if (!currentPlayerInList) {
          console.log('Jugador no encontrado en la lista de conectados');
          setIsEligibleToMark(false);
          return;
        }

        // Si el jugador ya ha sido marcado como incorrecto, no puede ser elegible
        if (isMarkedAsIncorrect) {
          console.log(`Jugador ${playerName} ya fue marcado como incorrecto, no es elegible para marcar`);
          setIsEligibleToMark(false);
          return;
        }

        const isEligible = eligiblePlayers.includes(currentPlayerInList.id);
        console.log(`Jugador ${playerName} (${currentPlayerInList.id}): ${isEligible ? 'elegible' : 'NO elegible'} para marcar`);
        setIsEligibleToMark(isEligible);
      },
      markingDisabled: () => {
        setCanMark(false);
        setIsEligibleToMark(false);
      },
      playerMarked: ({ playerId, isCorrect }) => {
        const currentPlayer = connectedPlayers.find(p => p.name === playerName);
        if (currentPlayer && currentPlayer.id === playerId) {
          console.log(`Jugador ${playerName} marcado como: ${isCorrect ? 'correcto' : 'incorrecto'}`);

          // Guardar explícitamente si el jugador fue marcado como incorrecto
          if (!isCorrect) {
            setIsMarkedAsIncorrect(true);
            setCanMark(false);
            setIsEligibleToMark(false);
          } else {
            setIsEligibleToMark(true);
          }
        }
      },
      playerWon: ({ playerId, playerName: winnerName }) => {
        // Si este jugador es el que ganó
        const currentPlayer = connectedPlayers.find(p => p.name === playerName);
        if (currentPlayer && playerId === currentPlayer.id) {
          console.log('¡Has ganado!');
          setHasWinner(true);
        }

        // Añadir a la lista de ganadores
        setWinners(prev => {
          const existingWinner = prev.find(w => w.id === playerId);
          if (!existingWinner) {
            return [...prev, { id: playerId, name: winnerName }];
          }
          return prev;
        });
      },
      gameOver: ({ winners: gameWinners }) => {
        setGameOver(true);
        setGamePhase('gameOver');
        setCanMark(false);
        setIsEligibleToMark(false);
        stopPredictionTimer();
        setWinners(gameWinners || []);
      },
      gameRestarted: () => {
        setGameOver(false);
        setWinners([]);
        setHasWinner(false);
        setGamePhase('waiting');
        setCurrentCategory(null);
        setCurrentSong(null);
        setIsMarkedAsIncorrect(false);
        setCanMark(false);
        boardGenerated.current = false;
        setBoard(generateValidBoard());
      },
      gameStarted: () => {
        setGamePhase('playing');
      },
      gameStartFailed: () => {
        setGamePhase('waiting');
      },
      error: (error) => {
        setConnectionError(error.message);
      }
    };

    // Limpieza previa de listeners
    const events = Object.keys(handlers);
    events.forEach(event => {
      gameSocket.off(event);
    });

    // Registrar nuevos handlers
    events.forEach(event => {
      gameSocket.on(event, handlers[event]);
    });

    // Solo llamar a joinGame si no hay tablero generado
    if (!boardGenerated.current) {
      joinGame();
    }

    return () => {
      events.forEach(event => {
        gameSocket.off(event);
      });
    };
  }, [joinGame, playerName, connectedPlayers, startPredictionTimer, stopPredictionTimer, isMarkedAsIncorrect, generateValidBoard]);

  return {
    board,
    connectedPlayers,
    currentCategory,
    currentSong,
    canMark: canMark && isEligibleToMark && !isMarkedAsIncorrect,
    hasWinner,
    connectionError,
    gamePhase,
    predictions,
    songStarted,
    handleCellClick,
    handlePrediction,
    setConnectionError,
    isEligibleToMark,
    predictionTimeRemaining,
    canPredict,
    isMarkedAsIncorrect,
    gameOver,
    winners
  };
};