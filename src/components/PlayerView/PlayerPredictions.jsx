import { useState } from 'react';
import PropTypes from 'prop-types';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { Send, Music2Icon, AlertCircle, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScrollArea } from '../ui/scroll-area';

const PlayerPredictions = ({
  isRevealed,
  onSubmitPrediction,
  predictions = [],
  currentSongStarted,
  disabled = false,
  timeRemaining = null
}) => {
  const [prediction, setPrediction] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!prediction.trim()) {
      setError('Escribe tu predicción primero');
      return;
    }

    if (!currentSongStarted) {
      setError('Espera a que comience la canción');
      return;
    }

    if (isRevealed) {
      setError('Ya no se pueden hacer predicciones');
      return;
    }

    if (disabled) {
      setError('Se ha agotado el tiempo para predecir');
      return;
    }

    onSubmitPrediction(prediction.trim());
    setPrediction('');
    setError('');
  };

  // Función para renderizar el temporizador dentro del formulario
  const renderTimer = () => {
    if (!timeRemaining || timeRemaining <= 0 || isRevealed) return null;
    
    // Colores basados en el tiempo restante
    let colorClass = "text-green-400";
    if (timeRemaining <= 10) colorClass = "text-red-400";
    else if (timeRemaining <= 20) colorClass = "text-yellow-400";
    
    return (
      <div className="flex items-center gap-1 text-xs">
        <Clock className={`h-3 w-3 ${colorClass}`} />
        <span className={colorClass}>{timeRemaining}s</span>
      </div>
    );
  };

  return (
    <div className="fixed bottom-4 sm:bottom-6 right-4 sm:right-6 flex flex-col items-end gap-2 z-40">
      {/* Lista de predicciones */}
      <AnimatePresence>
        {predictions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="bg-black/40 backdrop-blur-sm rounded-lg p-3 border border-white/20 w-64"
          >
            <h3 className="text-sm font-medium text-white/80 mb-2 flex items-center gap-2">
              <Music2Icon size={14} />
              Tus predicciones
            </h3>
            <ScrollArea className="h-[120px]">
              <div className="space-y-1">
                {predictions.map((pred, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="text-sm text-white/70 bg-white/5 rounded px-2 py-1"
                  >
                    {pred}
                  </motion.div>
                ))}
              </div>
            </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input de predicción */}
      <AnimatePresence>
        {!isRevealed && currentSongStarted && (
          <motion.form
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            onSubmit={handleSubmit}
            className="flex gap-2"
          >
            <div className="space-y-2">
              {error && (
                <Alert variant="destructive" className="bg-red-500/20 border-red-500/50 py-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      value={prediction}
                      onChange={(e) => setPrediction(e.target.value)}
                      placeholder="¿Qué canción crees que es?"
                      className={`w-64 bg-black/40 border-white/20 text-white placeholder:text-white/50 ${
                        disabled ? 'opacity-70' : ''
                      }`}
                      disabled={disabled || isRevealed}
                    />
                    {timeRemaining && timeRemaining > 0 && (
                      <div className="absolute right-2 top-0 bottom-0 flex items-center">
                        {renderTimer()}
                      </div>
                    )}
                  </div>
                  <Button 
                    type="submit"
                    size="icon"
                    className={`bg-purple-600 hover:bg-purple-700 ${
                      disabled ? 'opacity-70 cursor-not-allowed' : ''
                    }`}
                    disabled={disabled || isRevealed}
                  >
                    <Send size={18} />
                  </Button>
                </div>
                
                {/* Barra de progreso para el timer */}
                {timeRemaining && timeRemaining > 0 && (
                  <div className="w-full bg-gray-700/50 rounded-full h-1">
                    <motion.div 
                      className={`h-1 rounded-full ${
                        timeRemaining <= 10 ? 'bg-red-500' : 
                        timeRemaining <= 20 ? 'bg-yellow-500' : 
                        'bg-green-500'
                      }`}
                      style={{ width: `${(timeRemaining / 30) * 100}%` }}
                      initial={{ width: "100%" }}
                      animate={{ width: `${(timeRemaining / 30) * 100}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                )}
                
                {/* Mensaje cuando el tiempo se ha acabado */}
                {disabled && !isRevealed && (
                  <div className="text-xs text-red-400 flex items-center">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Se acabó el tiempo para predecir
                  </div>
                )}
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
};

PlayerPredictions.propTypes = {
  isRevealed: PropTypes.bool.isRequired,
  onSubmitPrediction: PropTypes.func.isRequired,
  predictions: PropTypes.arrayOf(PropTypes.string),
  currentSongStarted: PropTypes.bool.isRequired,
  disabled: PropTypes.bool,
  timeRemaining: PropTypes.number
};

export default PlayerPredictions;