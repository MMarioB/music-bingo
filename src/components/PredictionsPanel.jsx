import { useState } from 'react';
import PropTypes from 'prop-types';
import { motion, AnimatePresence } from 'framer-motion';
import { ScrollArea } from './ui/scroll-area';
import { Music2Icon, Trophy, ChevronRight, ChevronLeft } from 'lucide-react';
import { Button } from './ui/button';

const PredictionsPanel = ({ predictions, currentSong, songPlaying }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    // Calcular estadísticas
    const getPlayerStats = () => {
        if (!currentSong?.revealed) return null;

        return Object.entries(predictions).map(([player, preds]) => {
            const lastPrediction = preds[preds.length - 1]?.toLowerCase() || '';
            const correctTitle = currentSong.title.toLowerCase();
            const correctArtist = currentSong.artist.toLowerCase();
            const isCorrect = lastPrediction.includes(correctTitle) || lastPrediction.includes(correctArtist);

            return {
                player,
                predictions: preds,
                isCorrect,
                predictionCount: preds.length
            };
        }).sort((a, b) => b.isCorrect - a.isCorrect || b.predictionCount - a.predictionCount);
    };

    const stats = getPlayerStats();

    return (
        <>
            {/* Botón de toggle para móvil */}
            <Button
                onClick={() => setIsExpanded(!isExpanded)}
                className="fixed lg:hidden z-50 right-4 top-24 bg-purple-600/80 hover:bg-purple-600 text-white rounded-full p-2 shadow-lg"
            >
                {isExpanded ? <ChevronRight /> : <ChevronLeft />}
            </Button>

            {/* Panel principal */}
            <motion.div
                initial={{ opacity: 0, x: 300 }}
                animate={{
                    opacity: 1,
                    x: 0,
                    width: isExpanded ? '100%' : 'auto'
                }}
                exit={{ opacity: 0, x: 300 }}
                className={`fixed right-0 top-0 lg:top-24 bg-black/40 backdrop-blur-lg shadow-xl border-l border-white/10 overflow-hidden
          ${isExpanded ? 'h-screen w-full' : 'lg:w-80 hidden lg:block'}
        `}
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
                    {/* Panel de Estadísticas */}
                    {stats && (
                        <div className="mb-6">
                            <h4 className="text-sm font-semibold text-white/80 mb-2 flex items-center gap-2">
                                <Trophy className="w-4 h-4" />
                                Resultados
                            </h4>
                            <div className="space-y-2">
                                {stats.map(({ player, isCorrect, predictionCount }) => (
                                    <motion.div
                                        key={player}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className={`p-2 rounded-lg ${isCorrect
                                                ? 'bg-green-500/20 border-green-500/30'
                                                : 'bg-white/5 border-white/10'
                                            } border`}
                                    >
                                        <div className="flex justify-between items-center">
                                            <span className="font-medium text-white">{player}</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-white/60">
                                                    {predictionCount} prediccion{predictionCount !== 1 ? 'es' : ''}
                                                </span>
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

                    {/* Predicciones en tiempo real */}
                    {songPlaying && (
                        <div>
                            <h4 className="text-sm font-semibold text-white/80 mb-2">
                                Predicciones en tiempo real
                            </h4>
                            <div className="space-y-4">
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
                            </div>
                        </div>
                    )}

                    {/* Mensaje cuando no hay predicciones */}
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