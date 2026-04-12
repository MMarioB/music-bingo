import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { Send, AlertCircle } from 'lucide-react';

const PlayerPredictions = ({ gameState, onSubmitPrediction, myPredictions = [] }) => {
  const [prediction, setPrediction] = useState('');
  const [error, setError] = useState('');

  const isRevealed = !!gameState.currentSong?.revealed;
  const canSubmit = gameState.songPlaying && !isRevealed;

  const handleSubmit = useCallback((e) => {
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
  }, [prediction, canSubmit, onSubmitPrediction]);

  const handleChange = useCallback((e) => {
    setPrediction(e.target.value);
  }, []);

  useEffect(() => {
    setPrediction('');
    setError('');
  }, [gameState.currentSong]);

  return (
    <div className="flex flex-col items-end gap-3 z-40 w-full">
      {myPredictions.length > 0 && gameState.songPlaying && (
        <div className="bg-black/60 backdrop-blur-sm border border-purple-500/30 rounded-lg p-3 w-full sm:max-w-xs animate-slideUp">
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
        </div>
      )}

      {gameState.songPlaying && (
        <form
          onSubmit={handleSubmit}
          className="flex gap-2 animate-slideUp"
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
                    onChange={handleChange}
                    placeholder="¿Qué canción es?"
                    className="w-full bg-black/40 border-white/20 text-white placeholder:text-white/50"
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
        </form>
      )}

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slideUp { animation: slideUp 0.3s ease-out forwards; }
      `}</style>
    </div>
  );
};

PlayerPredictions.propTypes = {
  gameState: PropTypes.object.isRequired,
  onSubmitPrediction: PropTypes.func.isRequired,
  myPredictions: PropTypes.array,
};

export default React.memo(PlayerPredictions);
