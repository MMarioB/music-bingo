import { useState, useEffect, useCallback } from 'react';
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
  AlertCircle,
  Check
} from 'lucide-react';
import CategoryWheel from '../Wheel/CategoryWheel';
import PredictionsPanel from './PredictionsPanel';
import GameLayout from '../GameLayout';
import PropTypes from 'prop-types';
import { useGameMasterLogic } from './GameMasterLogic';

const GameMaster = ({ roomCode, difficulty: initialDifficulty }) => {
  const [markingEnabledThisRound, setMarkingEnabledThisRound] = useState(false);
  const [localPlayerCorrect, setLocalPlayerCorrect] = useState({});

  const {
    currentCard,
    isLoading,
    selectedCategory,
    gameStep,
    connectedPlayers,
    difficulty,
    connectionError,
    isMarkingEnabled,
    playerPredictions,
    songPlaying,
    handlePlayerCorrectToggle,
    handleDifficultyChange,
    handleCategorySelected,
    generateNewCard,
    handleRevealSong,
    handleMarkingToggle,
    startNewRound,
    playerCorrect
  } = useGameMasterLogic({ roomCode, initialDifficulty });

  const resetLocalStates = useCallback(() => {
    setMarkingEnabledThisRound(false);
    setLocalPlayerCorrect({});
  }, []);

  const handleMarkingControl = useCallback(() => {
    if (!isMarkingEnabled) {
      if (markingEnabledThisRound) {
        console.log('Marcado ya utilizado en esta ronda');
        return;
      }
      if (!Object.values(localPlayerCorrect).some(correct => correct)) {
        console.log('No hay jugadores marcados como correctos');
        return;
      }
      console.log('Habilitando marcado por primera vez en esta ronda');
      setMarkingEnabledThisRound(true);
    } else {
      console.log('Deshabilitando marcado');
    }
    handleMarkingToggle();
  }, [isMarkingEnabled, markingEnabledThisRound, handleMarkingToggle, localPlayerCorrect]);

  const handleNewRound = useCallback(() => {
    console.log('Iniciando nueva ronda');
    resetLocalStates();
    startNewRound();
  }, [startNewRound, resetLocalStates]);

  useEffect(() => {
    if (!currentCard || currentCard.revealed) {
      resetLocalStates();
    }
  }, [currentCard, resetLocalStates]);

  const handleLocalPlayerToggle = async (playerId) => {
    if (isMarkingEnabled) return;

    const newCorrectState = !localPlayerCorrect[playerId];
    
    setLocalPlayerCorrect(prev => ({
      ...prev,
      [playerId]: newCorrectState
    }));

    try {
      await handlePlayerCorrectToggle(playerId);
      console.log(`Jugador ${playerId} marcado en el servidor`);
    } catch (error) {
      console.error('Error al marcar jugador:', error);
      setLocalPlayerCorrect(prev => ({
        ...prev,
        [playerId]: !newCorrectState
      }));
    }
  };

  const renderMainContent = () => (
    <AnimatePresence mode="wait">
      {gameStep === 'wheel' ? (
        <motion.div
          key="wheel"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className="flex-1 flex flex-col"
        >
          <CategoryWheel
            difficulty={difficulty}
            onCategorySelected={handleCategorySelected}
          />
        </motion.div>
      ) : (
        <motion.div
          key="card-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="flex-1 flex flex-col"
        >
          {selectedCategory && (
            <div
              className={`${selectedCategory.color} p-3 rounded-lg flex items-center justify-center gap-3 border border-white/20 mb-4`}
              style={{ boxShadow: '0 0 15px rgba(255,255,255,0.1)' }}
            >
              <div className="flex items-center gap-2">
                {selectedCategory.icon && (
                  <selectedCategory.icon
                    size={24}
                    className="text-gray-800"
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
              className="w-full h-10 bg-gradient-to-r from-purple-600/80 to-indigo-600/80 hover:from-purple-600 hover:to-indigo-600 border border-purple-400/50"
              style={{ boxShadow: '0 0 15px rgba(168,85,247,0.3)' }}
            >
              {isLoading ? 'Generando...' : 'Generar Tarjeta'}
            </Button>
          ) : (
            <Card className="bg-black/30 border border-white/20 p-4">
              <div className="space-y-3">
                <div className={`transition-all duration-500 ${currentCard.revealed ? '' : 'blur-md'}`}>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="col-span-2 text-center">
                      <h2 className="text-xl font-bold text-white">
                        {currentCard.title}
                      </h2>
                      <div className="flex justify-center items-center space-x-2 text-purple-300">
                        <MusicIcon className="w-4 h-4" />
                        <span className="text-base">{currentCard.artist}</span>
                      </div>
                    </div>
                    
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2 flex items-center justify-between">
                      <CalendarIcon className="w-5 h-5 text-purple-400" />
                      <span className="text-xl font-bold text-white">
                        {currentCard.year}
                      </span>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2 flex items-center justify-between">
                      <MusicIcon className="w-5 h-5 text-purple-400" />
                      <span className="text-sm text-purple-300">
                        {currentCard.musicCategory}
                      </span>
                    </div>
                  </div>
                </div>

                {!currentCard.revealed ? (
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={handleRevealSong}
                      className="col-span-2 h-10 bg-gradient-to-r from-purple-600/80 to-indigo-600/80 hover:from-purple-600 hover:to-indigo-600 border border-purple-400/50"
                      style={{ boxShadow: '0 0 15px rgba(168,85,247,0.3)' }}
                    >
                      <ExternalLinkIcon className="mr-2 h-4 w-4" />
                      Revelar Canción
                    </Button>
                    <Button
                      variant="outline"
                      className="col-span-2 h-10 border-purple-400/50 text-purple-300 hover:bg-purple-500/20"
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
                      disabled={!Object.values(localPlayerCorrect).some(correct => correct) || (markingEnabledThisRound && !isMarkingEnabled)}
                      className={`w-full h-10 transition-all duration-300 ${
                        isMarkingEnabled
                          ? 'bg-yellow-500/80 hover:bg-yellow-500 border-yellow-400'
                          : markingEnabledThisRound
                            ? 'bg-gray-500/50 border-gray-400 cursor-not-allowed'
                            : Object.values(localPlayerCorrect).some(correct => correct)
                              ? 'bg-green-500/80 hover:bg-green-500 border-green-400'
                              : 'bg-gray-500/50 border-gray-400 cursor-not-allowed'
                      } border`}
                    >
                      {isMarkingEnabled
                        ? 'Deshabilitar Marcado'
                        : markingEnabledThisRound
                          ? 'Marcado Ya Utilizado'
                          : Object.values(localPlayerCorrect).some(correct => correct)
                            ? 'Habilitar Marcado'
                            : 'Marca jugadores primero'
                      }
                    </Button>

                    <Button
                      onClick={handleNewRound}
                      variant="outline"
                      className="w-full h-10 border-white/20 text-white/80 hover:bg-white/10"
                    >
                      <RefreshCwIcon className="w-4 h-4 mr-2" />
                      Nueva Ronda
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          )}

          {connectedPlayers.length > 0 && (
            <div className="mt-4">
              <h3 className="font-semibold text-lg text-white mb-3 flex items-center justify-between">
                <span>Jugadores Conectados</span>
                {currentCard?.revealed && (
                  <span className="text-sm text-white/60">
                    {isMarkingEnabled
                      ? 'Marcado habilitado para jugadores con acierto'
                      : 'Marca los jugadores que acertaron'}
                  </span>
                )}
              </h3>
              <div className="bg-black/30 rounded-lg divide-y divide-white/10 border border-white/20">
                {connectedPlayers.map((player) => (
                  <div
                    key={player.id}
                    className={`flex items-center justify-between p-3 transition-colors duration-200 ${
                      playerCorrect[player.id] ? 'bg-green-500/20' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {currentCard?.revealed && !isMarkingEnabled && (
                        <div
                          onClick={() => handleLocalPlayerToggle(player.id)}
                          className={`w-5 h-5 rounded border flex items-center justify-center cursor-pointer
                            ${localPlayerCorrect[player.id]
                              ? 'bg-green-500 border-green-500'
                              : 'border-white/50 hover:border-white/80'}`}
                        >
                          {localPlayerCorrect[player.id] && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              exit={{ scale: 0 }}
                            >
                              <Check className="w-4 h-4 text-white" />
                            </motion.div>
                          )}
                        </div>
                      )}
                      <span className="font-medium text-white">{player.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {playerCorrect[player.id] && (
                        <span className="text-xs bg-green-500/30 text-green-300 px-2 py-1 rounded-full">
                          ¡Acierto!
                        </span>
                      )}
                      {player.isHost && (
                        <span className="text-xs bg-purple-500/30 text-purple-300 px-2 py-1 rounded-full border border-purple-400/50">
                          Game Master
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <GameLayout
      roomCode={roomCode}
      playersCount={connectedPlayers.length}
      showSelect={true}
      selectContent={
        <Select
          value={difficulty}
          onValueChange={handleDifficultyChange}
        >
          <SelectTrigger className="w-full bg-black/30 border-white/20 text-white">
            <SelectValue placeholder="Nivel de juego" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="principiante">🟢 Principiante</SelectItem>
            <SelectItem value="experto">🔥 Experto</SelectItem>
          </SelectContent>
        </Select>
      }
    >
      {connectionError && (
        <Alert variant="destructive" className="mb-4 bg-red-500/20 border border-red-500/50">
          <AlertCircle className="h-4 w-4 text-white" />
          <AlertDescription className="text-white">{connectionError}</AlertDescription>
        </Alert>
      )}
      
      {renderMainContent()}

      <PredictionsPanel
        predictions={playerPredictions}
        currentSong={currentCard}
        songPlaying={songPlaying}
        markedCorrect={playerCorrect}
      />
    </GameLayout>
  );
};

GameMaster.propTypes = {
  roomCode: PropTypes.string.isRequired,
  difficulty: PropTypes.oneOf(['principiante', 'experto']).isRequired
};

export default GameMaster;