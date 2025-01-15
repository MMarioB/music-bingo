import { useState, useCallback, useEffect } from 'react';
import { gameSocket } from '../../services/socketService';
import {
  Users,
  Timer,
  Music,
  Calendar
} from 'lucide-react';
import { Number2Icon, Number3Icon, Number4Icon } from '../CustomIcons';

// Constantes
export const BOARD_SIZE = 5;
export const MAX_PER_CATEGORY = 2;
export const MIN_DIFFERENT_CATEGORIES = 3;

export const CATEGORIES_A = [
  {
    name: 'Grupo o solista',
    color: 'bg-green-200',
    icon: Users,
    iconProps: {
      size: 24,
      className: 'text-gray-700',
      style: { filter: 'drop-shadow(0 0 1px rgba(0,0,0,0.5))' }
    }
  },
  {
    name: '¿Anterior al 2000?',
    color: 'bg-pink-200',
    icon: Timer,
    iconProps: {
      size: 24,
      className: 'text-gray-700',
      style: { filter: 'drop-shadow(0 0 1px rgba(0,0,0,0.5))' }
    }
  },
  {
    name: '4 años arriba o abajo',
    color: 'bg-yellow-200',
    icon: Number4Icon,
    iconProps: {
      size: 24,
      className: 'text-gray-700',
      style: { filter: 'drop-shadow(0 0 1px rgba(0,0,0,0.5))' }
    }
  },
  {
    name: 'Década',
    color: 'bg-purple-200',
    icon: Calendar,
    iconProps: {
      size: 24,
      className: 'text-gray-700',
      style: { filter: 'drop-shadow(0 0 1px rgba(0,0,0,0.5))' }
    }
  },
  {
    name: '2 años arriba o abajo',
    color: 'bg-blue-200',
    icon: Number2Icon,
    iconProps: {
      size: 24,
      className: 'text-gray-700',
      style: { filter: 'drop-shadow(0 0 1px rgba(0,0,0,0.5))' }
    }
  }
];

export const CATEGORIES_B = [
  {
    name: 'Título de la canción',
    color: 'bg-green-200',
    icon: Music,
    iconProps: {
      size: 24,
      className: 'text-gray-700',
      style: { filter: 'drop-shadow(0 0 1px rgba(0,0,0,0.5))' }
    }
  },
  {
    name: 'Año exacto',
    color: 'bg-pink-200',
    icon: Timer,
    iconProps: {
      size: 24,
      className: 'text-gray-700',
      style: { filter: 'drop-shadow(0 0 1px rgba(0,0,0,0.5))' }
    }
  },
  {
    name: 'Nombre del grupo o solista',
    color: 'bg-yellow-200',
    icon: Users,
    iconProps: {
      size: 24,
      className: 'text-gray-700',
      style: { filter: 'drop-shadow(0 0 1px rgba(0,0,0,0.5))' }
    }
  },
  {
    name: 'Década',
    color: 'bg-purple-200',
    icon: Calendar,
    iconProps: {
      size: 24,
      className: 'text-gray-700',
      style: { filter: 'drop-shadow(0 0 1px rgba(0,0,0,0.5))' }
    }
  },
  {
    name: '3 años arriba o abajo',
    color: 'bg-blue-200',
    icon: Number3Icon,
    iconProps: {
      size: 24,
      className: 'text-gray-700',
      style: { filter: 'drop-shadow(0 0 1px rgba(0,0,0,0.5))' }
    }
  }
];

