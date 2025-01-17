import { Card } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircleIcon,
  AlertCircle,
  Users,
  InfoIcon
} from 'lucide-react';
import PropTypes from 'prop-types';
import { useState, useEffect } from 'react';
import { useMusicBingoLogic } from './MusicBingoGameLogic';

const MusicBingoGame = ({ playerName, roomCode, difficulty }) => {
  const [lastMarkedIndex, setLastMarkedIndex] = useState(null);
  const [hasMarkedThisRound, setHasMarkedThisRound] = useState(false);

  const {
    board,
    connectedPlayers,
    currentCategory,
    canMark: originalCanMark,
    hasWinner,
    connectionError,
    setConnectionError,
    handleCellClick,
    gamePhase
  } = useMusicBingoLogic({ playerName, roomCode, difficulty });

  const canMark = originalCanMark && (!hasMarkedThisRound || lastMarkedIndex !== null);

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

  useEffect(() => {
    let timer;
    if (connectionError) {
      timer = setTimeout(() => {
        setConnectionError(null);
      }, 4000);
    }
    return () => clearTimeout(timer);
  }, [connectionError, setConnectionError]);

  return (
    <div className="min-h-screen bg-[#1a0133] flex flex-col items-center justify-center relative overflow-hidden">
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

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-[95%] max-w-xl bg-black/40 backdrop-blur-lg rounded-xl shadow-xl overflow-hidden border border-white/10"
      >
        <div className="bg-black/60 p-4">
          <h1 className="text-xl md:text-3xl font-bold text-center text-white"
            style={{ textShadow: '0 0 10px rgba(255,255,255,0.8)' }}>
            Music Bingo
          </h1>
        </div>

        <div className="p-4 space-y-4">
          {connectionError && (
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <Alert variant="destructive" className="bg-red-500/20 border border-red-500/50">
                  <AlertCircle className="h-4 w-4 text-white" />
                  <AlertDescription className="text-white">{connectionError}</AlertDescription>
                </Alert>
              </motion.div>
            </AnimatePresence>
          )}

          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-white">{playerName}</h2>
              <p className="text-sm text-purple-300">
                Sala: {roomCode} - {connectedPlayers.length} jugadores
              </p>
            </div>
          </div>

          <AnimatePresence>
            {hasWinner && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <Alert className="bg-green-500/20 border border-green-500/50">
                  <CheckCircleIcon className="h-5 w-5 text-green-400 mr-2" />
                  <AlertDescription className="text-green-300 font-semibold text-sm md:text-base">
                    ¡BINGO! ¡Has completado una línea!
                  </AlertDescription>
                </Alert>
              </motion.div>
            )}
          </AnimatePresence>

          {currentCategory && (
            <div
              className={`${currentCategory.color} p-4 rounded-lg text-center border border-white/20`}
              style={{ boxShadow: '0 0 15px rgba(255,255,255,0.1)' }}
            >
              <h3 className="font-semibold text-lg text-gray-800">{currentCategory.name}</h3>
            </div>
          )}

          {currentCategory && (
            <Alert className={canMark
              ? "bg-green-500/20 border border-green-400/50"
              : "bg-blue-500/20 border border-blue-400/50"
            }>
              {originalCanMark ? (
                lastMarkedIndex !== null ? (
                  <>
                    <InfoIcon className="h-5 w-5 text-blue-400 mr-2" />
                    <AlertDescription className="text-blue-300">
                      Puedes desmarcar la casilla seleccionada para elegir otra
                    </AlertDescription>
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="h-5 w-5 text-green-400 mr-2" />
                    <AlertDescription className="text-green-300">
                      ¡Puedes marcar una casilla de &quot;{currentCategory.name}&quot; ahora!
                    </AlertDescription>
                  </>
                )
              ) : (
                <>
                  <InfoIcon className="h-5 w-5 text-blue-400 mr-2" />
                  <AlertDescription className="text-blue-300">
                    Espera a que el Game Master habilite el marcado
                  </AlertDescription>
                </>
              )}
            </Alert>
          )}

          {(gamePhase === 'playing' || currentCategory) && (
            <Card className="p-2 md:p-4 bg-black/30 border border-white/20">
              <div className="grid grid-cols-5 gap-1 md:gap-3">
                {board.map((category, index) => {
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
                        border border-white/20
                        ${isMarkable ? 'cursor-pointer hover:ring-2 hover:ring-purple-400' : 'cursor-default'}
                        ${category.marked ? 'scale-95 shadow-inner' : 'shadow hover:shadow-md'}
                        ${isSelected ? 'ring-2 ring-purple-400' : ''}
                      `}
                      style={isSelected ? { boxShadow: '0 0 15px rgba(168,85,247,0.4)' } : {}}
                      onClick={() => handleMarkCell(index)}
                      disabled={!isMarkable}
                      aria-label={`Casilla ${category.name}`}
                    >
                      {category.marked && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm rounded-lg">
                          <CheckCircleIcon className="text-green-400 w-6 md:w-10 h-6 md:h-10"
                            style={{ filter: 'drop-shadow(0 0 8px rgb(74 222 128 / 0.5))' }}
                          />
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
              <h3 className="text-lg font-semibold text-white">
                Jugadores Conectados
              </h3>
              <div className="flex items-center gap-2 text-white/80 bg-white/10 backdrop-blur-sm px-3 py-1 rounded-full border border-white/20">
                <Users className="w-4 h-4" />
                <span>{connectedPlayers.length}</span>
              </div>
            </div>
            <div className="bg-black/30 rounded-lg divide-y divide-white/10 border border-white/20">
              {connectedPlayers.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between p-3"
                >
                  <span className="font-medium text-white">
                    {player.name}
                    {player.isHost && " (Game Master)"}
                  </span>
                  {player.name === playerName && (
                    <span className="text-xs text-purple-300 font-medium">(Tú)</span>
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