import { useState } from 'react';
import PropTypes from 'prop-types';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { Send, Music2Icon, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScrollArea } from './ui/scroll-area';

const PlayerPredictions = ({
  isRevealed,
  onSubmitPrediction,
  predictions = [],
  currentSongStarted
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

    onSubmitPrediction(prediction.trim());
    setPrediction('');
    setError('');
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
              <div className="flex gap-2">
                <Input
                  value={prediction}
                  onChange={(e) => setPrediction(e.target.value)}
                  placeholder="¿Qué canción crees que es?"
                  className="w-64 bg-black/40 border-white/20 text-white placeholder:text-white/50"
                />
                <Button 
                  type="submit"
                  size="icon"
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Send size={18} />
                </Button>
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
  currentSongStarted: PropTypes.bool.isRequired
};

export default PlayerPredictions;