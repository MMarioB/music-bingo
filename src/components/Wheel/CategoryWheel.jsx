import { useState } from 'react';
import PropTypes from 'prop-types';
import { motion, AnimatePresence } from 'framer-motion';
import { CATEGORIES_A, CATEGORIES_B } from './constants'; // Asegúrate de que tus constantes están aquí

// Componente principal de la ruleta
const CategoryWheel = ({ difficulty = 'principiante', onCategorySelected = () => { } }) => {
    // === ESTADOS ===
    const [isSpinning, setIsSpinning] = useState(false);
    const [finalSelectedCategory, setFinalSelectedCategory] = useState(null);
    const [excludedCategory, setExcludedCategory] = useState(null); // La categoría que NO puede salir en el siguiente tiro
    const [rotation, setRotation] = useState(0); // El ángulo de rotación de la ruleta

    // Selecciona las categorías según la dificultad
    const allCategories = difficulty === 'principiante' ? CATEGORIES_A : CATEGORIES_B;
    const numCategories = allCategories.length;
    const segmentAngle = 360 / numCategories;

    // === FUNCIÓN DE GIRO (LA LÓGICA CLAVE) ===
    const spinWheel = () => {
        if (isSpinning) return;

        // 1. Filtra las categorías disponibles (todas menos la excluida)
        let availableCategories = allCategories.filter(
            category => !excludedCategory || category.id !== excludedCategory.id
        );

        // Si después de filtrar no queda ninguna (porque ya han salido todas menos una),
        // se resetea la exclusión para la siguiente ronda y se usan todas las categorías de nuevo.
        if (availableCategories.length === 0) {
            setExcludedCategory(null); // Reseteamos la exclusión
            availableCategories = allCategories; // Volvemos a tener todas disponibles
        }

        setIsSpinning(true);
        setFinalSelectedCategory(null);

        // 2. Elige una categoría ganadora al azar de las DISPONIBLES
        const randomIndexInAvailable = Math.floor(Math.random() * availableCategories.length);
        const winningCategory = availableCategories[randomIndexInAvailable];

        // 3. Encuentra el índice de la categoría ganadora en el array ORIGINAL (para el cálculo del ángulo)
        const finalIndex = allCategories.findIndex(cat => cat.id === winningCategory.id);

        // 4. Calcula el ángulo de rotación final
        // Le sumamos varias vueltas completas para que el giro sea vistoso
        const randomSpins = 5 + Math.floor(Math.random() * 5); // Entre 5 y 10 vueltas
        const targetAngle = finalIndex * segmentAngle;

        // El ángulo final alinea el CENTRO del segmento ganador con el puntero de arriba (a -90 grados)
        const finalRotation = rotation - (rotation % 360) + (360 * randomSpins) - targetAngle - (segmentAngle / 2);

        setRotation(finalRotation);

        // La lógica del final del giro se mueve a `onAnimationComplete`
    };

    // === FUNCIÓN QUE SE EJECUTA CUANDO LA ANIMACIÓN TERMINA ===
    const handleSpinComplete = () => {
        setIsSpinning(false);

        // Calcula cuál fue la categoría ganadora basándose en el ángulo final
        const normalizedRotation = (rotation % 360 + 360) % 360;
        const winningIndex = Math.floor((360 - normalizedRotation - segmentAngle / 2) / segmentAngle + numCategories) % numCategories;
        const finalCategory = allCategories[winningIndex];

        setFinalSelectedCategory(finalCategory);

        // **AQUÍ ESTÁ LA MAGIA**: Excluimos la categoría que acaba de salir para la próxima tirada
        setExcludedCategory(finalCategory);

        // Llamamos a la función del padre pasándole el resultado
        setTimeout(() => {
            onCategorySelected(finalCategory);
        }, 1500); // Un pequeño delay para que el usuario vea el resultado
    };


    // --- RENDERIZADO ---

    // Filtro SVG para el efecto Neón
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
        </defs>
    );

    // Dibuja los segmentos de la ruleta
    const generateWheelSegments = () => {
        return allCategories.map((category, index) => {
            const startAngle = index * segmentAngle;
            const endAngle = startAngle + segmentAngle;
            const midAngle = startAngle + segmentAngle / 2;

            const radius = 1; // Usamos un radio simple
            const startX = Math.cos((startAngle - 90) * Math.PI / 180) * radius;
            const startY = Math.sin((startAngle - 90) * Math.PI / 180) * radius;
            const endX = Math.cos((endAngle - 90) * Math.PI / 180) * radius;
            const endY = Math.sin((endAngle - 90) * Math.PI / 180) * radius;
            const pathData = `M 0 0 L ${startX} ${startY} A ${radius} ${radius} 0 0 1 ${endX} ${endY} Z`;

            const textRadius = 0.65;
            const textX = Math.cos((midAngle - 90) * Math.PI / 180) * textRadius;
            const textY = Math.sin((midAngle - 90) * Math.PI / 180) * textRadius;

            const Icon = category.icon;
            const isSelectedResult = finalSelectedCategory && category.id === finalSelectedCategory.id;
            const isExcluded = excludedCategory && category.id === excludedCategory.id;

            return (
                <g key={category.id}
                    className="transition-opacity duration-500"
                    style={{ opacity: isExcluded && !isSelectedResult ? 0.4 : 1 }}
                >
                    <path
                        d={pathData}
                        fill={category.wheelColor}
                        stroke={category.neonColor}
                        strokeWidth="0.01"
                        style={{ filter: isSelectedResult ? 'url(#neonGlow)' : 'none' }}
                    />
                    <g transform={`translate(${textX}, ${textY}) rotate(${midAngle})`}>
                        <Icon
                            size={40}
                            style={{
                                color: 'white',
                                transform: 'translate(-20px, -20px)', // Centrar el icono
                                filter: isSelectedResult ? 'drop-shadow(0 0 5px white)' : 'none'
                            }}
                        />
                    </g>
                </g>
            );
        });
    };

    return (
        <div className="flex flex-col items-center justify-center gap-6">
            <div className="relative w-full max-w-[min(80vw,500px)] aspect-square mx-auto">
                {/* Puntero que se queda fijo arriba */}
                <div
                    className="absolute top-[-10px] left-1/2 -translate-x-1/2 z-10"
                    style={{
                        width: 0, height: 0,
                        borderLeft: '15px solid transparent',
                        borderRight: '15px solid transparent',
                        borderTop: '25px solid white',
                        filter: 'drop-shadow(0 -2px 5px rgba(255,255,255,0.7))'
                    }}
                />

                {/* La ruleta que gira */}
                <motion.div
                    className="w-full h-full"
                    animate={{ rotate: rotation }}
                    transition={{
                        duration: 4, // Duración del giro
                        ease: "easeOut", // Desaceleración al final
                    }}
                    onAnimationComplete={handleSpinComplete}
                >
                    <svg viewBox="-1.1 -1.1 2.2 2.2" className="w-full h-full">
                        {createNeonFilter()}
                        {generateWheelSegments()}
                    </svg>
                </motion.div>
            </div>

            {/* Botón para girar */}
            <motion.button
                onClick={spinWheel}
                disabled={isSpinning}
                className="w-full max-w-[300px] py-3 px-6 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold border border-white/20 backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed"
                whileHover={{ scale: isSpinning ? 1 : 1.05 }}
                whileTap={{ scale: isSpinning ? 1 : 0.95 }}
            >
                {isSpinning ? "Girando..." : "Lanzar Ruleta"}
            </motion.button>

            {/* Muestra del resultado final */}
            <AnimatePresence>
                {finalSelectedCategory && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className={`text-xl font-bold p-4 rounded-lg flex items-center gap-3 ${finalSelectedCategory.color}`}
                    >
                        <finalSelectedCategory.icon />
                        <span>{finalSelectedCategory.name}</span>
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