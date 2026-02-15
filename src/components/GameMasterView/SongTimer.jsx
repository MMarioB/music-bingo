import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Plus, Check } from 'lucide-react';
import { Button } from '../ui/button';
import PropTypes from 'prop-types';

const SongTimer = ({
  duration = 30,
  isRunning,
  isPaused,
  timeRemaining,
  predictionsCount = 0,
  totalPlayers = 0,
  spotifyUrl,
  onPause,
  onResume,
  onAddTime,
  onRevealNow,
  onComplete
}) => {
  // Calcular progreso (0-1)
  const progress = timeRemaining / duration;

  // Determinar color según tiempo restante
  const getColor = () => {
    if (timeRemaining > 10) return { bg: 'bg-green-500', text: 'text-green-400', ring: 'ring-green-500' };
    if (timeRemaining > 5) return { bg: 'bg-yellow-500', text: 'text-yellow-400', ring: 'ring-yellow-500' };
    return { bg: 'bg-red-500', text: 'text-red-400', ring: 'ring-red-500' };
  };

  const colors = getColor();
  const percentage = Math.round(progress * 100);

  // Efecto de pulso en los últimos 10 segundos
  const shouldPulse = timeRemaining <= 10 && isRunning && !isPaused;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-black/40 border border-white/20 rounded-lg p-3"
    >
      <div className="flex items-center gap-3">
        {/* Countdown circular más pequeño */}
        <div className="flex-shrink-0">
          <div className="relative w-16 h-16">
            {/* Círculo de fondo */}
            <svg className="w-16 h-16 transform -rotate-90">
              <circle
                cx="32"
                cy="32"
                r="28"
                stroke="currentColor"
                strokeWidth="5"
                fill="none"
                className="text-white/10"
              />
              {/* Círculo de progreso */}
              <circle
                cx="32"
                cy="32"
                r="28"
                stroke="currentColor"
                strokeWidth="5"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 28}`}
                strokeDashoffset={`${2 * Math.PI * 28 * (1 - progress)}`}
                className={`${colors.text} transition-all duration-1000`}
                strokeLinecap="round"
              />
            </svg>

            {/* Número en el centro */}
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              animate={shouldPulse ? { scale: [1, 1.1, 1] } : {}}
              transition={{ duration: 1, repeat: Infinity }}
            >
              <span className={`text-xl font-bold ${colors.text}`}>
                {timeRemaining}
              </span>
            </motion.div>
          </div>
        </div>

        {/* Info y controles */}
        <div className="flex-1 space-y-2">
          {/* Header con estado y predicciones en una línea más compacta */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-semibold text-sm truncate">
                {isPaused ? (
                  <>⏸️ Pausado</>
                ) : timeRemaining === 0 ? (
                  <>⏰ ¡Tiempo!</>
                ) : (
                  <>⏱️ {timeRemaining}s</>
                )}
              </h3>
            </div>

            {/* Predicciones compactas */}
            <div className="flex items-center gap-1 text-sm flex-shrink-0">
              <Check className="w-3 h-3 text-green-400" />
              <span className="text-white font-bold">{predictionsCount}</span>
              <span className="text-white/60">/{totalPlayers}</span>
            </div>
          </div>

          {/* Barra de progreso */}
          <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
            <motion.div
              className={`h-full ${colors.bg} transition-all duration-1000`}
              style={{ width: `${percentage}%` }}
              animate={shouldPulse ? { opacity: [1, 0.7, 1] } : {}}
              transition={{ duration: 0.5, repeat: Infinity }}
            />
          </div>

          {/* Controles */}
          {timeRemaining > 0 ? (
            <div className="flex gap-1.5">
              {/* Botón Spotify compacto */}
              {spotifyUrl && (
                <Button
                  onClick={() => window.open(spotifyUrl, '_blank')}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white h-7 px-2 flex-shrink-0"
                >
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                  </svg>
                </Button>
              )}

              {/* Pausar/Reanudar */}
              {isPaused ? (
                <Button
                  onClick={onResume}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white h-7 px-2"
                >
                  <Play className="w-3 h-3 mr-1" />
                  <span className="hidden sm:inline">Reanudar</span>
                  <span className="sm:hidden">▶️</span>
                </Button>
              ) : (
                <Button
                  onClick={onPause}
                  size="sm"
                  variant="outline"
                  className="border-white/20 text-white/80 hover:bg-white/10 h-7 px-2"
                >
                  <Pause className="w-3 h-3 mr-1" />
                  <span className="hidden sm:inline">Pausar</span>
                  <span className="sm:hidden">⏸️</span>
                </Button>
              )}

              {/* +15s */}
              <Button
                onClick={onAddTime}
                size="sm"
                variant="outline"
                className="border-white/20 text-white/80 hover:bg-white/10 h-7 px-2"
              >
                <Plus className="w-3 h-3 mr-1" />
                +15s
              </Button>

              {/* Revelar ahora */}
              <Button
                onClick={onRevealNow}
                size="sm"
                className="bg-purple-600 hover:bg-purple-700 text-white h-7 px-2 ml-auto"
              >
                Revelar
              </Button>
            </div>
          ) : (
            // Botón prominente cuando termina el timer
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              <Button
                onClick={onRevealNow}
                className="w-full h-10 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold"
                style={{ boxShadow: '0 0 20px rgba(168,85,247,0.5)' }}
              >
                🎵 Revelar Canción
              </Button>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

SongTimer.propTypes = {
  duration: PropTypes.number,
  isRunning: PropTypes.bool.isRequired,
  isPaused: PropTypes.bool.isRequired,
  timeRemaining: PropTypes.number.isRequired,
  predictionsCount: PropTypes.number,
  totalPlayers: PropTypes.number,
  spotifyUrl: PropTypes.string,
  onPause: PropTypes.func.isRequired,
  onResume: PropTypes.func.isRequired,
  onAddTime: PropTypes.func.isRequired,
  onRevealNow: PropTypes.func.isRequired,
  onComplete: PropTypes.func
};

export default React.memo(SongTimer);
