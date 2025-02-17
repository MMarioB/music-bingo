import { useState } from 'react';
import { ChevronLeft, Music2, Trophy, Check, X } from 'lucide-react';
import PropTypes from 'prop-types';

const PredictionsPanel = ({ 
    predictions, 
    currentSong, 
    markedCorrect,
    onClose 
}) => {
    const [activeTab, setActiveTab] = useState('predictions');

    // Convertir las predicciones del objeto a array
    const predictionsList = Object.entries(predictions).reduce((acc, [playerName, playerPredictions]) => {
        return [...acc, ...playerPredictions.map(pred => ({
            player: playerName,
            prediction: pred
        }))];
    }, []);

    // Crear lista de resultados cuando la canción está revelada
    const resultsList = currentSong?.revealed ? predictionsList.map(pred => ({
        ...pred,
        correct: markedCorrect[pred.player] || false
    })) : [];

    return (
        <div className="fixed bottom-4 left-4 right-4 bg-black/80 backdrop-blur-lg rounded-2xl border border-white/10 overflow-hidden shadow-xl">
            {/* Tabs */}
            <div className="flex border-b border-white/10">
                <button
                    onClick={() => setActiveTab('predictions')}
                    className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 text-sm font-medium transition-colors
            ${activeTab === 'predictions' ? 'text-purple-300 bg-white/5' : 'text-white/60'}`}
                >
                    <Music2 className="w-4 h-4" />
                    Predicciones
                </button>
                <button
                    onClick={() => setActiveTab('results')}
                    className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 text-sm font-medium transition-colors
            ${activeTab === 'results' ? 'text-green-300 bg-white/5' : 'text-white/60'}`}
                >
                    <Trophy className="w-4 h-4" />
                    Resultados
                </button>
            </div>

            {/* Content */}
            <div className="max-h-64 overflow-y-auto">
                {activeTab === 'predictions' ? (
                    <div className="p-4 space-y-3">
                        {predictionsList.map((item, index) => (
                            <div
                                key={index}
                                className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10"
                            >
                                <div className="w-8 h-8 flex items-center justify-center rounded-full bg-purple-500/20 text-purple-300 text-sm">
                                    {index + 1}
                                </div>
                                <div className="flex-1">
                                    <span className="text-white font-medium">{item.prediction}</span>
                                    <div className="text-xs text-purple-300 mt-1">{item.player}</div>
                                </div>
                            </div>
                        ))}
                        {predictionsList.length === 0 && (
                            <div className="text-center text-white/60 py-8">
                                No hay predicciones aún
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="p-4 space-y-3">
                        {resultsList.map((result, index) => (
                            <div
                                key={index}
                                className={`flex items-center gap-3 p-3 rounded-xl border 
                  ${result.correct
                                        ? 'bg-green-500/10 border-green-500/30 text-green-300'
                                        : 'bg-red-500/10 border-red-500/30 text-red-300'}`}
                            >
                                {result.correct ? (
                                    <Check className="w-5 h-5 text-green-400" />
                                ) : (
                                    <X className="w-5 h-5 text-red-400" />
                                )}
                                <div className="flex-1">
                                    <span className="font-medium">{result.prediction}</span>
                                    <div className="text-xs mt-1 opacity-75">{result.player}</div>
                                </div>
                            </div>
                        ))}
                        {resultsList.length === 0 && (
                            <div className="text-center text-white/60 py-8">
                                {currentSong?.revealed 
                                    ? 'No hubo predicciones'
                                    : 'Aún no se ha revelado la canción'
                                }
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Bottom Controls */}
            <div className="p-3 border-t border-white/10 flex justify-between items-center">
                <button
                    onClick={onClose}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 text-white/80 hover:bg-white/10 transition-colors"
                >
                    <ChevronLeft className="w-4 h-4" />
                    Volver
                </button>
                <div className="text-sm text-white/60">
                    {activeTab === 'predictions' ?
                        `${predictionsList.length} predicciones` :
                        `${resultsList.length} resultados`}
                </div>
            </div>
        </div>
    );
};

PredictionsPanel.propTypes = {
    predictions: PropTypes.object,
    currentSong: PropTypes.shape({
        revealed: PropTypes.bool,
        title: PropTypes.string,
        artist: PropTypes.string,
        year: PropTypes.number
    }),
    songPlaying: PropTypes.bool,
    markedCorrect: PropTypes.object,
    onClose: PropTypes.func
};

PredictionsPanel.defaultProps = {
    predictions: {},
    currentSong: null,
    songPlaying: false,
    markedCorrect: {},
    onClose: () => {}
};

export default PredictionsPanel;