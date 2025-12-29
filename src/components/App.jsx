import { useState, useCallback, useEffect } from "react";
import MusicBingoGame from "../components/PlayerView/MusicBingoGame";
import GameMaster from "../components/GameMasterView/GameMaster";
import GameRoom from "../components/GameRoom";
import SpotifyAuth from "../components/Auth/SpotifyAuth";
import RoleSelection from "../components/RoleSelection";
import AnimatedBackground from "../components/AnimatedBackground";
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

  // Detectar código de sala en URL al cargar
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const roomFromUrl = urlParams.get('room');

    if (roomFromUrl) {
      console.log('🔗 Código de sala detectado en URL:', roomFromUrl);
      // Auto-seleccionar jugador y pre-rellenar código
      setGameState(prev => ({
        ...prev,
        selectedRole: 'player',
        roomCode: roomFromUrl.toUpperCase(),
        phase: 'name-input',
      }));
    }
  }, []);

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
    if (role === 'master') {
      setGameState(prev => ({
        ...prev,
        selectedRole: role,
        phase: 'spotify-auth',
        error: null
      }));
    } else {
      setGameState(prev => ({
        ...prev,
        selectedRole: role,
        phase: 'name-input',
        error: null
      }));
    }
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
      <Card className="p-8 glass-card-strong shadow-2xl pulse-glow rounded-2xl">
        <h2 className="text-2xl font-bold text-center text-white mb-6">
          {gameState.selectedRole === 'master' ? 'Crear sala' : 'Unirse a sala'}
        </h2>
        {gameState.selectedRole === 'player' && gameState.roomCode && (
          <div className="mb-4 p-3 bg-purple-500/20 border border-purple-400/50 rounded-lg text-center">
            <p className="text-purple-200 text-sm mb-1">Sala detectada</p>
            <p className="text-purple-300 font-bold text-xl tracking-wider">{gameState.roomCode}</p>
          </div>
        )}
        <Input
          type="text"
          placeholder="Tu nombre"
          value={gameState.playerName}
          onChange={(e) => setGameState(prev => ({
            ...prev,
            playerName: e.target.value,
            error: null
          }))}
          className="w-full bg-black/30 border-white/20 text-white placeholder:text-white/50 mb-4"
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
          className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 transition-all duration-300"
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
      <Card className="p-8 glass-card-strong shadow-2xl pulse-glow rounded-2xl">
        <h2 className="text-2xl font-bold text-center text-white mb-6">
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
          className="w-full bg-black/30 border-white/20 text-white placeholder:text-white/50 mb-4"
          maxLength={6}
        />
        {gameState.error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-white">{gameState.error}</AlertDescription>
          </Alert>
        )}
        <Button
          onClick={handleJoinRoom}
          className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 transition-all duration-300 mt-4"
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
    <div className="min-h-screen p-4 relative overflow-hidden">
      {/* Fondo animado */}
      <AnimatedBackground />

      {/* Contenido principal */}
      <div className="w-full min-h-screen flex flex-col items-center justify-center relative z-10">
        {/* Área principal de juego */}
        <AnimatePresence mode="wait">
          {gameState.phase === 'role-selection' && (
            <RoleSelection onSelectRole={handleRoleSelect} />
          )}

          {gameState.phase === 'spotify-auth' && (
            <SpotifyAuth
              onSuccess={() => setGameState(prev => ({
                ...prev,
                phase: 'name-input',
                error: null
              }))}
            />
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
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          onClick={handleReset}
          className="fixed bottom-4 left-4 sm:bottom-6 sm:left-6 bg-black/30 text-white rounded-full p-2 sm:p-3 shadow-lg hover:bg-white/10 transition-colors duration-300 z-50 backdrop-blur-sm"
        >
          <ArrowLeft className="h-5 w-5 sm:h-6 sm:w-6" />
        </motion.button>
      )}
    </div>
  );
}

export default App;