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
    const [myPredictions, setMyPredictions] = useState([]);
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
            // Si la nueva ronda empieza, limpiamos las predicciones locales.
            if (!serverState.currentCategory && gameState.currentCategory) {
                setMyPredictions([]);
            }
            setGameState(prevState => ({ ...prevState, ...serverState }));
        };

        const handleError = (err) => {
            console.error('Socket error:', err);
            setError(err.message || 'Error del servidor');
        };

        // Manejadores para eventos específicos del servidor
        const handleMarkingEnabled = () => {
            console.log('Marking enabled');
            setGameState(prev => ({ ...prev, isMarkingEnabled: true }));
        };

        const handleMarkingDisabled = () => {
            console.log('Marking disabled');
            setGameState(prev => ({ ...prev, isMarkingEnabled: false }));
        };

        const handlePlayerMarked = (data) => {
            console.log('Player marked correct:', data);
            setGameState(prev => ({
                ...prev,
                playerCorrectStatus: {
                    ...prev.playerCorrectStatus,
                    [data.playerId]: data.correct
                }
            }));
        };

        // Registrar todos los event listeners
        gameSocket.on('gameStateUpdate', handleGameStateUpdate);
        gameSocket.on('error', handleError);
        gameSocket.on('markingEnabled', handleMarkingEnabled);
        gameSocket.on('markingDisabled', handleMarkingDisabled);
        gameSocket.on('playerMarkedCorrect', handlePlayerMarked);

        return () => {
            // Limpiar todos los event listeners
            gameSocket.off('gameStateUpdate', handleGameStateUpdate);
            gameSocket.off('error', handleError);
            gameSocket.off('markingEnabled', handleMarkingEnabled);
            gameSocket.off('markingDisabled', handleMarkingDisabled);
            gameSocket.off('playerMarkedCorrect', handlePlayerMarked);
        };
    }, [difficulty, gameState.currentCategory]);

    const handleCellClick = useCallback((index) => {
        if (!gameState.isMarkingEnabled) {
            console.log('Marking not enabled');
            return;
        }
        
        const player = gameState.connectedPlayers.find(p => p.name === playerName);
        if (!player) {
            console.log('Player not found');
            return;
        }
        
        if (!gameState.playerCorrectStatus[player.id]) {
            console.log('Player not marked as correct');
            return;
        }

        setBoard(prevBoard => {
            const newBoard = [...prevBoard];
            const cell = newBoard[index];
            
            if (gameState.currentCategory && cell.name === gameState.currentCategory.name) {
                newBoard[index] = { ...cell, marked: !cell.marked };
                
                if (checkWinner(newBoard)) {
                    console.log('Winner detected, sending to server');
                    // Usar el método correcto del socket
                    gameSocket.emit('declareWinner', { roomCode, playerName });
                }
                return newBoard;
            }
            return prevBoard;
        });
    }, [gameState, checkWinner, roomCode, playerName]);

    const handlePrediction = useCallback((prediction) => {
        setMyPredictions(prev => [...prev, prediction]);
        // Usar emit en lugar de método directo
        gameSocket.emit('submitPrediction', { roomCode, prediction });
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