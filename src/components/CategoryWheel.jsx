import { useState } from 'react';
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
    const [selectedCategory, setSelectedCategory] = useState(null);

    const categories = difficulty === 'principiante' ? CATEGORIES_A : CATEGORIES_B;

    const spinWheel = () => {
        if (isSpinning) return;

        setIsSpinning(true);
        
        // Animación de giro
        const spinDuration = 3000; // 3 segundos de giro
        const spinElement = document.querySelector('.wheel-svg');
        spinElement.style.transition = `transform ${spinDuration}ms cubic-bezier(0.25, 0.1, 0.25, 1)`;
        
        // Ángulo aleatorio entre 0 y 360 grados
        const randomRotation = Math.floor(Math.random() * 360);
        spinElement.style.transform = `rotate(${randomRotation}deg)`;

        // Seleccionar categoría basada en rotación
        const segmentAngle = 360 / categories.length;
        const normalizedRotation = (360 - randomRotation) % 360;
        const categoryIndex = Math.floor(normalizedRotation / segmentAngle);
        const finalCategory = categories[categoryIndex];

        setTimeout(() => {
            setSelectedCategory(finalCategory);
            setIsSpinning(false);
            onCategorySelected(finalCategory);
        }, spinDuration);
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
                    className="wheel-svg w-full h-full"
                    viewBox="0 0 200 200"
                    style={{ transition: 'transform 0.3s ease' }}
                >
                    {categories.map((category, index) => {
                        const startAngle = (index * 360) / categories.length;
                        const endAngle = ((index + 1) * 360) / categories.length;
                        
                        const x1 = 100 + 90 * Math.cos(startAngle * Math.PI / 180);
                        const y1 = 100 + 90 * Math.sin(startAngle * Math.PI / 180);
                        const x2 = 100 + 90 * Math.cos(endAngle * Math.PI / 180);
                        const y2 = 100 + 90 * Math.sin(endAngle * Math.PI / 180);

                        return (
                            <path
                                key={index}
                                d={`M 100 100 L ${x1} ${y1} A 90 90 0 0 1 ${x2} ${y2} Z`}
                                fill={category.color}
                                stroke="white"
                                strokeWidth="2"
                            />
                        );
                    })}
                    
                    {/* Iconos de categorías */}
                    {categories.map((category, index) => {
                        const angle = (index * 360) / categories.length + 360 / (categories.length * 2);
                        const x = 100 + 70 * Math.cos(angle * Math.PI / 180);
                        const y = 100 + 70 * Math.sin(angle * Math.PI / 180);

                        return (
                            <text
                                key={index}
                                x={x}
                                y={y}
                                textAnchor="middle"
                                dominantBaseline="middle"
                                fontSize="20"
                            >
                                {category.icon}
                            </text>
                        );
                    })}
                    
                    {/* Centro de la ruleta */}
                    <circle cx="100" cy="100" r="15" fill="white" />
                </svg>
            </div>

            <div className="mt-4">
                <Button
                    onClick={spinWheel}
                    disabled={isSpinning}
                    className="mt-4 px-8 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-full"
                >
                    {isSpinning ? "Girando..." : "Girar Ruleta"}
                </Button>
            </div>

            {selectedCategory && (
                <div className="mt-4 text-center">
                    <p className="text-xl font-bold">
                        Categoría seleccionada: {selectedCategory.name}
                    </p>
                </div>
            )}
        </div>
    );
};

CategoryWheel.propTypes = {
    difficulty: PropTypes.oneOf(['principiante', 'experto']),
    onCategorySelected: PropTypes.func
};

export default CategoryWheel;