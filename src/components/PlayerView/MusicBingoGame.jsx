import { Card } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { Button } from '../ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircleIcon,
  AlertCircle,
  Users,
  InfoIcon,
  Loader2
} from 'lucide-react';
import PropTypes from 'prop-types';
import { useState, useEffect } from 'react';
import { useMusicBingoLogic } from '../PlayerView/MusicBingoGameLogic';
import { gameSocket } from '../../services/socketService';

const MusicBingoGame = ({ playerName, roomCode, difficulty }) => {
  const [lastMarkedIndex, setLastMarkedIndex] = useState(null);
  const [hasMarkedThisRound, setHasMarkedThisRound] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isSettingReady, setIsSettingReady] = useState(false);

  const {
    board,
    connectedPlayers,
    currentCategory,
    canMark: originalCanMark,
    hasWinner,
    connectionError,
    handleCellClick,
    gamePhase
  } = useMusicBingoLogic({ playerName, roomCode, difficulty });

  const canMark = originalCanMark && (!hasMarkedThisRound || lastMarkedIndex !== null);

  const handleSetReady = async () => {
    try {
      setIsSettingReady(true);
      await gameSocket.setPlayerReady(roomCode);
      setIsReady(true);
    } catch (error) {
      console.error('Error al marcar como listo:', error);
    } finally {
      setIsSettingReady(false);
    }
  };

  const handleMarkCell = (index) => {
    if (!originalCanMark) return;
    
    if (lastMarkedIndex === index) {
      handleCellClick(index, true);
      setLastMarkedIndex(null);
      setHasMarkedThisRound(false);
    } else if (lastMarkedIndex !== null) {
      handleCellClick(lastMarkedIndex, true);
      handleCellClick(index);
      setLastMarkedIndex(index);
    } else if (!hasMarkedThisRound) {
      handleCellClick(index);
      setLastMarkedIndex(index);
      setHasMarkedThisRound(true);
    }
  };

  useEffect(() => {
    setLastMarkedIndex(null);
    setHasMarkedThisRound(false);
  }, [currentCategory]);

  // Reset ready state when game starts
  useEffect(() => {
    if (gamePhase === 'playing') {
      setIsReady(true);
    }
  }, [gamePhase]);

  const renderWaitingRoom = () => (
    <div className="space-y-4">
      <Alert className="bg-blue-100">
        <InfoIcon className="h-5 w-5 text-blue-600 mr-2" />
        <AlertDescription className="text-blue-800">
          Esperando a que el Game Master inicie la partida
        </AlertDescription>
      </Alert>

      {!isReady && (
        <Button
          onClick={handleSetReady}
          disabled={isSettingReady}
          className="w-full bg-green-500 hover:bg-green-600 text-white"
        >
          {isSettingReady ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Preparando...
            </>
          ) : (
            '¡Estoy listo!'
          )}
        </Button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 p-3 md:p-6 flex flex-col items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-3xl bg-white/80 backdrop-blur-lg rounded-xl shadow-xl overflow-hidden"
      >
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4 md:p-6">
          <h1 className="text-xl md:text-3xl font-bold text-center text-white drop-shadow-md">
            Music Bingo
          </h1>
        </div>

        <div className="p-4 md:p-6 space-y-4 md:space-y-6">
          {connectionError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{connectionError}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold">{playerName}</h2>
              <p className="text-sm text-gray-500">
                Sala: {roomCode} - {connectedPlayers.length} jugadores
              </p>
            </div>
          </div>

          {gamePhase === 'waiting' && renderWaitingRoom()}

          <AnimatePresence>
            {hasWinner && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <Alert className="bg-green-100 border-green-300">
                  <CheckCircleIcon className="h-5 w-5 text-green-600 mr-2" />
                  <AlertDescription className="text-green-800 font-semibold text-sm md:text-base">
                    ¡BINGO! ¡Has completado una línea!
                  </AlertDescription>
                </Alert>
              </motion.div>
            )}
          </AnimatePresence>

          {currentCategory && (
            <div className={`${currentCategory.color} p-4 rounded-lg text-center`}>
              <h3 className="font-semibold text-lg">{currentCategory.name}</h3>
            </div>
          )}

          {currentCategory && (
            <Alert className={canMark ? "bg-green-100" : "bg-blue-100"}>
              {originalCanMark ? (
                lastMarkedIndex !== null ? (
                  <>
                    <InfoIcon className="h-5 w-5 text-blue-600 mr-2" />
                    <AlertDescription className="text-blue-800">
                      Puedes desmarcar la casilla seleccionada para elegir otra
                    </AlertDescription>
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="h-5 w-5 text-green-600 mr-2" />
                    <AlertDescription className="text-green-800">
                      ¡Puedes marcar una casilla de &quot;{currentCategory.name}&quot; ahora!
                    </AlertDescription>
                  </>
                )
              ) : (
                <>
                  <InfoIcon className="h-5 w-5 text-blue-600 mr-2" />
                  <AlertDescription className="text-blue-800">
                    Espera a que el Game Master habilite el marcado
                  </AlertDescription>
                </>
              )}
            </Alert>
          )}

          {gamePhase !== 'waiting' && (
            <Card className="p-2 md:p-4 shadow-lg">
              <div className="grid grid-cols-5 gap-1 md:gap-3">
                {board.map((category, index) => {
                  const Icon = category.icon;
                  const isSelected = index === lastMarkedIndex;
                  const isMarkable = originalCanMark && 
                                   category.name === currentCategory?.name &&
                                   (!hasMarkedThisRound || isSelected);

                  return (
                    <motion.button
                      key={index}
                      whileHover={{ scale: isMarkable ? 1.05 : 1 }}
                      whileTap={{ scale: isMarkable ? 0.95 : 1 }}
                      className={`
                        ${category.color} 
                        aspect-square 
                        rounded-lg
                        flex 
                        items-center 
                        justify-center 
                        p-1 md:p-2
                        text-center 
                        relative 
                        transition-all 
                        duration-200
                        ${isMarkable ? 'cursor-pointer hover:ring-2 hover:ring-purple-400' : 'cursor-default'}
                        ${category.marked ? 'scale-95 shadow-inner' : 'shadow hover:shadow-md'}
                        ${isSelected ? 'ring-2 ring-purple-600' : ''}
                      `}
                      onClick={() => handleMarkCell(index)}
                      disabled={!isMarkable}
                      aria-label={`Casilla ${category.name}`}
                    >
                      <Icon {...category.iconProps} />
                      {category.marked && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                          <CheckCircleIcon className="text-green-500 w-6 md:w-10 h-6 md:h-10" />
                        </div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </Card>
          )}

          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base md:text-lg font-semibold">
                Jugadores Conectados
              </h3>
              <div className="flex items-center gap-2 text-gray-600 bg-white/50 px-3 py-1 rounded-full">
                <Users className="w-4 h-4" />
                <span>{connectedPlayers.length}</span>
              </div>
            </div>
            <div className="bg-white/50 rounded-lg divide-y divide-gray-200">
              {connectedPlayers.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between p-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {player.name}
                      {player.isHost && " (Game Master)"}
                    </span>
                    {player.ready && !player.isHost && (
                      <CheckCircleIcon className="h-4 w-4 text-green-500" />
                    )}
                  </div>
                  {player.name === playerName && (
                    <span className="text-xs text-purple-600 font-medium">(Tú)</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

MusicBingoGame.propTypes = {
  playerName: PropTypes.string.isRequired,
  roomCode: PropTypes.string.isRequired,
  difficulty: PropTypes.oneOf(['principiante', 'experto']).isRequired
};

export default MusicBingoGame;