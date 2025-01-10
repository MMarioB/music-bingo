import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from './ui/button';
import PropTypes from 'prop-types';

const WHEEL_COLORS = {
    blue: '#BFDBFE',
    purple: '#E9D5FF',
    pink: '#FBCFE8',
    yellow: '#FEF08A',
    green: '#BBF7D0'
};

const CATEGORIES_A = [
    { name: 'Grupo o solista', color: WHEEL_COLORS.green, icon: '🎸' },
    { name: '¿Anterior al 2000?', color: WHEEL_COLORS.pink, icon: '20' },
    { name: '4 años arriba o abajo', color: WHEEL_COLORS.yellow, icon: '4' },
    { name: 'Década', color: WHEEL_COLORS.purple, icon: '0s' },
    { name: '2 años arriba o abajo', color: WHEEL_COLORS.blue, icon: '2' }
];

const CATEGORIES_B = [
    { name: 'Título de la canción', color: WHEEL_COLORS.green, icon: '🎵' },
    { name: 'Año exacto', color: WHEEL_COLORS.pink, icon: '📅' },
    { name: 'Nombre del grupo o solista', color: WHEEL_COLORS.yellow, icon: '🎤' },
    { name: 'Década', color: WHEEL_COLORS.purple, icon: '0s' },
    { name: '3 años arriba o abajo', color: WHEEL_COLORS.blue, icon: '3' }
];

const CategoryWheel = ({ difficulty = 'principiante', onCategorySelected = () => { } }) => {
    const [isSpinning, setIsSpinning] = useState(false);
    const [rotation, setRotation] = useState(0);

    const baseCategories = difficulty === 'principiante' ? CATEGORIES_A : CATEGORIES_B;
    const categories = [...baseCategories, ...baseCategories];
    const segmentAngle = 360 / categories.length;

    const spinWheel = () => {
        if (isSpinning) return;
    
        setIsSpinning(true);
        const spins = 5 + Math.random() * 5;
        const extraDegrees = Math.random() * 360;
        const totalRotation = spins * 360 + extraDegrees;
        
        setRotation(rotation + totalRotation);
    
        setTimeout(() => {
            const finalRotation = (rotation + totalRotation) % 360;
            const selectedIndex = Math.floor(finalRotation / segmentAngle);
            const adjustedIndex = (categories.length - selectedIndex) % categories.length;
            const selectedCategory = categories[adjustedIndex];
            
            // Para debug
            console.log({
                finalRotation,
                segmentAngle,
                selectedIndex,
                adjustedIndex,
                categoryName: selectedCategory.name
            });
    
            setIsSpinning(false);
            onCategorySelected(selectedCategory);
        }, 4000);
    };

    const generateWheelSegments = () => {
        return categories.map((category, index) => {
            const startAngle = index * segmentAngle;
            const endAngle = startAngle + segmentAngle;
            const midAngle = startAngle + (segmentAngle / 2);

            const startX = Math.cos((startAngle - 90) * Math.PI / 180);
            const startY = Math.sin((startAngle - 90) * Math.PI / 180);
            const endX = Math.cos((endAngle - 90) * Math.PI / 180);
            const endY = Math.sin((endAngle - 90) * Math.PI / 180);

            const textX = Math.cos((midAngle - 90) * Math.PI / 180) * 0.7;
            const textY = Math.sin((midAngle - 90) * Math.PI / 180) * 0.7;

            const largeArcFlag = segmentAngle <= 180 ? "0" : "1";

            const pathData = `M 0 0 
                            L ${startX} ${startY} 
                            A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY} 
                            Z`;

            return (
                <g key={index}>
                    <path
                        d={pathData}
                        fill={category.color}
                        stroke="white"
                        strokeWidth="0.01"
                    />
                    <text
                        x={textX}
                        y={textY}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="black"
                        fontSize="0.15"
                        transform={`rotate(${midAngle}, ${textX}, ${textY})`}
                    >
                        {category.icon}
                    </text>
                </g>
            );
        });
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
            <div className="relative w-full max-w-xl aspect-square">
                {/* Marcador */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-20">
                    <div className="w-0 h-0 border-l-4 border-r-4 border-t-8 border-transparent border-t-black"></div>
                </div>

                {/* SVG Ruleta */}
                <svg
                    viewBox="-1.1 -1.1 2.2 2.2"
                    className="w-full h-full"
                    style={{ transform: 'rotate(-90deg)' }}
                >
                    <motion.g
                        animate={{ rotate: rotation }}
                        transition={{
                            duration: 4,
                            ease: [0.2, 0.85, 0.3, 1],
                        }}
                        style={{ transformOrigin: 'center' }}
                    >
                        {generateWheelSegments()}
                    </motion.g>
                    {/* Centro de la ruleta */}
                    <circle r="0.15" fill="white" />
                </svg>
            </div>

            <Button
                onClick={spinWheel}
                disabled={isSpinning}
                className="mt-8 px-8 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-full"
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