import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import confetti from 'canvas-confetti';
import { CATEGORIES_A, CATEGORIES_B } from './constants';

const CategoryWheel = ({ difficulty = 'principiante', onCategorySelected = () => {} }) => {
    // === ESTADOS Y REFERENCIAS ===
    const [isSpinning, setIsSpinning] = useState(false);
    const [finalSelectedCategory, setFinalSelectedCategory] = useState(null);
    const [excludedIds, setExcludedIds] = useState([]);

    const rotationRef = useRef(0);
    const winnerRef = useRef(null);
    const wheelRef = useRef(null);
    const timeoutRef = useRef(null);

    const allCategories = difficulty === 'principiante' ? CATEGORIES_A : CATEGORIES_B;
    const numCategories = allCategories.length;
    const segmentAngle = 360 / numCategories;

    // Limpiar timeouts al desmontar
    useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    // === FUNCIÓN DE COMPLETAR ===
    const handleSpinComplete = useCallback(() => {
        const winner = winnerRef.current;
        if (!winner) return;
        setIsSpinning(false);
        setFinalSelectedCategory(winner);

        // Confetti optimizado - una sola explosión
        const colors = [winner.neonColor, winner.wheelColor, '#FFFFFF'];
        confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
            colors: colors,
            ticks: 150,
            gravity: 1.2,
            scalar: 1.1,
            disableForReducedMotion: true
        });

        timeoutRef.current = setTimeout(() => onCategorySelected(winner), 1500);
    }, [onCategorySelected]);

    // === FUNCIÓN DE GIRO CON CSS TRANSFORM ===
    const spinWheel = useCallback(() => {
        if (isSpinning) return;

        let availableCategories = allCategories.filter(cat => !excludedIds.includes(cat.id));
        if (availableCategories.length === 0) {
            setExcludedIds([]);
            availableCategories = allCategories;
        }
        const winner = availableCategories[Math.floor(Math.random() * availableCategories.length)];
        winnerRef.current = winner;
        setExcludedIds(prev => [...prev.filter(id => allCategories.find(c => c.id === id)), winner.id]);

        setFinalSelectedCategory(null);
        setIsSpinning(true);

        const finalIndexInWheel = allCategories.findIndex(cat => cat.id === winner.id);
        const randomExtraSpins = 5 + Math.floor(Math.random() * 5);
        const segmentMidAngle = finalIndexInWheel * segmentAngle + (segmentAngle / 2);
        const targetAngleOffset = -segmentMidAngle;
        const currentRotation = rotationRef.current;
        const baseRotation = Math.floor(currentRotation / 360) * 360;
        const newRotation = baseRotation + (360 * randomExtraSpins) + 360 + targetAngleOffset;

        rotationRef.current = newRotation;

        // Aplicar rotación directamente via CSS transform (GPU-accelerated)
        if (wheelRef.current) {
            wheelRef.current.style.transition = 'transform 5s cubic-bezier(0.32, 0.72, 0.0, 1.0)';
            wheelRef.current.style.transform = `rotate(${newRotation}deg)`;
        }

        // Detectar fin de animación con timeout (más fiable que transitionend)
        timeoutRef.current = setTimeout(handleSpinComplete, 5050);
    }, [isSpinning, allCategories, excludedIds, segmentAngle, handleSpinComplete]);

    // Reset al cambiar dificultad
    useEffect(() => {
        setExcludedIds([]);
        rotationRef.current = 0;
        setFinalSelectedCategory(null);
        if (wheelRef.current) {
            wheelRef.current.style.transition = 'none';
            wheelRef.current.style.transform = 'rotate(0deg)';
        }
    }, [difficulty]);

    // Pre-calcular geometría de los segmentos (solo cambia con difficulty)
    const segmentGeometry = useMemo(() => {
        const radius = 0.85;
        const squarePosition = 0.55;
        const squareSize = 0.25;
        return allCategories.map((category, index) => {
            const startAngle = index * segmentAngle;
            const endAngle = startAngle + segmentAngle;
            const midAngle = startAngle + segmentAngle / 2;
            const startX = Math.cos((startAngle - 90) * Math.PI / 180) * radius;
            const startY = Math.sin((startAngle - 90) * Math.PI / 180) * radius;
            const endX = Math.cos((endAngle - 90) * Math.PI / 180) * radius;
            const endY = Math.sin((endAngle - 90) * Math.PI / 180) * radius;
            const textX = Math.cos((midAngle - 90) * Math.PI / 180) * squarePosition;
            const textY = Math.sin((midAngle - 90) * Math.PI / 180) * squarePosition;
            const pathData = `M 0 0 L ${startX} ${startY} A ${radius} ${radius} 0 0 1 ${endX} ${endY} Z`;
            return { pathData, textX, textY, squareSize };
        });
    }, [allCategories, segmentAngle]);

    // Memoizar segmentos SVG
    const wheelSegments = useMemo(() => {
        return allCategories.map((category, index) => {
            const isSelectedResult = finalSelectedCategory && category.id === finalSelectedCategory.id;
            const isTemporarilyExcluded = excludedIds.includes(category.id) && !isSelectedResult;
            const Icon = category.icon;
            const { pathData, textX, textY, squareSize } = segmentGeometry[index];

            return (
                <g key={category.id} className="transition-opacity duration-500" style={{ opacity: isTemporarilyExcluded ? 0.3 : 1 }}>
                    <path
                        d={pathData}
                        fill="transparent"
                        stroke={category.neonColor}
                        strokeWidth={isSelectedResult ? "0.008" : "0.005"}
                        className={`transition-all duration-300 ${isSelectedResult ? 'opacity-100' : 'opacity-60'}`}
                        style={{
                            filter: isSelectedResult ? 'drop-shadow(0 0 8px ' + category.neonColor + ')' : 'none'
                        }}
                    />
                    <g transform={`translate(${textX}, ${textY})`}>
                        <rect
                            x={-squareSize / 2}
                            y={-squareSize / 2}
                            width={squareSize}
                            height={squareSize}
                            fill={category.wheelColor}
                            stroke={category.neonColor}
                            strokeWidth={isSelectedResult ? "0.008" : "0.005"}
                            rx="0.02"
                            ry="0.02"
                            className={`transition-all duration-300 ${isSelectedResult ? 'opacity-100' : 'opacity-70'}`}
                            style={{
                                filter: isSelectedResult ? `url(#neonGlow) drop-shadow(0 0 10px ${category.neonColor})` : 'none',
                                transform: isSelectedResult ? 'scale(1.1)' : 'scale(1)',
                                transformOrigin: 'center',
                                transition: 'all 0.3s ease-out'
                            }}
                        />
                        <g
                            transform={`translate(${-squareSize / 4}, ${-squareSize / 4}) scale(${isSelectedResult ? 0.011 : 0.01})`}
                            style={{
                                transformBox: 'fill-box',
                                transformOrigin: 'center',
                                transition: 'all 0.3s ease-out'
                            }}
                        >
                            <Icon size={48} {...category.iconProps} style={{ ...category.iconProps.style, strokeWidth: '2' }} />
                        </g>
                    </g>
                </g>
            );
        });
    }, [allCategories, finalSelectedCategory, excludedIds, segmentGeometry]);

    const isCycleComplete = excludedIds.length >= allCategories.length;

    return (
        <div className="flex flex-col items-center gap-4 w-full overflow-x-hidden">
            {/* Indicador de progreso del ciclo */}
            <div className="flex items-center gap-3 bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-2 animate-fadeIn">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">Progreso:</span>
                    <span className="text-lg font-bold text-white">
                        {excludedIds.length}/{allCategories.length}
                    </span>
                </div>
                <div className="flex gap-1">
                    {allCategories.map((cat) => (
                        <div
                            key={cat.id}
                            className={`w-3 h-3 rounded-full transition-all duration-300 ${
                                excludedIds.includes(cat.id)
                                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 shadow-lg'
                                    : 'bg-white/30'
                            }`}
                            style={{
                                boxShadow: excludedIds.includes(cat.id) ? `0 0 8px ${cat.neonColor}` : 'none'
                            }}
                        />
                    ))}
                </div>
            </div>

            <div className="relative w-full max-w-[min(70vw,400px)] lg:max-w-full aspect-square mx-auto">
                {/* Indicador de la ruleta */}
                <div style={{
                    position: 'absolute',
                    top: '-4px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 0,
                    height: 0,
                    borderLeft: '12px solid transparent',
                    borderRight: '12px solid transparent',
                    borderTop: '20px solid white',
                    filter: 'drop-shadow(0 -2px 5px rgba(255,255,255,0.7))',
                    zIndex: 10
                }}/>

                {/* Ruleta con CSS transform (GPU-accelerated, sin Framer Motion) */}
                <div
                    ref={wheelRef}
                    className="w-full h-full will-change-transform"
                    style={{ transform: 'rotate(0deg)' }}
                >
                    <svg viewBox="-1.1 -1.1 2.2 2.2" className="w-full h-full">
                        <defs>
                            <filter id="neonGlow" x="-50%" y="-50%" width="200%" height="200%">
                                <feFlood result="floodBlur" floodOpacity="0.5" floodColor="white" />
                                <feComposite in="floodBlur" in2="SourceAlpha" operator="in" result="compositeBlur" />
                                <feGaussianBlur in="compositeBlur" stdDeviation="3" result="blur" />
                                <feMerge>
                                    <feMergeNode in="blur" />
                                    <feMergeNode in="blur" />
                                    <feMergeNode in="blur" />
                                    <feMergeNode in="SourceGraphic" />
                                </feMerge>
                            </filter>
                        </defs>
                        {wheelSegments}
                        <circle cx="0" cy="0" r="0.15" fill="white" style={{ filter: 'url(#neonGlow)' }} />
                    </svg>
                </div>
            </div>

            {/* Botón de girar con CSS animation (sin Framer Motion) */}
            <div className="w-full max-w-[350px]">
                <button
                    onClick={spinWheel}
                    disabled={isSpinning}
                    className={`w-full py-4 px-6 rounded-xl bg-gradient-to-r from-purple-600/90 to-pink-600/90 text-white font-bold text-lg border border-white/20 backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed group overflow-hidden relative transition-transform active:scale-95 hover:scale-105 ${
                        !isSpinning ? 'wheel-btn-pulse' : ''
                    }`}
                    style={{
                        boxShadow: isSpinning
                            ? '0 0 20px rgba(168,85,247,0.4)'
                            : '0 0 30px rgba(168,85,247,0.6), 0 0 60px rgba(236,72,153,0.4)'
                    }}
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-pink-400 opacity-0 group-hover:opacity-20 transition-opacity" />
                    <span className="relative z-10 flex items-center justify-center gap-2">
                        {isSpinning ? (
                            <>
                                <span className="inline-block animate-spin">🎰</span>
                                Girando...
                            </>
                        ) : (
                            <>
                                🎲 {isCycleComplete ? "Reiniciar Ciclo" : "Girar Ruleta"}
                            </>
                        )}
                    </span>
                </button>
            </div>

            {/* Categoría seleccionada con CSS transitions */}
            {finalSelectedCategory && (
                <div
                    className="px-6 py-4 rounded-xl text-center border-2 border-white/30 max-w-[350px] w-full shadow-2xl animate-popIn"
                    style={{
                        backgroundColor: finalSelectedCategory.wheelColor,
                        boxShadow: `0 0 30px ${finalSelectedCategory.neonColor}, 0 10px 40px rgba(0,0,0,0.3)`
                    }}
                >
                    <h3 className="font-bold text-xl text-gray-800 flex items-center justify-center gap-2 animate-pulse-subtle">
                        <finalSelectedCategory.icon className="w-6 h-6" />
                        {finalSelectedCategory.name}
                    </h3>
                </div>
            )}

            {/* CSS animations inline - evita dependencia de Framer Motion */}
            <style>{`
                @keyframes wheelBtnPulse {
                    0%, 100% {
                        box-shadow: 0 0 30px rgba(168,85,247,0.6), 0 0 60px rgba(236,72,153,0.4);
                    }
                    50% {
                        box-shadow: 0 0 40px rgba(168,85,247,0.8), 0 0 80px rgba(236,72,153,0.6);
                    }
                }
                .wheel-btn-pulse {
                    animation: wheelBtnPulse 2s ease-in-out infinite;
                }
                @keyframes popIn {
                    0% { opacity: 0; transform: scale(0.85) translateY(20px); }
                    60% { transform: scale(1.02) translateY(0); }
                    100% { opacity: 1; transform: scale(1) translateY(0); }
                }
                .animate-popIn {
                    animation: popIn 0.5s ease-out forwards;
                }
                @keyframes pulseSubtle {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.05); }
                }
                .animate-pulse-subtle {
                    animation: pulseSubtle 1.5s ease-in-out infinite;
                }
                .animate-fadeIn {
                    animation: fadeIn 0.3s ease-out forwards;
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

CategoryWheel.propTypes = {
    difficulty: PropTypes.oneOf(['principiante', 'experto']),
    onCategorySelected: PropTypes.func
};

export default React.memo(CategoryWheel);
