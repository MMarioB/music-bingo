import { useState, useRef } from 'react'; // useEffect no es criticamente necesario aquí, pero ref sí.
import PropTypes from 'prop-types';
import { motion } from 'framer-motion';
import { CATEGORIES_A, CATEGORIES_B } from './constants';

const easeOutQuad = (t) => t * (2 - t);

const CategoryWheel = ({ difficulty = 'principiante', onCategorySelected = () => { } }) => {
    const [isSpinning, setIsSpinning] = useState(false);
    // `highlightedIndex` se refiere a qué segmento está siendo visualmente enfocado durante la animación.
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const [finalSelectedCategory, setFinalSelectedCategory] = useState(null);

    const allCategories = difficulty === 'principiante' ? CATEGORIES_A : CATEGORIES_B;
    // La categoría que fue seleccionada en la tirada ANTERIOR y que debe ser excluida de la PRÓXIMA tirada.
    const [excludedCategory, setExcludedCategory] = useState(null);

    // `finalIndexRef` almacenará el índice del resultado deseado dentro de `allCategories`.
    const finalIndexRef = useRef(-1);
    // `animationStepRef` rastrea el progreso de la animación en términos de segmentos pasados.
    const animationStepRef = useRef(0);

    const createNeonFilter = () => (
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
            <radialGradient id="segmentGradient">
                <stop offset="0%" stopColor="rgba(255,255,255,0.1)" />
                <stop offset="100%" stopColor="rgba(0,0,0,0)" />
            </radialGradient>
        </defs>
    );

    const generateWheelSegments = () => {
        const segmentAngle = 360 / allCategories.length; // Siempre usamos el total de categorías visibles.

        return allCategories.map((category, index) => {
            const startAngle = index * segmentAngle;
            const endAngle = startAngle + segmentAngle;
            const midAngle = startAngle + segmentAngle / 2; // Punto medio para el texto/icono
            const radius = 0.85;
            const startX = Math.cos((startAngle - 90) * Math.PI / 180) * radius;
            const startY = Math.sin((startAngle - 90) * Math.PI / 180) * radius;
            const endX = Math.cos((endAngle - 90) * Math.PI / 180) * radius;
            const endY = Math.sin((endAngle - 90) * Math.PI / 180) * radius;
            const squarePosition = 0.55;
            const squareSize = 0.25;
            const textX = Math.cos((midAngle - 90) * Math.PI / 180) * squarePosition;
            const textY = Math.sin((midAngle - 90) * Math.PI / 180) * squarePosition;
            const largeArcFlag = "0";
            const pathData = `M 0 0 L ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY} Z`;

            const isHighlighted = index === highlightedIndex;
            const isSelected = category === finalSelectedCategory;
            const isTemporarilyExcluded = excludedCategory && category.id === excludedCategory.id && category !== finalSelectedCategory;

            const Icon = category.icon;

            return (
                <g key={category.id} className="transition-all duration-300">
                    <path
                        d={pathData}
                        fill="transparent"
                        stroke={category.neonColor}
                        strokeWidth="0.005"
                        className={`transition-opacity duration-300
                            ${isHighlighted || isSelected ? 'opacity-100' : (isTemporarilyExcluded ? 'opacity-30' : 'opacity-60')}
                        `}
                    />
                    <g transform={`translate(${textX}, ${textY})`}>
                        <rect
                            x={-squareSize / 2}
                            y={-squareSize / 2}
                            width={squareSize}
                            height={squareSize}
                            fill={category.wheelColor}
                            stroke={category.neonColor}
                            strokeWidth="0.005"
                            rx="0.02"
                            ry="0.02"
                            className={`transition-all duration-300
                                ${isHighlighted || isSelected ? 'opacity-100' : (isTemporarilyExcluded ? 'opacity-50' : 'opacity-70')}
                            `}
                            style={{
                                filter: isHighlighted || isSelected ? 'url(#neonGlow)' : 'none'
                            }}
                        />
                        <g
                            transform={`translate(${-squareSize / 4}, ${-squareSize / 4}) scale(0.01)`}
                            style={{
                                transformBox: 'fill-box',
                                transformOrigin: 'center'
                            }}
                        >
                            <Icon
                                size={48}
                                {...category.iconProps}
                                style={{
                                    ...category.iconProps.style,
                                    strokeWidth: '2',
                                    opacity: isTemporarilyExcluded ? 0.6 : 1
                                }}
                            />
                        </g>
                    </g>
                </g>
            );
        });
    };

    const spinWheel = () => {
        if (isSpinning) return;

        const validCategoriesForThisSpin = allCategories.filter(
            category => !excludedCategory || category.id !== excludedCategory.id
        );

        const isOnlyOneValidCategoryLeft = validCategoriesForThisSpin.length === 1;

        setIsSpinning(true);
        setFinalSelectedCategory(null);
        finalIndexRef.current = -1; // Reiniciar el índice final deseado
        animationStepRef.current = 0; // Reiniciar el contador de pasos de animación

        const duration = 3500;
        const startTime = Date.now();
        const currentNumberOfSegments = allCategories.length; // La ruleta visible es siempre sobre el total de categorías.
        const randomSpins = Math.floor(Math.random() * (20 - 10 + 1)) + 10; // Número de vueltas completas.
        const totalSteps = randomSpins * currentNumberOfSegments; // Total de segmentos "virtuales" a pasar.

        // Determinar cuál categoría válida será el resultado final.
        let randomIndexTargetInValidList = Math.floor(Math.random() * validCategoriesForThisSpin.length);
        let targetCategoryActualIndex = -1;

        if (validCategoriesForThisSpin.length > 0) { // Solo si hay categorías válidas
             // Encontrar el índice de esa categoría válida dentro del array COMPLETO `allCategories`.
            targetCategoryActualIndex = allCategories.findIndex(cat => cat.id === validCategoriesForThisSpin[randomIndexTargetInValidList].id);
            finalIndexRef.current = targetCategoryActualIndex;
        } else {
            // Si no hay categorías válidas (esto no debería ocurrir si `allCategories` no está vacío),
            // hay un problema de lógica previa o el ciclo de reset no se aplicó.
            // Para este caso, asignamos un índice aleatorio del total de segmentos visibles.
            finalIndexRef.current = Math.floor(Math.random() * currentNumberOfSegments);
        }

        // Establecer un `highlightedIndex` inicial aleatorio para la animación.
        setHighlightedIndex(Math.floor(Math.random() * currentNumberOfSegments));

        const animateSpin = () => {
            const currentTime = Date.now();
            const elapsedTime = currentTime - startTime;
            const progress = Math.min(elapsedTime / duration, 1);

            const easingFactor = easeOutQuad(progress);
            // Calculamos el número de segmentos que se han pasado virtualmente.
            const currentStep = Math.floor(easingFactor * totalSteps);

            // Actualizamos el contador de pasos de animación
            animationStepRef.current = currentStep;

            // El `highlightedIndex` se calcula basándose en el `initialIndex` y los pasos avanzados.
            // El `initialIndex` es un punto de partida aleatorio para la animación.
            const animatedSegmentIndex = (finalIndexRef.current + currentStep) % currentNumberOfSegments; // Aquí ajustamos el índice de animación.

            setHighlightedIndex(animatedSegmentIndex);

            if (progress < 1) {
                requestAnimationFrame(animateSpin);
            } else {
                // La animación ha terminado. Establecemos la categoría final.
                const finalCategory = allCategories[finalIndexRef.current];
                setFinalSelectedCategory(finalCategory);

                // Lógica para excluir temporalmente la categoría que acaba de salir.
                if (isOnlyOneValidCategoryLeft) {
                    setExcludedCategory(null); // Resetea la exclusión si era la última

                } else {
                    setExcludedCategory(finalCategory); // Propaga la exclusión a la siguiente ronda
                }

                setIsSpinning(false);

                setTimeout(() => {
                    onCategorySelected(finalCategory);
                }, 2000);
            }
        };
        animateSpin();
    };

    const validCategoriesForThisSpin = allCategories.filter(
        category => !excludedCategory || category.id !== excludedCategory.id
    );

    const isButtonDisabled = isSpinning || (allCategories.length > 0 && validCategoriesForThisSpin.length === 0);

    return (
        <div className="flex flex-col items-center justify-center gap-4">
            <div className="relative w-full max-w-[min(80vw,500px)] aspect-square mx-auto">
                <svg
                    viewBox="-1.1 -1.1 2.2 2.2"
                    className="w-full h-full"
                >
                    {createNeonFilter()}
                    {generateWheelSegments()} {/* Siempre renderiza todos los segmentos */}
                    <circle
                        cx="0"
                        cy="0"
                        r="0.15"
                        fill="white"
                        style={{
                            filter: 'url(#neonGlow)'
                        }}
                    />
                </svg>
            </div>

            <div className="w-full max-w-[300px]">
                <motion.button
                    onClick={spinWheel}
                    disabled={isButtonDisabled}
                    className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-purple-600/90 to-pink-600/90 text-white font-bold border border-white/20 backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed group overflow-hidden"
                    style={{
                        boxShadow: '0 0 20px rgba(168,85,247,0.4)'
                    }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-pink-400 opacity-0 group-hover:opacity-20 transition-opacity" />
                    <div className="absolute inset-0 overflow-hidden">
                        {isSpinning && Array.from({ length: 3 }).map((_, i) => (
                            <motion.div
                                key={i}
                                initial={{
                                    opacity: 0.8,
                                    scale: 1,
                                    x: '50%',
                                    y: '100%'
                                }}
                                animate={{
                                    opacity: 0,
                                    scale: 0,
                                    x: [null, `${50 + (i - 1) * 30}%`],
                                    y: '-100%'
                                }}
                                transition={{
                                    duration: 1,
                                    delay: i * 0.2,
                                    repeat: Infinity
                                }}
                                className="absolute w-4 h-4 text-white"
                            >
                                ♪
                            </motion.div>
                        ))}
                    </div>
                    <div className="flex items-center justify-center gap-2 relative">
                        <span className="relative z-10">
                            {isSpinning ? "Girando..." : (validCategoriesForThisSpin.length === 0 ? "Ciclo completo" : "Girar Ruleta")}
                        </span>
                        {!isSpinning && validCategoriesForThisSpin.length > 0 && (
                            <motion.span
                                animate={{
                                    rotate: [0, -10, 10, -10, 10, 0]
                                }}
                                transition={{
                                    duration: 1.5,
                                    repeat: Infinity,
                                    repeatDelay: 1
                                }}
                            >
                                🎵
                            </motion.span>
                        )}
                    </div>
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