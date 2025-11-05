import { useEffect, useState } from 'react';
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
      className="bg-black/40 border border-white/20 rounded-lg p-4"
    >
      <div className="flex items-center justify-between gap-4">
        {/* Countdown circular */}
        <div className="flex-shrink-0">
          <div className="relative w-20 h-20">
            {/* Círculo de fondo */}
            <svg className="w-20 h-20 transform -rotate-90">
              <circle
                cx="40"
                cy="40"
                r="34"
                stroke="currentColor"
                strokeWidth="6"
                fill="none"
                className="text-white/10"
              />
              {/* Círculo de progreso */}
              <circle
                cx="40"
                cy="40"
                r="34"
                stroke="currentColor"
                strokeWidth="6"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 34}`}
                strokeDashoffset={`${2 * Math.PI * 34 * (1 - progress)}`}
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
              <span className={`text-2xl font-bold ${colors.text}`}>
                {timeRemaining}
              </span>
            </motion.div>
          </div>
        </div>

        {/* Info y controles */}
        <div className="flex-1 space-y-3">
          {/* Header con estado */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                {isPaused ? (
                  <>⏸️ Pausado</>
                ) : timeRemaining === 0 ? (
                  <>⏰ ¡Tiempo terminado!</>
                ) : (
                  <>⏱️ Escuchando canción</>
                )}
              </h3>
              <p className="text-white/60 text-xs mt-0.5">
                {timeRemaining > 0 ? `${timeRemaining} segundos restantes` : 'Listo para revelar'}
              </p>
            </div>

            {/* Predicciones */}
            <div className="text-right">
              <div className="flex items-center gap-1 text-sm">
                <Check className="w-4 h-4 text-green-400" />
                <span className="text-white font-bold">{predictionsCount}</span>
                <span className="text-white/60">/ {totalPlayers}</span>
              </div>
              <p className="text-xs text-white/60">predicciones</p>
            </div>
          </div>

          {/* Barra de progreso */}
          <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
            <motion.div
              className={`h-full ${colors.bg} transition-all duration-1000`}
              style={{ width: `${percentage}%` }}
              animate={shouldPulse ? { opacity: [1, 0.7, 1] } : {}}
              transition={{ duration: 0.5, repeat: Infinity }}
            />
          </div>

          {/* Botón de Spotify (backup manual) */}
          {spotifyUrl && (
            <Button
              onClick={() => window.open(spotifyUrl, '_blank')}
              size="sm"
              className="w-full bg-green-600 hover:bg-green-700 text-white h-9 font-semibold"
            >
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
              </svg>
              Abrir Spotify (si no se abrió)
            </Button>
          )}

          {/* Controles */}
          {timeRemaining > 0 ? (
            <div className="flex gap-2">
              {/* Pausar/Reanudar */}
              {isPaused ? (
                <Button
                  onClick={onResume}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white h-8"
                >
                  <Play className="w-3 h-3 mr-1" />
                  Reanudar
                </Button>
              ) : (
                <Button
                  onClick={onPause}
                  size="sm"
                  variant="outline"
                  className="border-white/20 text-white/80 hover:bg-white/10 h-8"
                >
                  <Pause className="w-3 h-3 mr-1" />
                  Pausar
                </Button>
              )}

              {/* +15s */}
              <Button
                onClick={onAddTime}
                size="sm"
                variant="outline"
                className="border-white/20 text-white/80 hover:bg-white/10 h-8"
              >
                <Plus className="w-3 h-3 mr-1" />
                +15s
              </Button>

              {/* Revelar ahora */}
              <Button
                onClick={onRevealNow}
                size="sm"
                className="bg-purple-600 hover:bg-purple-700 text-white h-8 ml-auto"
              >
                Revelar Ahora
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

export default SongTimer;
