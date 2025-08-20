import { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { motion } from 'framer-motion';
// Asegúrate de que este import sea correcto para tu estructura de proyecto
import { CATEGORIES_A, CATEGORIES_B } from './constants';

const CategoryWheel = ({ difficulty = 'principiante', onCategorySelected = () => {} }) => {
    const [isSpinning, setIsSpinning] = useState(false);
    const [rotation, setRotation] = useState(0);
    const [finalSelectedCategory, setFinalSelectedCategory] = useState(null);
    const [excludedIds, setExcludedIds] = useState([]); // Guardamos solo los IDs, es más limpio
    const winnerRef = useRef(null);

    const allCategories = difficulty === 'principiante' ? CATEGORIES_A : CATEGORIES_B;
    const numCategories = allCategories.length;
    const segmentAngle = 360 / numCategories;

    // === FUNCIÓN DE GIRO (LÓGICA COMPLETAMENTE REESTRUCTURADA) ===
    const spinWheel = () => {
        if (isSpinning) return;

        // 1. Determina las categorías disponibles basándose en el estado actual.
        let availableCategories = allCategories.filter(cat => !excludedIds.includes(cat.id));
        let idsToReset = [];

        // 2. Si no quedan, se resetea el ciclo.
        if (availableCategories.length === 0) {
            availableCategories = allCategories; // Todas disponibles de nuevo
            idsToReset = []; // Preparamos para limpiar la lista de exclusión
        }

        // 3. Elige un ganador AL AZAR de la lista correcta.
        const winningPickIndex = Math.floor(Math.random() * availableCategories.length);
        const winner = availableCategories[winningPickIndex];
        
        // 4. ¡LA CORRECCIÓN CLAVE! Actualizamos el estado de exclusión INMEDIATAMENTE.
        // Esto elimina por completo la condición de carrera.
        if (idsToReset !== undefined) {
             // Si estábamos reseteando, la nueva lista de excluidos es solo el ganador actual.
            setExcludedIds([winner.id]);
        } else {
            // Si no, añadimos el nuevo ganador a la lista existente.
            setExcludedIds(prev => [...prev, winner.id]);
        }
        
        // Guardamos el ganador en la ref para usarlo cuando la animación termine.
        winnerRef.current = winner;

        // Limpia el resultado anterior y activa el estado de giro.
        setFinalSelectedCategory(null);
        setIsSpinning(true);

        // --- Lógica de rotación (esta parte ya era correcta) ---
        const finalIndexInWheel = allCategories.findIndex(cat => cat.id === winner.id);
        const randomExtraSpins = 5 + Math.floor(Math.random() * 5);
        const targetAngle = 360 - (finalIndexInWheel * segmentAngle) - (segmentAngle / 2);
        const newRotation = (rotation - (rotation % 360)) + (360 * randomExtraSpins) + targetAngle;

        setRotation(newRotation);
    };

    // === FUNCIÓN AL TERMINAR LA ANIMACIÓN (AHORA MUY SIMPLE) ===
    const handleSpinComplete = () => {
        const winner = winnerRef.current;
        if (!winner) return;

        setIsSpinning(false);
        setFinalSelectedCategory(winner); // Muestra el resultado
        
        // Ya no necesita gestionar el estado de exclusión.
        // Su única misión es mostrar el resultado y llamar al callback.
        setTimeout(() => {
            onCategorySelected(winner);
        }, 1500);
    };
    
    // Un efecto para manejar el caso en que se cambia la dificultad, reseteamos el estado.
    useEffect(() => {
        setExcludedIds([]);
        setRotation(0);
        setFinalSelectedCategory(null);
    }, [difficulty]);


    // --- RENDERIZADO (El JSX no necesita cambios, pero ahora es más robusto) ---
    const generateWheelSegments = () => {
        return allCategories.map((category, index) => {
            const isSelectedResult = finalSelectedCategory && category.id === finalSelectedCategory.id;
            // La opacidad se basa en `excludedIds`, que ahora es 100% fiable.
            const isTemporarilyExcluded = excludedIds.includes(category.id) && !isSelectedResult;
            const Icon = category.icon;
            
            // ... (resto del código SVG para dibujar el segmento, es el mismo)
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
        <div className="flex flex-col items-center justify-center gap-4">
            <div className="relative w-full max-w-[min(80vw,500px)] aspect-square mx-auto">
                {/* Puntero */}
                <div style={{ position: 'absolute', top: '-4px', left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '15px solid transparent', borderRight: '15px solid transparent', borderTop: '25px solid white', filter: 'drop-shadow(0 -2px 5px rgba(255,255,255,0.7))', zIndex: 10 }}/>
                
                <motion.div
                    className="w-full h-full"
                    animate={{ rotate: rotation }}
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
                                    <feMergeNode in="blur" /><feMergeNode in="blur" /><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" />
                                </feMerge>
                            </filter>
                        </defs>
                        {generateWheelSegments()}
                        <circle cx="0" cy="0" r="0.15" fill="white" style={{ filter: 'url(#neonGlow)' }} />
                    </svg>
                </motion.div>
            </div>
            
            <div className="w-full max-w-[300px]">
                {/* Botón */}
                <motion.button
                    onClick={spinWheel}
                    disabled={isSpinning}
                    className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-purple-600/90 to-pink-600/90 text-white font-bold border border-white/20 backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed group overflow-hidden"
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
            
            {finalSelectedCategory && (
                // Resultado
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`${finalSelectedCategory.color} px-4 py-2 rounded-lg text-center border border-white/20 max-w-[300px] w-full`}
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