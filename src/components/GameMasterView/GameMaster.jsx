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
  Users,
  AlertCircle,
  Check
} from 'lucide-react';
import CategoryWheel from '../CategoryWheel';
import PredictionsPanel from '../PredictionsPanel';
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
    setConnectionError,
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

  // Auto-dismiss error
  useEffect(() => {
    let timer;
    if (connectionError) {
      timer = setTimeout(() => {
        setConnectionError(null);
      }, 4000);
    }
    return () => clearTimeout(timer);
  }, [connectionError, setConnectionError]);

  // Handle marking control
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

  // Handle new round
  const handleNewRound = useCallback(() => {
    console.log('Iniciando nueva ronda');
    setMarkingEnabledThisRound(false);
    startNewRound();
  }, [startNewRound]);

  // Reset state on card change
  useEffect(() => {
    if (!currentCard) {
      console.log('Reseteando estado de marcado por nueva carta');
      setMarkingEnabledThisRound(false);
    }
  }, [currentCard]);

  // Handle player toggle
  const handleLocalPlayerToggle = async (playerId) => {
    if (isMarkingEnabled) return;

    setLocalPlayerCorrect(prev => {
      const newState = {
        ...prev,
        [playerId]: !prev[playerId]
      };
      console.log('Nuevo estado local:', newState);
      return newState;
    });

    try {
      await handlePlayerCorrectToggle(playerId);
      console.log(`Jugador ${playerId} marcado en el servidor`);
    } catch (error) {
      console.error('Error al marcar jugador:', error);
      setLocalPlayerCorrect(prev => ({
        ...prev,
        [playerId]: !prev[playerId]
      }));
    }
  };

  const renderCardContent = () => {
    if (!currentCard) return null;

    return (
      <div className="space-y-3">
        <div className={`transition-all duration-500 ${currentCard.revealed ? '' : 'blur-md'}`}>
          {/* Grid para info de la canción */}
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

            {/* Detalles en grid */}
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

        {/* Controles */}
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
              className="h-10 border-purple-400/50 text-purple-300 hover:bg-purple-500/20"
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
              disabled={!Object.values(playerCorrect).some(correct => correct) || (markingEnabledThisRound && !isMarkingEnabled)}
              className={`w-full h-10 transition-all duration-300 ${isMarkingEnabled
                  ? 'bg-yellow-500/80 hover:bg-yellow-500 border-yellow-400'
                  : markingEnabledThisRound
                    ? 'bg-gray-500/50 border-gray-400 cursor-not-allowed'
                    : Object.values(playerCorrect).some(correct => correct)
                      ? 'bg-green-500/80 hover:bg-green-500 border-green-400'
                      : 'bg-gray-500/50 border-gray-400 cursor-not-allowed'
                } border`}
              style={
                !Object.values(playerCorrect).some(correct => correct) || markingEnabledThisRound || isMarkingEnabled
                  ? {}
                  : { boxShadow: '0 0 15px rgba(34,197,94,0.3)' }
              }
            >
              {isMarkingEnabled
                ? 'Deshabilitar Marcado'
                : markingEnabledThisRound
                  ? 'Marcado Ya Utilizado'
                  : Object.values(playerCorrect).some(correct => correct)
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
    );
  };

  return (
    <div className="min-h-screen bg-[#1a0133] flex flex-col relative overflow-hidden">
      {/* Fondo con cuadrícula */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `
            linear-gradient(to right, #ff00ee 1px, transparent 1px),
            linear-gradient(to bottom, #ff00ee 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
          transform: 'perspective(500px) rotateX(60deg)',
          transformOrigin: 'bottom'
        }}
      />

      {/* Header mejorado */}
      <div className="w-full bg-gradient-to-b from-black/60 to-transparent backdrop-blur-sm">
        <div className="max-w-xl mx-auto px-4 py-6 space-y-2">
          {/* Título con mejor espaciado y diseño */}
          <div className="text-center space-y-1">
            <h1 className="text-4xl font-bold tracking-wider"
              style={{
                background: 'linear-gradient(to right, #ff00ee, #00ffff)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                textShadow: '0 2px 20px rgba(255,0,238,0.5)'
              }}>
              DISCOHITS
            </h1>
            <h2 className="text-2xl font-bold text-white/90"
              style={{
                textShadow: '0 0 10px rgba(255,255,255,0.5)'
              }}>
              Music Bingo
            </h2>
          </div>

          {connectionError && (
            <Alert variant="destructive" className="bg-red-500/20 border border-red-500/50">
              <AlertCircle className="h-4 w-4 text-white" />
              <AlertDescription className="text-white">{connectionError}</AlertDescription>
            </Alert>
          )}

          {/* Info de sala/jugadores */}
          <div className="flex justify-between items-center">
            <div className="flex-1 min-w-[200px]">
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
            </div>

            <div className="flex items-center gap-3 ml-4">
              <div className="flex items-center gap-2 bg-black/30 px-3 py-1 rounded-full border border-white/20">
                <Users className="w-4 h-4 text-purple-300" />
                <span className="text-white">{connectedPlayers.length}</span>
              </div>
              <div className="text-sm text-purple-300 font-mono">
                {roomCode}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido principal con mejor espaciado */}
      <div className="flex-1 flex flex-col p-4">
        <div className="max-w-xl w-full mx-auto flex-1 flex flex-col">
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
                    className={`${selectedCategory.color} p-4 rounded-lg flex items-center justify-center gap-3 border border-white/20 mb-4`}
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
                    {renderCardContent()}
                  </Card>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Lista de jugadores */}
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
                    className={`flex items-center justify-between p-3 transition-colors duration-200 ${playerCorrect[player.id] ? 'bg-green-500/20' : ''
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
        </div>
      </div>

      {/* Panel de predicciones */}
      <PredictionsPanel
        predictions={playerPredictions}
        currentSong={currentCard}
        songPlaying={songPlaying}
        markedCorrect={playerCorrect}
      />
    </div>
  );
};

GameMaster.propTypes = {
  roomCode: PropTypes.string.isRequired,
  difficulty: PropTypes.oneOf(['principiante', 'experto']).isRequired
};

export default GameMaster;