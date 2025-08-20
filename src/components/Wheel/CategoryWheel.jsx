import { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { motion } from 'framer-motion';
// Asegúrate de que este import sea correcto para tu estructura de proyecto
import { CATEGORIES_A, CATEGORIES_B } from './constants';

const CategoryWheel = ({ difficulty = 'principiante', onCategorySelected = () => { } }) => {
    // === ESTADOS ===
    const [isSpinning, setIsSpinning] = useState(false);
    const [rotation, setRotation] = useState(0);
    const [finalSelectedCategory, setFinalSelectedCategory] = useState(null);
    // CAMBIO 1: Convertimos el estado de exclusión en un array para recordar todos los ganadores del ciclo.
    const [excludedCategories, setExcludedCategories] = useState([]);
    const winnerRef = useRef(null);

    // === LÓGICA DE LA RULETA ===
    const allCategories = difficulty === 'principiante' ? CATEGORIES_A : CATEGORIES_B;
    const numCategories = allCategories.length;
    const segmentAngle = 360 / numCategories;

    // === FUNCIÓN DE GIRO (LÓGICA CORREGIDA Y ROBUSTA) ===
    const spinWheel = () => {
        if (isSpinning) return;

        // 1. Filtra las categorías disponibles (todas menos las que ya salieron en este ciclo).
        let availableCategories = allCategories.filter(
            // Usamos .some() para comprobar si el id de la categoría está en nuestro array de exclusión.
            category => !excludedCategories.some(excluded => excluded.id === category.id)
        );

        // Si después de filtrar no queda ninguna, reseteamos el ciclo.
        if (availableCategories.length === 0) {
            setExcludedCategories([]); // Reseteamos el array de exclusión
            availableCategories = allCategories;
        }

        // 2. Elige un ganador AL AZAR de la lista de categorías DISPONIBLES.
        const winningPickIndex = Math.floor(Math.random() * availableCategories.length);
        const winningCategory = availableCategories[winningPickIndex];

        winnerRef.current = winningCategory; // Guardamos el ganador, esto sigue siendo clave.

        const finalIndexInWheel = allCategories.findIndex(cat => cat.id === winningCategory.id);

        setFinalSelectedCategory(null);
        setIsSpinning(true);

        // CAMBIO 2: Nueva fórmula de rotación a prueba de fallos.
        // Es más simple y no depende de cálculos complejos sobre la rotación anterior.

        // 1. Vueltas aleatorias adicionales para que el giro sea vistoso.
        const randomExtraSpins = 5 + Math.floor(Math.random() * 5); // Entre 5 y 9 vueltas extra.

        // 2. Ángulo objetivo para que el CENTRO del segmento ganador quede arriba.
        const targetAngle = 360 - (finalIndexInWheel * segmentAngle) - (segmentAngle / 2);

        // 3. Calculamos la nueva rotación.
        // Esto asegura que siempre gire hacia adelante y aterrice en la posición exacta.
        // `rotation - (rotation % 360)` resetea la vuelta actual a su inicio (ej: 750 -> 720)
        // para evitar errores de acumulación. Luego sumamos las vueltas nuevas y el ángulo final.
        const newRotation = (rotation - (rotation % 360)) + (360 * randomExtraSpins) + targetAngle;

        setRotation(newRotation);
    };

    // === FUNCIÓN QUE SE ACTIVA CUANDO TERMINA LA ANIMACIÓN ===
    const handleSpinComplete = () => {
        const winner = winnerRef.current;
        if (!winner) return;

        setIsSpinning(false);
        setFinalSelectedCategory(winner);

        // CAMBIO 3: Añadimos el ganador al array de exclusión.
        const newExcluded = [...excludedCategories, winner];

        // Si ya han salido todas las categorías, preparamos el reset para el próximo giro.
        // Si no, simplemente actualizamos la lista de excluidos.
        if (newExcluded.length >= allCategories.length) {
            setExcludedCategories([]); // El próximo giro empezará un nuevo ciclo.
        } else {
            setExcludedCategories(newExcluded);
        }

        setTimeout(() => {
            onCategorySelected(winner);
        }, 1500);
    };

    // --- RENDERIZADO (El JSX no necesita cambios) ---
    const createNeonFilter = () => (
        <defs>
            {/* ...código del filtro sin cambios... */}
            <filter id="neonGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feFlood result="floodBlur" floodOpacity="0.5" floodColor="white" />
                <feComposite in="floodBlur" in2="SourceAlpha" operator="in" result="compositeBlur" />
                <feGaussianBlur in="compositeBlur" stdDeviation="3" result="blur" />
                <feMerge>
                    <feMergeNode in="blur" /><feMergeNode in="blur" /><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" />
                </feMerge>
            </filter>
        </defs>
    );

    const generateWheelSegments = () => {
        return allCategories.map((category, index) => {
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

            const isSelectedResult = finalSelectedCategory && category.id === finalSelectedCategory.id;
            // Usamos el nuevo array para la opacidad
            const isTemporarilyExcluded = excludedCategories.some(excluded => excluded.id === category.id) && !isSelectedResult;
            const Icon = category.icon;

            return (
                <g key={category.id} className="transition-opacity duration-500" style={{ opacity: isTemporarilyExcluded ? 0.3 : 1 }}>
                    {/* ...resto del JSX del segmento sin cambios... */}
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

    const isCycleComplete = excludedCategories.length >= allCategories.length;

    return (
        <div className="flex flex-col items-center justify-center gap-4">
            <div className="relative w-full max-w-[min(80vw,500px)] aspect-square mx-auto">
                <div style={{ position: 'absolute', top: '-4px', left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '15px solid transparent', borderRight: '15px solid transparent', borderTop: '25px solid white', filter: 'drop-shadow(0 -2px 5px rgba(255,255,255,0.7))', zIndex: 10 }} />

                <motion.div
                    className="w-full h-full"
                    animate={{ rotate: rotation }}
                    transition={{ duration: 6, ease: "easeOut" }} // Aumenté un poco la duración para que el giro se vea más suave
                    onAnimationComplete={handleSpinComplete}
                >
                    <svg viewBox="-1.1 -1.1 2.2 2.2" className="w-full h-full">
                        {createNeonFilter()}
                        {generateWheelSegments()}
                        <circle cx="0" cy="0" r="0.15" fill="white" style={{ filter: 'url(#neonGlow)' }} />
                    </svg>
                </motion.div>
            </div>

            <div className="w-full max-w-[300px]">
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