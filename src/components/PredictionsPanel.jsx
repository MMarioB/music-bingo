import { useState } from 'react';
import { ChevronUp, ChevronDown, Music2, Check, X } from 'lucide-react';
import PropTypes from 'prop-types';

const PredictionsPanel = ({
    predictions,
    currentSong,
    markedCorrect,
}) => {
    const [activeTab, setActiveTab] = useState('predictions');
    const [isExpanded, setIsExpanded] = useState(false);

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

    if (!isExpanded) {
        return (
            <button
                onClick={() => setIsExpanded(true)}
                className="fixed bottom-4 right-4 flex items-center gap-2 px-4 py-3 bg-black/80 backdrop-blur-lg rounded-full border border-white/10 text-white/80 hover:bg-white/10 transition-colors shadow-lg"
            >
                <Music2 className="w-4 h-4" />
                <span className="text-sm font-medium">
                    {predictionsList.length} predicciones
                </span>
                <ChevronUp className="w-4 h-4" />
            </button>
        );
    }

    return (
        <div className="fixed bottom-4 right-4 w-80 bg-black/80 backdrop-blur-lg rounded-2xl border border-white/10 overflow-hidden shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-white/10">
                <div className="flex gap-3">
                    <button
                        onClick={() => setActiveTab('predictions')}
                        className={`text-sm font-medium transition-colors
                            ${activeTab === 'predictions' ? 'text-purple-300' : 'text-white/60'}`}
                    >
                        Predicciones
                    </button>
                    <button
                        onClick={() => setActiveTab('results')}
                        className={`text-sm font-medium transition-colors
                            ${activeTab === 'results' ? 'text-green-300' : 'text-white/60'}`}
                    >
                        Resultados
                    </button>
                </div>
                <button
                    onClick={() => setIsExpanded(false)}
                    className="p-1 text-white/60 hover:text-white/80 transition-colors"
                >
                    <ChevronDown className="w-4 h-4" />
                </button>
            </div>

            {/* Content */}
            <div className="max-h-96 overflow-y-auto">
                {activeTab === 'predictions' ? (
                    <div className="p-3 space-y-2">
                        {predictionsList.map((item, index) => (
                            <div
                                key={index}
                                className="flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-white/10"
                            >
                                <div className="w-6 h-6 flex items-center justify-center rounded-full bg-purple-500/20 text-purple-300 text-xs">
                                    {index + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm text-white font-medium truncate">
                                        {item.prediction}
                                    </div>
                                    <div className="text-xs text-purple-300 truncate">
                                        {item.player}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {predictionsList.length === 0 && (
                            <div className="text-center text-white/60 py-6 text-sm">
                                No hay predicciones aún
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="p-3 space-y-2">
                        {resultsList.map((result, index) => (
                            <div
                                key={index}
                                className={`flex items-center gap-2 p-2 rounded-lg border 
                                    ${result.correct
                                        ? 'bg-green-500/10 border-green-500/30'
                                        : 'bg-red-500/10 border-red-500/30'}`}
                            >
                                {result.correct ? (
                                    <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                                ) : (
                                    <X className="w-4 h-4 text-red-400 flex-shrink-0" />
                                )}
                                <div className="flex-1 min-w-0">
                                    <div className={`text-sm font-medium truncate
                                        ${result.correct ? 'text-green-300' : 'text-red-300'}`}>
                                        {result.prediction}
                                    </div>
                                    <div className="text-xs opacity-75 truncate">
                                        {result.player}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {resultsList.length === 0 && (
                            <div className="text-center text-white/60 py-6 text-sm">
                                {currentSong?.revealed
                                    ? 'No hubo predicciones'
                                    : 'Aún no se ha revelado la canción'
                                }
                            </div>
                        )}
                    </div>
                )}
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
    onClose: () => { }
};

export default PredictionsPanel;