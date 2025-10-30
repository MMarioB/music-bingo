import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { Send, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// El componente ahora es más "tonto" y recibe menos props.
const PlayerPredictions = ({ gameState, onSubmitPrediction, myPredictions = [] }) => {
  const [prediction, setPrediction] = useState('');
  const [error, setError] = useState('');

  // Derivamos el estado de la UI a partir del gameState
  const isRevealed = !!gameState.currentSong?.revealed;
  const canSubmit = gameState.songPlaying && !isRevealed;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!prediction.trim()) {
      setError('Escribe tu predicción primero.');
      return;
    }
    if (!canSubmit) {
      setError('No se pueden hacer predicciones ahora.');
      return;
    }
    
    onSubmitPrediction(prediction.trim());
    setPrediction('');
    setError('');
  };

  useEffect(() => {
    // Limpiar el input cuando empiece una nueva canción
    setPrediction('');
    setError('');
  }, [gameState.currentSong]); // Depende del objeto de la canción actual

  return (
    <div className="relative bottom-4 sm:bottom-6 right-4 sm:right-6 flex flex-col items-end gap-3 z-40 mb-20">
      {/* Mostrar mis predicciones */}
      {myPredictions.length > 0 && gameState.songPlaying && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-black/60 backdrop-blur-sm border border-purple-500/30 rounded-lg p-3 max-w-xs"
        >
          <h3 className="text-xs font-semibold text-purple-300 mb-2">Tus predicciones:</h3>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {myPredictions.map((pred, index) => (
              <div
                key={index}
                className={`text-sm px-2 py-1 rounded ${
                  index === myPredictions.length - 1
                    ? 'bg-purple-500/30 text-purple-200 font-medium'
                    : 'bg-white/5 text-white/60'
                }`}
              >
                {pred}
                {index === myPredictions.length - 1 && (
                  <span className="text-xs ml-2 text-purple-400">(última)</span>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      <AnimatePresence>
        {gameState.songPlaying && (
          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
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
              <div className="relative">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      value={prediction}
                      onChange={(e) => setPrediction(e.target.value)}
                      placeholder="¿Qué canción es?"
                      className="w-64 bg-black/40 border-white/20 text-white placeholder:text-white/50"
                      disabled={!canSubmit}
                    />
                  </div>
                  <Button
                    type="submit"
                    size="icon"
                    className="bg-purple-600 hover:bg-purple-700"
                    disabled={!canSubmit}
                  >
                    <Send size={18} />
                  </Button>
                </div>
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
};

PlayerPredictions.propTypes = {
  // Ahora solo necesita el estado del juego y la función de submit
  gameState: PropTypes.object.isRequired,
  onSubmitPrediction: PropTypes.func.isRequired,
  myPredictions: PropTypes.array,
};

export default PlayerPredictions;