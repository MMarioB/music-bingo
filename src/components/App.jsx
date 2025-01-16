import { useState, useCallback } from "react";
import MusicBingoGame from "../components/PlayerView/MusicBingoGame";
import GameMaster from "../components/GameMasterView/GameMaster";
import GameRoom from "../components/GameRoom";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Alert, AlertDescription } from "../components/ui/alert";
import { AlertCircle, ArrowLeft, Music, Users } from "lucide-react";
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-4 relative overflow-hidden">
      {/* Elementos decorativos de fondo */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.1 }}
          className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full filter blur-3xl"
          style={{ transform: 'translate(-50%, -50%)' }}
        />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.1 }}
          className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full filter blur-3xl"
          style={{ transform: 'translate(50%, 50%)' }}
        />
      </div>

      {/* Contenido principal */}
      <div className="w-full min-h-screen flex flex-col items-center justify-center relative z-10">
        {/* Logo y título */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-2 drop-shadow-lg">
            Music Bingo
          </h1>
          <p className="text-white/80 text-lg md:text-xl">
            ¡Juega y adivina las canciones!
          </p>
        </motion.div>

        {/* Área principal de juego */}
        <AnimatePresence mode="wait">
          {gameState.phase === 'role-selection' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md"
            >
              <Card className="p-8 backdrop-blur-lg bg-white/90 border-0 shadow-2xl">
                <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">
                  Selecciona tu rol
                </h2>
                <div className="grid gap-4">
                  <Button
                    onClick={() => handleRoleSelect('master')}
                    className="h-auto py-6 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 transform transition-all hover:scale-102 shadow-lg"
                  >
                    <div className="flex items-center justify-center gap-3">
                      <Music className="w-6 h-6" />
                      <span className="text-lg">Game Master</span>
                    </div>
                  </Button>
                  
                  <Button
                    onClick={() => handleRoleSelect('player')}
                    className="h-auto py-6 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 transform transition-all hover:scale-102 shadow-lg"
                  >
                    <div className="flex items-center justify-center gap-3">
                      <Users className="w-6 h-6" />
                      <span className="text-lg">Jugador</span>
                    </div>
                  </Button>
                </div>
              </Card>
            </motion.div>
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

      {/* Botón de retorno */}
      {gameState.phase !== 'role-selection' && (
        <motion.button
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          onClick={handleReset}
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 bg-white/90 text-indigo-500 rounded-full p-2 sm:p-3 shadow-lg hover:bg-indigo-500 hover:text-white transition-colors duration-300 z-50 backdrop-blur-sm"
        >
          <ArrowLeft className="h-5 w-5 sm:h-6 sm:w-6" />
        </motion.button>
      )}
    </div>
  );
}

export default App;