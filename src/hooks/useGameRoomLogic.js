import { useState, useEffect, useCallback, useRef } from 'react'; // <-- Importa useRef
import { gameSocket } from '../services/socketService';

export const useGameRoomLogic = ({ roomCode, playerName, isHost, onStartGame }) => {
    const [gameState, setGameState] = useState({
        players: [],
        difficulty: 'principiante',
        allPlayersReady: false,
        gameStep: null,
    });
    const [error, setError] = useState(null);
    const [isConnected, setIsConnected] = useState(false);

    // <-- CAMBIO: Usamos useRef para asegurar que la conexión se haga solo una vez. -->
    const hasConnected = useRef(false);

    const handleGameStateUpdate = useCallback((newGameState) => {
        console.log('🔄 GameRoom recibió gameStateUpdate:', newGameState);
        setGameState(prevState => ({
            ...prevState,
            players: newGameState.connectedPlayers || prevState.players,
            difficulty: newGameState.difficulty || prevState.difficulty,
            allPlayersReady: (newGameState.connectedPlayers || []).every(p => p.ready || p.isHost),
            gameStep: newGameState.gameStep || prevState.gameStep,
        }));
    }, []);

    useEffect(() => {
        // Si ya nos hemos conectado, no hacemos nada más en este efecto.
        if (hasConnected.current) return;

        const connectAndJoin = async () => {
            try {
                setError(null);
                await gameSocket.connect();
                hasConnected.current = true; // <-- Marcamos que ya nos conectamos.

                let roomInfo;
                if (isHost) {
                    roomInfo = await gameSocket.createRoom({ roomCode });
                } else {
                    roomInfo = await gameSocket.joinRoom(roomCode, { name: playerName });
                }

                setGameState(prevState => ({
                    ...prevState,
                    players: roomInfo.players || [],
                    difficulty: roomInfo.config?.difficulty || 'principiante',
                }));
                setIsConnected(true);

            } catch (err) {
                console.error('Error al conectar o unirse a la sala:', err);
                setError(err.message || 'No se pudo conectar a la sala.');
            }
        };

        connectAndJoin();

    }, [roomCode, playerName, isHost]); // Dependencias para la ejecución inicial

    useEffect(() => {
        // Este efecto separado maneja los listeners, que sí queremos
        // que se registren y limpien si el hook se desmonta/remonta.
        gameSocket.on('gameStateUpdate', handleGameStateUpdate);
        gameSocket.on('error', (err) => setError(err.message));
        gameSocket.on('hostDisconnected', () => setError('El anfitrión se ha desconectado.'));

        return () => {
            gameSocket.off('gameStateUpdate');
            gameSocket.off('error');
            gameSocket.off('hostDisconnected');
        };
    }, [handleGameStateUpdate]); // Depende del callback memoizado

    useEffect(() => {
        if (gameState.gameStep === 'wheel' || gameState.gameStep === 'card') {
            onStartGame({ difficulty: gameState.difficulty });
        }
    }, [gameState.gameStep, gameState.difficulty, onStartGame]);

    const handleSetReady = useCallback(() => {
        gameSocket.setPlayerReady(roomCode);
    }, [roomCode]);

    const handleStartGame = useCallback(() => {
        gameSocket.startGame({ roomCode, difficulty: gameState.difficulty });
    }, [roomCode, gameState.difficulty]);

    const handleDifficultyChange = useCallback(async (newDifficulty) => {
        setGameState(prev => ({ ...prev, difficulty: newDifficulty }));
        try {
            await gameSocket.updateRoom({ roomCode, difficulty: newDifficulty });
        } catch (err) {
            console.log(err)
            setError('No se pudo actualizar la dificultad.');
        }
    }, [roomCode]);

    return {
        ...gameState,
        error,
        isConnected,
        handleSetReady,
        handleStartGame,
        handleDifficultyChange,
    };
};