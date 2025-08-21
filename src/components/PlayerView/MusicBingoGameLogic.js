import { useState, useCallback, useEffect, useRef } from 'react';
import { gameSocket } from '../../services/socketService';
import { BOARD_SIZE, MIN_DIFFERENT_CATEGORIES, CATEGORIES_A, CATEGORIES_B } from '../Wheel/constants';

const generateValidBoard = (difficulty) => {
    const categories = difficulty === 'experto' ? CATEGORIES_B : CATEGORIES_A;
    const cells = [];
    categories.forEach(category => {
        for (let i = 0; i < 5; i++) cells.push({ ...category, marked: false });
    });
    for (let i = cells.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cells[i], cells[j]] = [cells[j], cells[i]];
    }
    return cells;
};

export const useMusicBingoLogic = ({ playerName, roomCode, difficulty }) => {
    const [gameState, setGameState] = useState({
        gameStep: 'waiting',
        connectedPlayers: [],
        currentCategory: null,
        currentSong: null,
        isMarkingEnabled: false,
        playerCorrectStatus: {},
        gameOver: false,
        winners: [],
    });
    const [board, setBoard] = useState([]);
    const [error, setError] = useState(null);
    const [myPredictions, setMyPredictions] = useState([]); // Estado local para las predicciones del jugador
    const boardGenerated = useRef(false);

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
        const hasMoreThanTwoOfSameCategory = Object.values(categoryCounts).some(count => count > 2);
        if (hasMoreThanTwoOfSameCategory) return false;
        const differentCategories = Object.keys(categoryCounts).length;
        return differentCategories >= MIN_DIFFERENT_CATEGORIES;
    }, []);

    const checkWinner = useCallback((newBoard) => {
        for (let i = 0; i < BOARD_SIZE; i++) {
            if (validateLine(newBoard.slice(i * BOARD_SIZE, (i + 1) * BOARD_SIZE))) return true;
            const column = Array(BOARD_SIZE).fill(0).map((_, j) => newBoard[j * BOARD_SIZE + i]);
            if (validateLine(column)) return true;
        }
        const diag1 = Array(BOARD_SIZE).fill(0).map((_, i) => newBoard[i * BOARD_SIZE + i]);
        const diag2 = Array(BOARD_SIZE).fill(0).map((_, i) => newBoard[i * BOARD_SIZE + (BOARD_SIZE - 1 - i)]);
        return validateLine(diag1) || validateLine(diag2);
    }, [validateLine]);

    useEffect(() => {
        if (!boardGenerated.current) {
            setBoard(generateValidBoard(difficulty));
            boardGenerated.current = true;
        }

        const handleGameStateUpdate = (serverState) => {
            console.log('PLAYER VIEW recibió gameStateUpdate:', serverState);
            // Si la nueva ronda empieza (sin categoría o con una categoría diferente), limpiamos las predicciones locales.
            if (!serverState.currentCategory && gameState.currentCategory) {
              setMyPredictions([]);
            }
            setGameState(prevState => ({ ...prevState, ...serverState }));
        };

        gameSocket.on('gameStateUpdate', handleGameStateUpdate);
        gameSocket.on('error', (err) => setError(err.message || 'Error del servidor'));

        return () => {
            gameSocket.off('gameStateUpdate');
            gameSocket.off('error');
        };
    }, [difficulty, gameState.currentCategory]); // Dependencia para resetear predicciones

    const handleCellClick = useCallback((index) => {
        if (!gameState.isMarkingEnabled) return;
        const player = gameState.connectedPlayers.find(p => p.name === playerName);
        if (!player || !gameState.playerCorrectStatus[player.id]) return;

        setBoard(prevBoard => {
            const newBoard = [...prevBoard];
            const cell = newBoard[index];
            if (gameState.currentCategory && cell.name === gameState.currentCategory.name) {
                newBoard[index] = { ...cell, marked: !cell.marked };
                if (checkWinner(newBoard)) {
                    gameSocket.winner({ roomCode, playerName });
                }
                return newBoard;
            }
            return prevBoard;
        });
    }, [gameState, checkWinner, roomCode, playerName]);

    const handlePrediction = useCallback((prediction) => {
        setMyPredictions(prev => [...prev, prediction]); // Actualiza el estado local
        gameSocket.submitPrediction({ roomCode, prediction }); // Notifica al servidor
    }, [roomCode]);

    return {
        board,
        ...gameState,
        myPredictions,
        error,
        setError,
        handleCellClick,
        handlePrediction,
    };
};