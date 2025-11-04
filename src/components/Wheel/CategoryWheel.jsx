import { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { motion } from 'framer-motion';
// Asegúrate de que este import sea correcto para tu estructura de proyecto
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

        // --- CÁLCULO DE ROTACIÓN BASADO EN LA REF (A PRUEBA DE FALLOS) ---
        const finalIndexInWheel = allCategories.findIndex(cat => cat.id === winner.id);
        const randomExtraSpins = 5 + Math.floor(Math.random() * 5);

        // Ángulo objetivo para que el centro del segmento ganador quede arriba.
        const targetAngle = 360 - (finalIndexInWheel * segmentAngle) - (segmentAngle / 2);

        // 1. Leemos el valor actual de la ref. Esta es la verdad absoluta de dónde está la ruleta.
        const currentRotation = rotationRef.current;
        
        // 2. Calculamos la nueva rotación.
        // Reseteamos la vuelta actual y sumamos las nuevas vueltas y el ángulo final.
        const newRotation = (currentRotation - (currentRotation % 360)) + (360 * randomExtraSpins) + targetAngle;
        
        // 3. Actualizamos la ref Y el estado para que la animación se dispare.
        rotationRef.current = newRotation;
        setRotationState(newRotation);
    };

    // La función de completar es ahora muy simple, como debe ser.
    const handleSpinComplete = () => {
        const winner = winnerRef.current;
        if (!winner) return;
        setIsSpinning(false);
        setFinalSelectedCategory(winner);
        setTimeout(() => onCategorySelected(winner), 1500);
    };

    // Reseteamos todo si cambia la dificultad.
    useEffect(() => {
        setExcludedIds([]);
        rotationRef.current = 0;
        setRotationState(0);
        setFinalSelectedCategory(null);
    }, [difficulty]);
    
    // El resto del código de renderizado es el mismo y ahora funcionará correctamente.
    // ...
    // --- RENDERIZADO (El JSX no necesita cambios) ---
    const generateWheelSegments = () => {
        return allCategories.map((category, index) => {
            const isSelectedResult = finalSelectedCategory && category.id === finalSelectedCategory.id;
            const isTemporarilyExcluded = excludedIds.includes(category.id) && !isSelectedResult;
            const Icon = category.icon;
            
            const startAngle = index * segmentAngle;
            const endAngle = startAngle + segmentAngle;
            const midAngle = startAngle + segmentAngle / 2;
            const radius = 0.85;
            const startX = Math.cos((startAngle - 90) * Math.PI / 180) * radius;
            const startY = Math.sin((startAngle - 90) * Math.PI / 180) * radius;
            const endX = Math.cos((endAngle - 90) * Math.PI / 180) * radius;
            const endY = Math.sin((endAngle - 90) * Math.PI / 180) * radius;
            const squarePosition = 0.55;
            const squareSize = 0.25;
            const textX = Math.cos((midAngle - 90) * Math.PI / 180) * squarePosition;
            const textY = Math.sin((midAngle - 90) * Math.PI / 180) * squarePosition;
            const pathData = `M 0 0 L ${startX} ${startY} A ${radius} ${radius} 0 0 1 ${endX} ${endY} Z`;

            return (
                <g key={category.id} className="transition-opacity duration-500" style={{ opacity: isTemporarilyExcluded ? 0.3 : 1 }}>
                    <path d={pathData} fill="transparent" stroke={category.neonColor} strokeWidth="0.005" className={`transition-opacity duration-300 ${isSelectedResult ? 'opacity-100' : 'opacity-60'}`} />
                    <g transform={`translate(${textX}, ${textY})`}>
                        <rect x={-squareSize / 2} y={-squareSize / 2} width={squareSize} height={squareSize} fill={category.wheelColor} stroke={category.neonColor} strokeWidth="0.005" rx="0.02" ry="0.02" className={`transition-all duration-300 ${isSelectedResult ? 'opacity-100' : 'opacity-70'}`} style={{ filter: isSelectedResult ? 'url(#neonGlow)' : 'none' }} />
                        <g transform={`translate(${-squareSize / 4}, ${-squareSize / 4}) scale(0.01)`} style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
                            <Icon size={48} {...category.iconProps} style={{ ...category.iconProps.style, strokeWidth: '2' }} />
                        </g>
                    </g>
                </g>
            );
        });
    };
    
    const isCycleComplete = excludedIds.length >= allCategories.length;
    
    return (
        <div className="flex flex-col items-center justify-center gap-4 w-full">
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

                {/* Ruleta animada */}
                <motion.div
                    className="w-full h-full"
                    animate={{ rotate: rotationState }}
                    transition={{ duration: 6, ease: "easeOut" }}
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
                        {generateWheelSegments()}
                        <circle cx="0" cy="0" r="0.15" fill="white" style={{ filter: 'url(#neonGlow)' }} />
                    </svg>
                </motion.div>
            </div>

            {/* Botón de girar */}
            <div className="w-full max-w-[350px]">
                <motion.button
                    onClick={spinWheel}
                    disabled={isSpinning}
                    className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-purple-600/90 to-pink-600/90 text-white font-bold border border-white/20 backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed group overflow-hidden relative"
                    style={{ boxShadow: '0 0 20px rgba(168,85,247,0.4)' }}
                    whileHover={{ scale: isSpinning ? 1 : 1.05 }}
                    whileTap={{ scale: isSpinning ? 1 : 0.95 }}
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-pink-400 opacity-0 group-hover:opacity-20 transition-opacity" />
                    <span className="relative z-10">
                        {isSpinning ? "Girando..." : (isCycleComplete ? "Reiniciar Ciclo" : "Girar Ruleta")}
                    </span>
                </motion.button>
            </div>

            {/* Categoría seleccionada */}
            {finalSelectedCategory && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`${finalSelectedCategory.color} px-4 py-2 rounded-lg text-center border border-white/20 max-w-[350px] w-full`}
                >
                    <h3 className="font-semibold text-gray-800 flex items-center justify-center gap-2">
                        <finalSelectedCategory.icon className="w-5 h-5" />
                        {finalSelectedCategory.name}
                    </h3>
                </motion.div>
            )}
        </div>
    );
};

CategoryWheel.propTypes = {
    difficulty: PropTypes.oneOf(['principiante', 'experto']),
    onCategorySelected: PropTypes.func
};

export default CategoryWheel;