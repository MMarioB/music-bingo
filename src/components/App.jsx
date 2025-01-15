import { useState, useCallback } from "react";
import RoleSelection from "../components/RoleSelection";
import MusicBingoGame from "../components/PlayerView/MusicBingoGame";
import GameMaster from "../components/GameMasterView/GameMaster";
import GameRoom from "../components/GameRoom";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Alert, AlertDescription } from "../components/ui/alert";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function App() {
  const [gameState, setGameState] = useState({
    phase: 'role-selection',
    selectedRole: null,
    playerName: '',
    roomCode: '',
    difficulty: 'principiante',
    error: null
  });

  const handleError = useCallback((errorMessage) => {
    setGameState(prev => ({
      ...prev,
      error: errorMessage
    }));
  }, []);

  const handleConnectionError = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      phase: prev.phase === 'game' ? 'waiting-room' : prev.phase,
      error: 'Error de conexión. Por favor, inténtalo de nuevo.'
    }));
  }, []);

  const handleRoomNotFound = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      phase: 'room-selection',
      error: 'Sala no encontrada. Verifica el código e inténtalo de nuevo.'
    }));
  }, []);

  const handleRoleSelect = (role) => {
    setGameState(prev => ({
      ...prev,
      selectedRole: role,
      phase: 'name-input',
      error: null
    }));
  };

  const handleNameSubmit = () => {
    if (!gameState.playerName.trim()) {
      handleError('Por favor ingresa un nombre');
      return;
    }
    
    if (gameState.selectedRole === 'master') {
      const newRoomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      setGameState(prev => ({
        ...prev,
        roomCode: newRoomCode,
        phase: 'waiting-room',
        error: null
      }));
    } else {
      setGameState(prev => ({
        ...prev,
        phase: 'room-selection',
        error: null
      }));
    }
  };

  const handleJoinRoom = () => {
    if (!gameState.roomCode.trim()) {
      handleError('Por favor ingresa un código de sala');
      return;
    }
    setGameState(prev => ({
      ...prev,
      phase: 'waiting-room',
      error: null
    }));
  };

  const handleStartGame = ({ difficulty }) => {
    setGameState(prev => ({
      ...prev,
      difficulty: difficulty || prev.difficulty,
      phase: 'game',
      error: null
    }));
  };

  const handleReset = () => {
    setGameState({
      phase: 'role-selection',
      selectedRole: null,
      playerName: '',
      roomCode: '',
      difficulty: 'principiante',
      error: null
    });
  };

  const renderNameInput = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-md mx-auto"
    >
      <Card className="p-6 space-y-4">
        <h2 className="text-2xl font-bold text-center text-gray-800">
          {gameState.selectedRole === 'master' ? 'Crear sala' : 'Unirse a sala'}
        </h2>
        <Input
          type="text"
          placeholder="Tu nombre"
          value={gameState.playerName}
          onChange={(e) => setGameState(prev => ({
            ...prev,
            playerName: e.target.value,
            error: null
          }))}
          className="w-full"
          maxLength={20}
        />
        {gameState.error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{gameState.error}</AlertDescription>
          </Alert>
        )}
        <Button 
          onClick={handleNameSubmit}
          className="w-full bg-gradient-to-r from-purple-600 to-indigo-600"
        >
          Continuar
        </Button>
      </Card>
    </motion.div>
  );

  const renderRoomSelection = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-md mx-auto"
    >
      <Card className="p-6 space-y-4">
        <h2 className="text-2xl font-bold text-center text-gray-800">
          Unirse a sala
        </h2>
        <Input
          type="text"
          placeholder="Código de sala"
          value={gameState.roomCode}
          onChange={(e) => setGameState(prev => ({
            ...prev,
            roomCode: e.target.value.toUpperCase(),
            error: null
          }))}
          className="w-full"
          maxLength={6}
        />
        {gameState.error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{gameState.error}</AlertDescription>
          </Alert>
        )}
        <Button 
          onClick={handleJoinRoom}
          className="w-full bg-gradient-to-r from-purple-600 to-indigo-600"
        >
          Unirse
        </Button>
      </Card>
    </motion.div>
  );

  const renderGameComponent = () => {
    if (gameState.selectedRole === 'master') {
      return (
        <GameMaster
          roomCode={gameState.roomCode}
          difficulty={gameState.difficulty}
          onError={handleConnectionError}
        />
      );
    }
    return (
      <MusicBingoGame
        playerName={gameState.playerName}
        roomCode={gameState.roomCode}
        difficulty={gameState.difficulty}
        onError={handleConnectionError}
        onRoomNotFound={handleRoomNotFound}
      />
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-4">
      <div className="w-full min-h-screen flex items-center justify-center">
        <AnimatePresence mode="wait">
          {gameState.phase === 'role-selection' && (
            <RoleSelection onSelectRole={handleRoleSelect} />
          )}
          {gameState.phase === 'name-input' && renderNameInput()}
          {gameState.phase === 'room-selection' && renderRoomSelection()}
          {gameState.phase === 'waiting-room' && (
            <GameRoom
              roomCode={gameState.roomCode}
              playerName={gameState.playerName}
              isHost={gameState.selectedRole === 'master'}
              onStartGame={handleStartGame}
              onError={handleConnectionError}
              onRoomNotFound={handleRoomNotFound}
            />
          )}
          {gameState.phase === 'game' && renderGameComponent()}
        </AnimatePresence>
      </div>

      {gameState.phase !== 'role-selection' && (
        <button
          onClick={handleReset}
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 bg-white/90 text-indigo-500 rounded-full p-2 sm:p-3 shadow-lg hover:bg-indigo-500 hover:text-white transition-colors duration-300 z-50"
        >
          <ArrowLeft className="h-5 w-5 sm:h-6 sm:w-6" />
        </button>
      )}
    </div>
  );
}

export default App;