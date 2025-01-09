import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import PropTypes from 'prop-types';

// Definimos las categorías aquí para que el componente sea autónomo
const CATEGORIES_A = [
    { name: 'Grupo o solista', color: 'bg-green-200', icon: '🎸' },
    { name: '¿Anterior al 2000?', color: 'bg-pink-200', icon: '20' },
    { name: '4 años arriba o abajo', color: 'bg-yellow-200', icon: '4' },
    { name: 'Década', color: 'bg-purple-200', icon: '0s' },
    { name: '2 años arriba o abajo', color: 'bg-blue-200', icon: '2' }
];

const CATEGORIES_B = [
    { name: 'Título de la canción', color: 'bg-green-200', icon: '🎵' },
    { name: 'Año exacto', color: 'bg-pink-200', icon: '📅' },
    { name: 'Nombre del grupo o solista', color: 'bg-yellow-200', icon: '🎤' },
    { name: 'Década', color: 'bg-purple-200', icon: '0s' },
    { name: '3 años arriba o abajo', color: 'bg-blue-200', icon: '3' }
];

const CategoryWheel = ({ difficulty = 'principiante', onCategorySelected = () => { } }) => {
    const [isSpinning, setIsSpinning] = useState(false);
    const [rotation, setRotation] = useState(0);

    // Seleccionar las categorías según la dificultad
    const categories = difficulty === 'principiante' ? CATEGORIES_A : CATEGORIES_B;

    const spinWheel = () => {
        if (isSpinning) return;

        setIsSpinning(true);

        // Calcular la rotación final
        const spins = 5 + Math.random() * 5; // Entre 5 y 10 vueltas completas
        const baseRotation = spins * 360;
        const categoryAngle = (Math.random() * categories.length) * (360 / categories.length);
        const finalRotation = rotation + baseRotation + categoryAngle;

        setRotation(finalRotation);

        // Determinar la categoría seleccionada después de la animación
        setTimeout(() => {
            const normalizedRotation = finalRotation % 360;
            const categoryIndex = Math.floor((360 - normalizedRotation) / (360 / categories.length));
            const selectedCategory = categories[categoryIndex % categories.length];

            setIsSpinning(false);
            onCategorySelected(selectedCategory);
        }, 4000); // Duración de la animación
    };

    return (
        <div className="flex flex-col items-center justify-center p-4 md:p-6">
            <div className="relative w-64 h-64 md:w-96 md:h-96">
                {/* Indicador/Flecha */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-4 z-10">
                    <div className="w-0 h-0 border-l-8 border-r-8 border-t-12 border-solid border-transparent border-t-purple-600"></div>
                </div>

                {/* Ruleta */}
                <motion.div
                    className="w-full h-full rounded-full relative overflow-hidden border-4 border-purple-600 shadow-xl"
                    style={{
                        transformOrigin: "center"
                    }}
                    animate={{
                        rotate: rotation
                    }}
                    transition={{
                        duration: 4,
                        ease: [0.2, 0.85, 0.3, 1],
                    }}
                >
                    {categories.map((category, index) => {
                        const segments = categories.length;
                        const angle = (360 / segments) * index;
                        const skewAngle = 90 - (360 / segments);

                        return (
                            <div
                                key={index}
                                className={`absolute w-full h-full ${category.color} border-r border-purple-200`}
                                style={{
                                    transform: `rotate(${angle}deg) skewY(-${skewAngle}deg)`,
                                    transformOrigin: "50% 50%",
                                }}
                            >
                                <div
                                    className="absolute left-1/2 top-4 -translate-x-1/2 whitespace-nowrap"
                                    style={{
                                        transform: `
                      rotate(${-angle - (180 - (360 / segments) / 2)}deg)
                      translateY(20px)
                    `,
                                    }}
                                >
                                    <div className="flex flex-col items-center gap-1">
                                        <span className="text-2xl">{category.icon}</span>
                                        <span className="text-xs font-medium text-center max-w-24 leading-tight">
                                            {category.name}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </motion.div>
            </div>

            <Button
                onClick={spinWheel}
                disabled={isSpinning}
                className="mt-6 px-8 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold rounded-full transition-all duration-300 disabled:opacity-50"
            >
                {isSpinning ? "Girando..." : "Girar Ruleta"}
            </Button>
        </div>
    );
};

CategoryWheel.propTypes = {
    difficulty: PropTypes.oneOf(['principiante', 'experto']),
    onCategorySelected: PropTypes.func
};

CategoryWheel.defaultProps = {
    difficulty: 'principiante',
    onCategorySelected: () => { }
};

export default CategoryWheel;