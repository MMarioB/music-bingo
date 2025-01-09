import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from './ui/button';
import PropTypes from 'prop-types';

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

const getColorFromClass = (colorClass) => {
    const colorMap = {
        'bg-green-200': '#BBF7D0',
        'bg-pink-200': '#FBCFE8',
        'bg-yellow-200': '#FEF08A',
        'bg-purple-200': '#E9D5FF',
        'bg-blue-200': '#BFDBFE'
    };
    return colorMap[colorClass] || colorMap['bg-purple-200'];
};

const CategoryWheel = ({ difficulty = 'principiante', onCategorySelected = () => { } }) => {
    const [isSpinning, setIsSpinning] = useState(false);
    const [rotation, setRotation] = useState(0);

    const categories = difficulty === 'principiante' ? CATEGORIES_A : CATEGORIES_B;
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
        <div className="flex flex-col items-center justify-center p-4 md:p-6">
            <div className="relative w-64 h-64 md:w-96 md:h-96">
                {/* Marcador */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-4 z-20">
                    <div className="w-0 h-0 border-l-8 border-r-8 border-b-12 border-solid border-transparent border-b-purple-600"
                        style={{ transform: 'rotate(180deg)' }}></div>
                </div>

                {/* Contenedor de la ruleta */}
                <div className="absolute inset-0 rounded-full overflow-hidden border-4 border-purple-600 shadow-xl bg-white">
                    {/* Ruleta giratoria */}
                    <motion.div
                        className="w-full h-full relative"
                        style={{ transformOrigin: "center" }}
                        animate={{ rotate: rotation }}
                        transition={{
                            duration: 4,
                            ease: [0.2, 0.85, 0.3, 1],
                        }}
                    >
                        {categories.map((category, index) => {
                            const angle = segmentAngle * index;
                            const color = getColorFromClass(category.color);

                            return (
                                <div key={index} className="absolute top-0 left-0 w-full h-full">
                                    {/* Sector */}
                                    <div
                                        className="absolute top-0 left-1/2 w-1/2 h-1/2 origin-bottom-left"
                                        style={{
                                            background: color,
                                            transform: `rotate(${angle}deg)`,
                                            clipPath: `polygon(0 0, 100% 0, 100% 100%)`,
                                        }}
                                    />

                                    {/* Contenedor del texto */}
                                    <div
                                        className="absolute left-1/2 top-1/2"
                                        style={{
                                            transform: `rotate(${angle + segmentAngle / 2}deg)`,
                                            transformOrigin: 'left',
                                        }}
                                    >
                                    </div>
                                </div>
                            );
                        })}
                    </motion.div>
                </div>

                {/* Centro de la ruleta */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-6 h-6 md:w-8 md:h-8 bg-purple-600 rounded-full z-10 shadow-lg"></div>
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