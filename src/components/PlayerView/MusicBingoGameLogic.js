import { useState, useCallback, useEffect, useRef } from 'react';
import { gameSocket } from '../../services/socketService';
import { BOARD_SIZE, MIN_DIFFERENT_CATEGORIES, CATEGORIES_A, CATEGORIES_B } from '../Wheel/constants';

// Esta función ahora está fuera porque no depende de props o estado del componente, es una función pura.
const generateValidBoard = (difficulty) => {
    const categories = difficulty === 'experto' ? CATEGORIES_B : CATEGORIES_A;
    const cells = [];
    categories.forEach(category => {
        for (let i = 0; i < 5; i++) {
        cells.push({ ...category, marked: false });
        }
    });
    // Mezcla simple de Fisher-Yates
    for (let i = cells.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cells[i], cells[j]] = [cells[j], cells[i]];
    }
    // En una implementación futura, aquí se podría añadir la validación de filas/columnas.
    return cells;
};


export const useMusicBingoLogic = ({ playerName, roomCode, difficulty }) => {
    // Estado unificado que refleja lo que llega del servidor.
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

    // Estado que es puramente local del cliente (el tablero y errores).
    const [board, setBoard] = useState([]);
    const [error, setError] = useState(null);
    const boardGenerated = useRef(false);

    // --- LÓGICA DE VALIDACIÓN DEL TABLERO (se mantiene local) ---
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


    // --- EFECTO PRINCIPAL PARA LA COMUNICACIÓN CON EL SOCKET ---
    useEffect(() => {
        // El tablero se genera UNA SOLA VEZ cuando el hook se monta, si no existe.
        if (!boardGenerated.current) {
            console.log('Generando tablero para el jugador...');
            setBoard(generateValidBoard(difficulty));
            boardGenerated.current = true;
        }

        // Listener principal para las actualizaciones de estado del servidor.
        const handleGameStateUpdate = (serverState) => {
            console.log('PLAYER VIEW recibió gameStateUpdate:', serverState);
            setGameState(prevState => ({ ...prevState, ...serverState }));
        };

        gameSocket.on('gameStateUpdate', handleGameStateUpdate);
        gameSocket.on('error', (err) => setError(err.message || 'Error del servidor'));

        // Limpieza de listeners cuando el componente se desmonta.
        return () => {
            gameSocket.off('gameStateUpdate');
            gameSocket.off('error');
        };
    }, [difficulty]); // La dificultad puede cambiar si un jugador se une tarde, por lo que debe ser una dependencia.

    // --- ACCIONES DEL JUGADOR
    
    const handleCellClick = useCallback((index) => {
        if (!gameState.isMarkingEnabled) {
            console.log("Intento de marcar pero el marcado no está habilitado.");
            return;
        }

        const player = gameState.connectedPlayers.find(p => p.name === playerName);
        const isPlayerEligible = player && gameState.playerCorrectStatus[player.id];
        
        if (!isPlayerEligible) {
            console.log(`El jugador ${playerName} no es elegible para marcar.`);
            return;
        }
    
        setBoard(prevBoard => {
            const newBoard = [...prevBoard];
            const cell = newBoard[index];
            
            if (gameState.currentCategory && cell.name === gameState.currentCategory.name) {
                newBoard[index] = { ...cell, marked: !cell.marked };
                
                if (checkWinner(newBoard)) {
                    console.log(`¡Jugador ${playerName} ha cantado bingo!`);
                    gameSocket.winner({ roomCode, playerName });
                }
                return newBoard;
            }
            return prevBoard;
        });
    }, [gameState, checkWinner, roomCode, playerName]);
    
    const handlePrediction = useCallback((prediction) => {
        // En una implementación futura, se podría añadir un estado 'canPredict'
        // basado en el estado del servidor.
        gameSocket.submitPrediction({ roomCode, prediction });
    }, [roomCode]);

    return {
        board,
        ...gameState, // Devolvemos todo el estado del juego que viene del servidor.
        error,
        setError,
        handleCellClick,
        handlePrediction,
    };
};