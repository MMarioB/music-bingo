import { useState, useEffect, useCallback } from 'react';
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
        const connectAndJoin = async () => {
            try {
                setError(null);
                await gameSocket.connect();

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

        gameSocket.on('gameStateUpdate', handleGameStateUpdate);
        gameSocket.on('error', (err) => setError(err.message));
        gameSocket.on('hostDisconnected', () => setError('El anfitrión se ha desconectado.'));

        // Limpieza
        return () => {
            gameSocket.off('gameStateUpdate');
            gameSocket.off('error');
            gameSocket.off('hostDisconnected');
            // <-- CAMBIO CRÍTICO: Eliminamos la desconexión automática.
            // gameSocket.disconnect(); 
            // La desconexión ahora se maneja en App.jsx al resetear el juego.
        };
    }, [roomCode, playerName, isHost]);

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