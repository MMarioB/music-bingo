import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { CATEGORIES_A, CATEGORIES_B } from './constants';

const CategoryWheel = ({ difficulty = 'principiante', onCategorySelected = () => {} }) => {
    // === ESTADOS Y REFERENCIAS ===
    const [isSpinning, setIsSpinning] = useState(false);
    // El estado 'rotation' solo se usa para pasar el valor a framer-motion.
    const [rotationState, setRotationState] = useState(0); 
    const [finalSelectedCategory, setFinalSelectedCategory] = useState(null);
    const [excludedIds, setExcludedIds] = useState([]);
    
    // LA CLAVE DE LA SOLUCIÓN: Usamos una ref para guardar el ángulo de rotación real.
    // Esto evita problemas de timing con el estado de React.
    const rotationRef = useRef(0);
    const winnerRef = useRef(null);

    const allCategories = difficulty === 'principiante' ? CATEGORIES_A : CATEGORIES_B;
    const numCategories = allCategories.length;
    const segmentAngle = 360 / numCategories;

    // === FUNCIÓN DE GIRO (AHORA 100% FIABLE) ===
    const spinWheel = () => {
        if (isSpinning) return;

        // La lógica para elegir ganador y exclusión ya era correcta.
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

        // --- CÁLCULO DE ROTACIÓN CORREGIDO PARA SINCRONIZACIÓN PERFECTA ---
        const finalIndexInWheel = allCategories.findIndex(cat => cat.id === winner.id);
        const randomExtraSpins = 5 + Math.floor(Math.random() * 5);

        // Calcular el ángulo medio del segmento ganador
        // Los segmentos empiezan en index * segmentAngle
        const segmentMidAngle = finalIndexInWheel * segmentAngle + (segmentAngle / 2);

        // Para que el segmento quede arriba (0°), necesitamos rotar -segmentMidAngle
        // Esto alinea el centro del segmento con la flecha indicadora
        const targetAngleOffset = -segmentMidAngle;

        // 1. Leemos el valor actual de la ref
        const currentRotation = rotationRef.current;

        // 2. Calculamos la base (vueltas completas previas)
        const baseRotation = Math.floor(currentRotation / 360) * 360;

        // 3. Nueva rotación = base + vueltas extra + una vuelta completa + offset del segmento
        // Sumamos 360 adicional para asegurar que siempre gire hacia adelante
        const newRotation = baseRotation + (360 * randomExtraSpins) + 360 + targetAngleOffset;

        // 4. Actualizamos la ref Y el estado
        rotationRef.current = newRotation;
        setRotationState(newRotation);

        // Rotation calculated successfully
    };

    // 🎊 Función de confetti con los colores de la categoría ganadora
    const triggerConfetti = (category) => {
        const colors = [category.neonColor, category.wheelColor, '#FFFFFF'];

        // Explosión principal
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: colors,
            ticks: 200,
            gravity: 1.2,
            scalar: 1.2
        });

        // Explosión lateral izquierda
        setTimeout(() => {
            confetti({
                particleCount: 50,
                angle: 60,
                spread: 55,
                origin: { x: 0, y: 0.6 },
                colors: colors
            });
        }, 150);

        // Explosión lateral derecha
        setTimeout(() => {
            confetti({
                particleCount: 50,
                angle: 120,
                spread: 55,
                origin: { x: 1, y: 0.6 },
                colors: colors
            });
        }, 150);
    };

    // La función de completar con efectos mejorados
    const handleSpinComplete = () => {
        const winner = winnerRef.current;
        if (!winner) return;
        setIsSpinning(false);
        setFinalSelectedCategory(winner);

        // Confetti cuando se detiene
        triggerConfetti(winner);

        setTimeout(() => onCategorySelected(winner), 1500);
    };

    // Reseteamos todo si cambia la dificultad.
    useEffect(() => {
        setExcludedIds([]);
        rotationRef.current = 0;
        setRotationState(0);
        setFinalSelectedCategory(null);
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

    // Memoizar los segmentos SVG (solo recalcular cuando cambia selección o exclusiones)
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
        <div className="flex flex-col items-center justify-center gap-4 w-full">
            {/* 📊 Indicador de progreso del ciclo */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-2"
            >
                <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">Progreso:</span>
                    <span className="text-lg font-bold text-white">
                        {excludedIds.length}/{allCategories.length}
                    </span>
                </div>
                <div className="flex gap-1">
                    {allCategories.map((cat, idx) => (
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
            </motion.div>

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

                {/* Ruleta animada con efecto casino realista */}
                <motion.div
                    className="w-full h-full"
                    animate={{ rotate: rotationState }}
                    transition={{
                        duration: 5,
                        ease: [0.32, 0.72, 0.0, 1.0], // Bezier curve personalizada para efecto casino
                        type: "tween"
                    }}
                    onAnimationComplete={handleSpinComplete}
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
                </motion.div>
            </div>

            {/* Botón de girar mejorado con efecto pulso */}
            <div className="w-full max-w-[350px]">
                <motion.button
                    onClick={spinWheel}
                    disabled={isSpinning}
                    className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-purple-600/90 to-pink-600/90 text-white font-bold text-lg border border-white/20 backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed group overflow-hidden relative"
                    style={{
                        boxShadow: isSpinning
                            ? '0 0 20px rgba(168,85,247,0.4)'
                            : '0 0 30px rgba(168,85,247,0.6), 0 0 60px rgba(236,72,153,0.4)'
                    }}
                    animate={!isSpinning ? {
                        scale: [1, 1.02, 1],
                        boxShadow: [
                            '0 0 30px rgba(168,85,247,0.6), 0 0 60px rgba(236,72,153,0.4)',
                            '0 0 40px rgba(168,85,247,0.8), 0 0 80px rgba(236,72,153,0.6)',
                            '0 0 30px rgba(168,85,247,0.6), 0 0 60px rgba(236,72,153,0.4)'
                        ]
                    } : {}}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                    whileHover={{ scale: isSpinning ? 1 : 1.05 }}
                    whileTap={{ scale: isSpinning ? 1 : 0.95 }}
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-pink-400 opacity-0 group-hover:opacity-20 transition-opacity" />
                    <span className="relative z-10 flex items-center justify-center gap-2">
                        {isSpinning ? (
                            <>
                                <motion.span
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                >
                                    🎰
                                </motion.span>
                                Girando...
                            </>
                        ) : (
                            <>
                                🎲 {isCycleComplete ? "Reiniciar Ciclo" : "Girar Ruleta"}
                            </>
                        )}
                    </span>
                </motion.button>
            </div>

            {/* Categoría seleccionada con animación mejorada */}
            <AnimatePresence>
                {finalSelectedCategory && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8, y: 20 }}
                        animate={{
                            opacity: 1,
                            scale: [0.8, 1.1, 1],
                            y: 0
                        }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{
                            duration: 0.5,
                            scale: {
                                times: [0, 0.6, 1],
                                duration: 0.6
                            }
                        }}
                        className={`${finalSelectedCategory.color} px-6 py-4 rounded-xl text-center border-2 border-white/30 max-w-[350px] w-full shadow-2xl`}
                        style={{
                            boxShadow: `0 0 30px ${finalSelectedCategory.neonColor}, 0 10px 40px rgba(0,0,0,0.3)`
                        }}
                    >
                        <motion.h3
                            className="font-bold text-xl text-gray-800 flex items-center justify-center gap-2"
                            animate={{
                                scale: [1, 1.05, 1]
                            }}
                            transition={{
                                duration: 1.5,
                                repeat: Infinity,
                                ease: "easeInOut"
                            }}
                        >
                            <finalSelectedCategory.icon className="w-6 h-6" />
                            {finalSelectedCategory.name}
                        </motion.h3>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

CategoryWheel.propTypes = {
    difficulty: PropTypes.oneOf(['principiante', 'experto']),
    onCategorySelected: PropTypes.func
};

export default CategoryWheel;