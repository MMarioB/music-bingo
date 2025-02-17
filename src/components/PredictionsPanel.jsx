import { useState } from 'react';
import { ChevronLeft, Music2, Trophy, Check, X } from 'lucide-react';
import PropTypes from 'prop-types';

const PredictionsPanel = ({ predictions = [], results = [], onClose }) => {
    const [activeTab, setActiveTab] = useState('predictions');

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
                        {predictions.map((prediction, index) => (
                            <div
                                key={index}
                                className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10"
                            >
                                <div className="w-8 h-8 flex items-center justify-center rounded-full bg-purple-500/20 text-purple-300 text-sm">
                                    {index + 1}
                                </div>
                                <span className="flex-1 text-white font-medium">{prediction}</span>
                            </div>
                        ))}
                        {predictions.length === 0 && (
                            <div className="text-center text-white/60 py-8">
                                No hay predicciones aún
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="p-4 space-y-3">
                        {results.map((result, index) => (
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
                                <span className="flex-1 font-medium">{result.prediction}</span>
                            </div>
                        ))}
                        {results.length === 0 && (
                            <div className="text-center text-white/60 py-8">
                                Aún no hay resultados
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
                        `${predictions.length} predicciones` :
                        `${results.length} resultados`}
                </div>
            </div>
        </div>
    );
};

PredictionsPanel.propTypes = {
    predictions: PropTypes.arrayOf(PropTypes.string),
    results: PropTypes.arrayOf(
        PropTypes.shape({
            prediction: PropTypes.string.isRequired,
            correct: PropTypes.bool.isRequired
        })
    ),
    onClose: PropTypes.func.isRequired
};

PredictionsPanel.defaultProps = {
    predictions: [],
    results: []
};

export default PredictionsPanel;