import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Alert, AlertDescription } from '../ui/alert';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ExternalLinkIcon,
  MusicIcon,
  CalendarIcon,
  RefreshCwIcon,
  Users,
  AlertCircle
} from 'lucide-react';
import CategoryWheel from '../CategoryWheel';
import PropTypes from 'prop-types';
import { useGameMasterLogic } from './GameMasterLogic';
import { useState, useEffect } from 'react';

const GameMaster = ({ roomCode, difficulty: initialDifficulty }) => {
  // Nuevo estado para trackear si ya se habilitó el marcado en esta ronda
  const [markingEnabledThisRound, setMarkingEnabledThisRound] = useState(false);

  const {
    loggedIn,
    login,
    currentCard,
    isLoading,
    selectedCategory,
    gameStep,
    connectedPlayers,
    difficulty,
    connectionError,
    isMarkingEnabled,
    handleDifficultyChange,
    handleCategorySelected,
    generateNewCard,
    handleRevealSong,
    handleMarkingToggle,
    startNewRound
  } = useGameMasterLogic({ roomCode, initialDifficulty });

  // Función modificada para manejar el marcado
  const handleMarkingControl = () => {
    if (!isMarkingEnabled) {
      if (markingEnabledThisRound) {
        // Si ya se habilitó el marcado en esta ronda, no permitimos habilitarlo de nuevo
        return;
      }
      setMarkingEnabledThisRound(true);
    }
    handleMarkingToggle();
  };

  // Función modificada para iniciar nueva ronda
  const handleNewRound = () => {
    setMarkingEnabledThisRound(false);
    startNewRound();
  };

  // Reset cuando se genera una nueva tarjeta
  useEffect(() => {
    if (!currentCard) {
      setMarkingEnabledThisRound(false);
    }
  }, [currentCard]);

  if (!loggedIn) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-xl p-6 w-full max-w-md">
          <h1 className="text-3xl font-bold mb-6 text-center text-indigo-600">
            Music Bingo<br />Game Master
          </h1>
          <Button onClick={login} className="w-full py-4 text-lg font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-full">
            Conectar con Spotify
          </Button>
        </div>
      </div>
    );
  }

  const renderCardContent = () => {
    if (!currentCard) return null;

    return (
      <div className="space-y-4">
        <div className={`transition-all duration-500 ${currentCard.revealed ? '' : 'blur-md'}`}>
          <div className="text-center">
            <h2 className="text-xl font-bold text-gray-800 mb-2">
              {currentCard.title}
            </h2>
            <div className="flex justify-center items-center space-x-2 text-gray-600">
              <MusicIcon className="w-4 h-4" />
              <span className="text-base">{currentCard.artist}</span>
            </div>
          </div>

          <div className="flex justify-between items-center bg-white/60 rounded-lg p-3 mt-3">
            <div className="flex items-center space-x-2">
              <CalendarIcon className="w-5 h-5 text-purple-600" />
              <span className="text-2xl font-bold text-gray-800">
                {currentCard.year}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <MusicIcon className="w-5 h-5 text-indigo-600" />
              <span className="text-sm text-gray-700">
                {currentCard.musicCategory}
              </span>
            </div>
          </div>
        </div>

        {!currentCard.revealed ? (
          <div className="space-y-2">
            <Button
              onClick={handleRevealSong}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600"
            >
              <ExternalLinkIcon className="mr-2 h-4 w-4" />
              Revelar Canción
            </Button>
            <Button
              variant="outline"
              className="w-full border-purple-400 text-purple-700"
              onClick={() => window.open(currentCard.spotifyUrl, '_blank')}
            >
              <ExternalLinkIcon className="mr-2 h-4 w-4" />
              Abrir en Spotify
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <Button
              onClick={handleMarkingControl}
              disabled={markingEnabledThisRound && !isMarkingEnabled}
              className={`w-full ${isMarkingEnabled
                  ? 'bg-yellow-500 hover:bg-yellow-600'
                  : markingEnabledThisRound && !isMarkingEnabled
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-green-500 hover:bg-green-600'
                }`}
            >
              {isMarkingEnabled
                ? 'Deshabilitar Marcado'
                : markingEnabledThisRound
                  ? 'Marcado Ya Utilizado'
                  : 'Habilitar Marcado'
              }
            </Button>

            <Button
              onClick={handleNewRound}
              variant="outline"
              className="w-full"
            >
              <RefreshCwIcon className="w-4 h-4 mr-2" />
              Nueva Ronda
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 p-4">
      <div className="w-full max-w-4xl mx-auto bg-white/80 backdrop-blur-lg rounded-xl shadow-xl overflow-hidden">
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4">
          <h1 className="text-2xl md:text-3xl font-bold text-center text-white">
            Music Bingo
          </h1>
        </div>

        {connectionError && (
          <Alert variant="destructive" className="m-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{connectionError}</AlertDescription>
          </Alert>
        )}

        <div className="p-4 space-y-1">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <Select
                value={difficulty}
                onValueChange={handleDifficultyChange}
              >
                <SelectTrigger className="w-full bg-white/90">
                  <SelectValue placeholder="Nivel de juego" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="principiante">🟢 Principiante</SelectItem>
                  <SelectItem value="experto">🔥 Experto</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-2 text-gray-600 bg-white/50 px-4 py-2 rounded-lg">
                <Users className="w-4 h-4" />
                <span>{connectedPlayers.length} jugadores</span>
              </div>
              <div className="text-sm text-gray-500">
                Sala: {roomCode}
              </div>
            </div>

            {gameStep !== 'wheel' && (
              <Button
                onClick={handleNewRound}
                variant="outline"
                className="flex-shrink-0"
              >
                <RefreshCwIcon className="w-4 h-4 mr-2" />
                Nueva Categoría
              </Button>
            )}
          </div>

          <AnimatePresence mode="wait">
            {gameStep === 'wheel' ? (
              <motion.div
                key="wheel"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="py-4"
              >
                <CategoryWheel
                  difficulty={difficulty}
                  onCategorySelected={handleCategorySelected}
                />

                {connectedPlayers.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold mb-3">Jugadores Conectados:</h3>
                    <div className="bg-white/50 rounded-lg divide-y divide-gray-200">
                      {connectedPlayers.map((player) => (
                        <div
                          key={player.id}
                          className="flex items-center justify-between p-3"
                        >
                          <span className="font-medium">{player.name}</span>
                          {player.isHost && (
                            <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
                              Game Master
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="card-section"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-4"
              >
                {selectedCategory && (
                  <div className={`${selectedCategory.color} p-4 rounded-lg flex items-center justify-center gap-3`}>
                    <div className="flex items-center gap-2">
                      {selectedCategory.icon && (
                        <selectedCategory.icon
                          size={24}
                          className="text-gray-700"
                        />
                      )}
                      <span className="text-base font-medium text-gray-800">
                        {selectedCategory.name}
                      </span>
                    </div>
                  </div>
                )}

                {!currentCard ? (
                  <Button
                    onClick={generateNewCard}
                    disabled={isLoading}
                    className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600"
                  >
                    {isLoading ? 'Generando...' : 'Generar Tarjeta'}
                  </Button>
                ) : (
                  <Card className="overflow-hidden border-purple-200 p-4">
                    {renderCardContent()}
                  </Card>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

GameMaster.propTypes = {
  roomCode: PropTypes.string.isRequired,
  difficulty: PropTypes.oneOf(['principiante', 'experto']).isRequired
};

export default GameMaster;