export const useMusicBingoLogic = ({ playerName, roomCode, difficulty }) => {
  // Estados del juego
  const [board, setBoard] = useState([]);
  const [connectedPlayers, setConnectedPlayers] = useState([]);
  const [currentCategory, setCurrentCategory] = useState(null);
  const [currentSong, setCurrentSong] = useState(null);
  const [canMark, setCanMark] = useState(false);
  const [hasWinner, setHasWinner] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [gamePhase, setGamePhase] = useState('waiting');

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

    const hasMoreThanTwoRepeats = Object.values(categoryCounts).some(count => count > MAX_PER_CATEGORY);
    const differentCategories = Object.keys(categoryCounts).length;

    return !hasMoreThanTwoRepeats && differentCategories >= MIN_DIFFERENT_CATEGORIES;
  }, []);

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

  // Función para generar tablero válido
  const generateValidBoard = useCallback(() => {
    const categories = difficulty === 'experto' ? CATEGORIES_B : CATEGORIES_A;
    let attempts = 0;
    const MAX_ATTEMPTS = 1000;

    while (attempts < MAX_ATTEMPTS) {
      attempts++;
      const board = Array(BOARD_SIZE * BOARD_SIZE).fill(null).map(() => ({
        ...categories[Math.floor(Math.random() * categories.length)],
        marked: false
      }));

      // Verificar que hay suficientes casillas de cada categoría
      const categoryCounts = {};
      board.forEach(cell => {
        categoryCounts[cell.name] = (categoryCounts[cell.name] || 0) + 1;
      });

      if (Object.values(categoryCounts).every(count => count >= 2)) {
        return board;
      }
    }

    return Array(BOARD_SIZE * BOARD_SIZE).fill(null).map(() => ({
      ...categories[Math.floor(Math.random() * categories.length)],
      marked: false
    }));
  }, [difficulty]);

  // Función para unirse a la sala
  const joinGame = useCallback(async () => {
    try {
      console.log('Intentando conectar al juego:', { roomCode, playerName });
      await gameSocket.connect();
      
      const joinResponse = await gameSocket.joinRoom(roomCode, {
        name: playerName,
        difficulty
      });

      console.log('Respuesta de unión:', joinResponse);
      if (joinResponse?.players) {
        setConnectedPlayers(joinResponse.players);
      }
      if (joinResponse?.phase) {
        setGamePhase(joinResponse.phase);
      }
      if (joinResponse?.currentCategory) {
        setCurrentCategory(joinResponse.currentCategory);
        setGamePhase('playing');
        setBoard(generateValidBoard());
      }
    } catch (error) {
      console.error('Error uniéndose al juego:', error);
      setConnectionError(error.message);
    }
  }, [roomCode, playerName, difficulty, generateValidBoard]);

  // Manejo de click en casillas
  const handleCellClick = useCallback((index, isUnmarking = false) => {
    if (!canMark && !isUnmarking) return;

    setBoard(prev => {
      const newBoard = [...prev];
      const cell = newBoard[index];

      if (currentCategory && cell.name === currentCategory.name) {
        newBoard[index] = { ...cell, marked: !cell.marked };

        // Verificar victoria después de marcar
        if (checkWinner(newBoard)) {
          setHasWinner(true);
          gameSocket.winner({ roomCode, playerName });
        }

        return newBoard;
      }
      return prev;
    });
  }, [canMark, currentCategory, checkWinner, roomCode, playerName]);

  // Efecto para eventos del socket
  useEffect(() => {
    const handlers = {
      playersUpdate: ({ players }) => {
        console.log('Actualización de jugadores:', players);
        setConnectedPlayers(players);
      },
      categorySelected: ({ category }) => {
        console.log('Categoría seleccionada:', category);
        setCurrentCategory(category);
        setCurrentSong(null);
        setCanMark(false);
        setGamePhase('playing');
      },
      songRevealed: (songData) => {
        console.log('Canción revelada:', songData);
        setCurrentSong(songData);
      },
      markingEnabled: () => {
        console.log('Marcado habilitado');
        setCanMark(true);
      },
      markingDisabled: () => {
        console.log('Marcado deshabilitado');
        setCanMark(false);
      },
      gameStarted: () => {
        console.log('Juego iniciado');
        setGamePhase('playing');
        setBoard(generateValidBoard());
      },
      gameStartFailed: () => {
        console.log('Inicio de juego fallido');
        setGamePhase('waiting');
      },
      error: (error) => {
        console.error('Error en socket:', error);
        setConnectionError(error.message);
      }
    };

    // Registrar handlers
    Object.entries(handlers).forEach(([event, handler]) => {
      gameSocket.on(event, handler);
    });

    // Intentar unirse al juego
    joinGame();

    // Limpieza
    return () => {
      Object.keys(handlers).forEach(event => {
        gameSocket.off(event);
      });
      gameSocket.disconnect();
    };
  }, [joinGame, generateValidBoard]);

  // Efecto para generar tablero cuando sea necesario
  useEffect(() => {
    if (gamePhase === 'playing' && board.length === 0) {
      setBoard(generateValidBoard());
    }
  }, [gamePhase, generateValidBoard, board.length]);

  return {
    board,
    connectedPlayers,
    currentCategory,
    currentSong,
    canMark,
    hasWinner,
    connectionError,
    gamePhase,
    handleCellClick
  };
};