import { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { motion } from 'framer-motion';
import { CATEGORIES_A, CATEGORIES_B } from './constants';

const CategoryWheel = ({ difficulty = 'principiante', onCategorySelected = () => { } }) => {
    const [isSpinning, setIsSpinning] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const [finalSelectedCategory, setFinalSelectedCategory] = useState(null);

    const allCategories = difficulty === 'principiante' ? CATEGORIES_A : CATEGORIES_B;
    const [excludedCategory, setExcludedCategory] = useState(null);

    const finalIndexRef = useRef(-1);
    const animationStepRef = useRef(0); // Seguimiento de pasos de animación

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
        const segmentAngle = 360 / allCategories.length;
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
            const largeArcFlag = "0";
            const pathData = `M 0 0 L ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY} Z`;

            const isSelectedResult = category === finalSelectedCategory;
            const isHighlightedDuringSpin = index === highlightedIndex;
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
                            ${isSelectedResult ? 'opacity-100' : (isTemporarilyExcluded ? 'opacity-30' : (isHighlightedDuringSpin ? 'opacity-70' : 'opacity-50'))}
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
                                ${isSelectedResult ? 'opacity-100' : (isTemporarilyExcluded ? 'opacity-50' : (isHighlightedDuringSpin ? 'opacity-70' : 'opacity-60'))}
                            `}
                            style={{
                                filter: isSelectedResult ? 'url(#neonGlow)' : (isHighlightedDuringSpin ? 'url(#neonGlow)' : 'none')
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
                                    opacity: isTemporarilyExcluded ? 0.6 : (isHighlightedDuringSpin ? 0.9 : 1)
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

        // Comprobamos si solo queda una categoría válida posible ahora mismo.
        // Esto es importante para saber si el próximo giro debe resetear el `excludedCategory`.
        const isOnlyOneValidCategoryLeft = validCategoriesForThisSpin.length === 1;

        setIsSpinning(true);
        setFinalSelectedCategory(null);
        finalIndexRef.current = -1;
        animationStepRef.current = 0;

        const duration = 3500;
        const startTime = Date.now();
        const currentNumberOfSegments = allCategories.length; // Total de segmentos visibles.
        const randomSpins = Math.floor(Math.random() * (20 - 10 + 1)) + 10;
        const totalSteps = randomSpins * currentNumberOfSegments; // Total de "pasos de segmento" virtuales.

        // Determinar el índice de la categoría de destino final.
        let targetCategoryActualIndex = -1;
        if (validCategoriesForThisSpin.length > 0) {
            const randomIndexTargetInValidList = Math.floor(Math.random() * validCategoriesForThisSpin.length);
            targetCategoryActualIndex = allCategories.findIndex(cat => cat.id === validCategoriesForThisSpin[randomIndexTargetInValidList].id);
            finalIndexRef.current = targetCategoryActualIndex;
        } else {
            // Si no hay categorías válidas (esto es un caso de borde o error lógico anterior).
            // Forzamos el reset del `excludedCategory` y recalculamos.
            console.warn("No categories available for spin! Forcing reset.");
            setExcludedCategory(null); // Resetea la exclusión.
            // Volvemos a calcular las categorías válidas ahora que `excludedCategory` es null.
            const freshValidCategories = allCategories.filter(cat => !excludedCategory || cat.id !== excludedCategory.id); // excludedCategory es null aquí
            if (freshValidCategories.length > 0) {
                // Si ahora hay categorías, seleccionamos una al azar de nuevo.
                const randomIndexTargetInValidList = Math.floor(Math.random() * freshValidCategories.length);
                targetCategoryActualIndex = allCategories.findIndex(cat => cat.id === freshValidCategories[randomIndexTargetInValidList].id);
                finalIndexRef.current = targetCategoryActualIndex;

                // Si después del reset todavía no hay categorías (solo pasa si allCategories está vacío),
                // asignamos uno aleatorio del TOTAL de segmentos visibles.
            } else {
                finalIndexRef.current = Math.floor(Math.random() * currentNumberOfSegments);
            }
        }

        // Inicializar el `highlightedIndex` (el que se anima) con un valor aleatorio.
        setHighlightedIndex(Math.floor(Math.random() * currentNumberOfSegments));

        const animateSpin = () => {
            const currentTime = Date.now();
            const elapsedTime = currentTime - startTime;
            const progress = Math.min(elapsedTime / duration, 1); // Progreso general de la animación (0 a 1)
            animationStepRef.current = progress * totalSteps; // Actualizamos el progreso en pasos virtuales

            let animatedIndex;

            if (progress < 0.9) { // Fase de "giro rápido" (mayor parte de la animación)
                // Generar un índice de resaltado que parezca aleatorio, pero con una leve tendencia a acercarse al final.
                // Este es el punto más delicado para la sensación de *movimiento*.
                const randomOffset = Math.floor(Math.random() * allCategories.length);
                // El `finalIndexRef.current` se usa para "guiar" la animación de manera que al final, apunte al destino.
                // Sumamos `randomOffset` para la variabilidad inicial, y `currentStep` para simular el "avance".
                animatedIndex = (finalIndexRef.current + randomOffset + animationStepRef.current) % currentNumberOfSegments;

            } else { // Fase de "desaceleración" (últimos ~10% de la animación)
                // Convergencia hacia el destino `finalIndexRef.current`.
                // La idea es que a medida que `progress` aumenta, `animatedIndex` se acerca cada vez más a `finalIndexRef.current`.
                // Usamos la cantidad de pasos restantes para calcular la posición.
                const stepsRemaining = totalSteps - animationStepRef.current;
                animatedIndex = (finalIndexRef.current + stepsRemaining) % currentNumberOfSegments;

                // Asegurarse de que en el frame final, sea exactamente el índice destino.
                if (progress >= 0.99) {
                    animatedIndex = finalIndexRef.current;
                }
            }
            setHighlightedIndex(animatedIndex);

            if (progress < 1) {
                requestAnimationFrame(animateSpin);
            } else {
                // La animación ha terminado.
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

    // Calculamos las categorías válidas una vez por render para usar en el botón.
    const validCategoriesForThisSpin = allCategories.filter(
        category => !excludedCategory || category.id !== excludedCategory.id
    );

    // Deshabilitar el botón si isSpinning o si no hay categorías válidas para esta ronda.
    const isButtonDisabled = isSpinning || (allCategories.length > 0 && validCategoriesForThisSpin.length === 0);

    return (
        <div className="flex flex-col items-center justify-center gap-4">
            <div className="relative w-full max-w-[min(80vw,500px)] aspect-square mx-auto">
                <svg
                    viewBox="-1.1 -1.1 2.2 2.2"
                    className="w-full h-full"
                >
                    {createNeonFilter()}
                    {generateWheelSegments()}
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
                                initial={{ opacity: 0.8, scale: 1, x: '50%', y: '100%' }}
                                animate={{ opacity: 0, scale: 0, x: [null, `${50 + (i - 1) * 30}%`], y: '-100%' }}
                                transition={{ duration: 1, delay: i * 0.2, repeat: Infinity }}
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
                                animate={{ rotate: [0, -10, 10, -10, 10, 0] }}
                                transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1 }}
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