import { useState } from 'react';
import PropTypes from 'prop-types';
import { motion, AnimatePresence } from 'framer-motion';
import { ScrollArea } from './ui/scroll-area';
import { Music2Icon, Trophy, ChevronRight, ChevronLeft, ChevronDown, Check } from 'lucide-react';
import { Button } from './ui/button';

const PredictionsPanel = ({ predictions, currentSong, songPlaying }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [showFullHistory, setShowFullHistory] = useState(false);
    const [markingEnabled, setMarkingEnabled] = useState(false);
    const [markedCorrect, setMarkedCorrect] = useState({});

    // Calcular estadísticas
    const getPlayerStats = () => {
        if (!currentSong?.revealed) return null;

        return Object.entries(predictions).map(([player, preds]) => {
            const isCorrect = markedCorrect[player] || false;

            return {
                player,
                predictions: preds,
                isCorrect,
                predictionCount: preds.length,
                lastPrediction: preds[preds.length - 1] || ''
            };
        }).sort((a, b) => b.isCorrect - a.isCorrect || b.predictionCount - a.predictionCount);
    };

    const stats = getPlayerStats();

    const handleToggleCorrect = (player) => {
        if (!markingEnabled) return;
        setMarkedCorrect(prev => ({
            ...prev,
            [player]: !prev[player]
        }));
    };

    const renderPredictionsList = () => (
        <div>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Music2Icon className="w-4 h-4 text-purple-300" />
                    <h4 className="text-sm font-semibold text-white/80">
                        Predicciones actuales
                    </h4>
                </div>
                {currentSong?.revealed && (
                    <Button
                        size="sm"
                        variant={markingEnabled ? "destructive" : "default"}
                        onClick={() => setMarkingEnabled(!markingEnabled)}
                        className="text-xs"
                    >
                        {markingEnabled ? "Deshabilitar marcado" : "Habilitar marcado"}
                    </Button>
                )}
            </div>
            <div className="space-y-2">
                {Object.entries(predictions).map(([player, preds]) => {
                    const lastPrediction = preds[preds.length - 1];
                    return (
                        <motion.div
                            key={player}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className={`flex items-center justify-between p-3 rounded-lg border 
                                ${markedCorrect[player] 
                                    ? 'bg-green-500/20 border-green-500/30' 
                                    : 'bg-black/20 border-white/10'}`}
                        >
                            <div className="flex items-center gap-3">
                                {markingEnabled && (
                                    <div
                                        onClick={() => handleToggleCorrect(player)}
                                        className={`w-5 h-5 rounded border flex items-center justify-center cursor-pointer
                                            ${markedCorrect[player] 
                                                ? 'bg-green-500 border-green-500' 
                                                : 'border-white/50 hover:border-white/80'}`}
                                    >
                                        {markedCorrect[player] && <Check className="w-4 h-4 text-white" />}
                                    </div>
                                )}
                                <span className="text-sm font-medium text-white/90">{player}</span>
                            </div>
                            <div className="text-sm text-purple-300">
                                {lastPrediction}
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );

    return (
        <>
            <Button
                onClick={() => setIsExpanded(!isExpanded)}
                className="fixed lg:hidden z-50 right-4 top-24 bg-purple-600/80 hover:bg-purple-600 text-white rounded-full p-2 shadow-lg"
            >
                {isExpanded ? <ChevronRight /> : <ChevronLeft />}
            </Button>

            <motion.div
                initial={{ opacity: 0, x: 300 }}
                animate={{
                    opacity: 1,
                    x: 0,
                    width: isExpanded ? '100%' : 'auto'
                }}
                exit={{ opacity: 0, x: 300 }}
                className={`fixed right-0 top-0 lg:top-24 bg-black/40 backdrop-blur-lg shadow-xl border-l border-white/10 overflow-hidden
                    ${isExpanded ? 'h-screen w-full' : 'lg:w-80 hidden lg:block'}`}
            >
                <div className="p-4 bg-black/60 border-b border-white/10">
                    <h3 className="text-lg font-semibold text-white flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Music2Icon className="w-5 h-5" />
                            Predicciones
                        </div>
                        {isExpanded && (
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setIsExpanded(false)}
                                className="lg:hidden"
                            >
                                <ChevronRight />
                            </Button>
                        )}
                    </h3>
                </div>

                <ScrollArea className="h-[calc(100vh-120px)] lg:h-[calc(100vh-250px)] p-4">
                    {stats && (
                        <div className="mb-6">
                            <h4 className="text-sm font-semibold text-white/80 mb-2 flex items-center gap-2">
                                <Trophy className="w-4 h-4" />
                                Resultados
                            </h4>
                            <div className="space-y-2">
                                {stats.map(({ player, isCorrect, lastPrediction }) => (
                                    <motion.div
                                        key={player}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className={`p-2 rounded-lg ${
                                            isCorrect
                                                ? 'bg-green-500/20 border-green-500/30'
                                                : 'bg-white/5 border-white/10'
                                        } border`}
                                    >
                                        <div className="flex justify-between items-center">
                                            <span className="font-medium text-white">{player}</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm text-purple-300">{lastPrediction}</span>
                                                {isCorrect && (
                                                    <span className="text-xs bg-green-500/30 text-green-300 px-2 py-1 rounded-full">
                                                        ¡Acierto!
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    )}

                    {songPlaying && (
                        <div className="space-y-4">
                            {renderPredictionsList()}
                            <div className="mt-4 pt-4 border-t border-white/10">
                                <Button
                                    variant="ghost"
                                    className="w-full flex items-center justify-between text-sm font-medium text-white/70 hover:text-white/90"
                                    onClick={() => setShowFullHistory(!showFullHistory)}
                                >
                                    <span>Ver historial completo</span>
                                    <ChevronDown className={`w-4 h-4 transition-transform ${showFullHistory ? 'rotate-180' : ''}`} />
                                </Button>
                                <AnimatePresence>
                                    {showFullHistory && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="mt-3 space-y-4 overflow-hidden"
                                        >
                                            {Object.entries(predictions).map(([player, preds]) => (
                                                <div key={player} className="space-y-2">
                                                    <h5 className="text-sm font-medium text-white/70">{player}</h5>
                                                    <div className="pl-3 space-y-1">
                                                        <AnimatePresence mode="popLayout">
                                                            {preds.map((prediction, index) => (
                                                                <motion.div
                                                                    key={`${player}-${index}`}
                                                                    initial={{ opacity: 0, x: 50 }}
                                                                    animate={{ opacity: 1, x: 0 }}
                                                                    exit={{ opacity: 0, x: -50 }}
                                                                    className="text-sm text-white/60 bg-white/5 p-2 rounded-lg"
                                                                >
                                                                    {prediction}
                                                                </motion.div>
                                                            ))}
                                                        </AnimatePresence>
                                                    </div>
                                                </div>
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    )}

                    {(!songPlaying && !stats) && (
                        <div className="text-center text-white/50 py-8">
                            No hay predicciones aún
                        </div>
                    )}
                </ScrollArea>
            </motion.div>
        </>
    );
};

PredictionsPanel.propTypes = {
    predictions: PropTypes.object.isRequired,
    currentSong: PropTypes.object,
    songPlaying: PropTypes.bool.isRequired
};

export default PredictionsPanel;