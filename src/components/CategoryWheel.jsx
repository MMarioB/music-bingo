import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from './ui/button';
import PropTypes from 'prop-types';

const CATEGORIES_A = [
    { name: 'Grupo o solista', color: '#4CAF50', icon: '🎸' },
    { name: '¿Anterior al 2000?', color: '#E91E63', icon: '20' },
    { name: '4 años arriba o abajo', color: '#FFC107', icon: '4' },
    { name: 'Década', color: '#9C27B0', icon: '0s' },
    { name: '2 años arriba o abajo', color: '#2196F3', icon: '2' }
];

const CATEGORIES_B = [
    { name: 'Título de la canción', color: '#4CAF50', icon: '🎵' },
    { name: 'Año exacto', color: '#E91E63', icon: '📅' },
    { name: 'Nombre del grupo o solista', color: '#FFC107', icon: '🎤' },
    { name: 'Década', color: '#9C27B0', icon: '0s' },
    { name: '3 años arriba o abajo', color: '#2196F3', icon: '3' }
];

const CategoryWheel = ({ difficulty = 'principiante', onCategorySelected = () => { } }) => {
    const [isSpinning, setIsSpinning] = useState(false);
    const [rotation, setRotation] = useState(0);

    const baseCategories = difficulty === 'principiante' ? CATEGORIES_A : CATEGORIES_B;
    // Duplicar las categorías para tener 10 secciones
    const categories = [...baseCategories, ...baseCategories];
    const segmentAngle = 360 / categories.length;

    const spinWheel = () => {
        if (isSpinning) return;

        setIsSpinning(true);

        const spins = 5 + Math.random() * 5;
        const baseRotation = spins * 360;
        const categoryAngle = (Math.random() * categories.length) * segmentAngle;
        const finalRotation = rotation + baseRotation + categoryAngle;

        setRotation(finalRotation);

        setTimeout(() => {
            const normalizedRotation = finalRotation % 360;
            const categoryIndex = Math.floor((360 - normalizedRotation) / segmentAngle);
            const selectedCategory = categories[categoryIndex % categories.length];

            setIsSpinning(false);
            onCategorySelected(selectedCategory);
        }, 4000);
    };

    return (
        <div className="flex flex-col items-center justify-center h-screen">
            <div className="relative w-3/4 max-w-2xl h-3/4 max-h-2xl">
                {/* Marcador */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-4 z-20">
                    <div className="w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-gray-800"></div>
                </div>

                {/* Contenedor de la ruleta */}
                <div className="absolute inset-0 rounded-full overflow-hidden shadow-xl">
                    {/* Ruleta giratoria */}
                    <motion.div
                        className="w-full h-full relative"
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
                            const angle = segmentAngle * index;
                            return (
                                <div
                                    key={index}
                                    className="absolute w-1/2 h-1/2 origin-bottom-right flex items-center justify-center"
                                    style={{
                                        top: '0',
                                        right: '50%',
                                        transform: `rotate(${angle}deg) skewY(-${90 - segmentAngle}deg)`,
                                        background: category.color,
                                    }}
                                >
                                    <span 
                                        className="absolute"
                                        style={{
                                            transform: `rotate(${-(angle + segmentAngle/2)}deg) translateY(-120%)`,
                                            color: 'white',
                                            textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
                                            fontSize: '1.2rem'
                                        }}
                                    >
                                        {category.icon}
                                    </span>
                                </div>
                            );
                        })}
                    </motion.div>
                </div>

                {/* Centro de la ruleta */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 bg-white rounded-full z-10 shadow-lg flex items-center justify-center">
                        <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                    </div>
                </div>
            </div>

            <Button
                onClick={spinWheel}
                disabled={isSpinning}
                className="mt-8 px-8 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold rounded-full transition-all duration-300 disabled:opacity-50"
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

export default CategoryWheel;