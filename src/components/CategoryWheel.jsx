import { useState } from 'react';
import { Button } from './ui/button';
import PropTypes from 'prop-types';
import {
    Users,
    Clock,
    Target,
    Calendar,
    Music,
    Mic2,
} from 'lucide-react';

const WHEEL_COLORS = {
    blue: '#BFDBFE',
    purple: '#E9D5FF',
    pink: '#FBCFE8',
    yellow: '#FEF08A',
    green: '#BBF7D0'
};

// Componentes personalizados para números
const Number2Icon = (props) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
    >
        <path d="M8 4h8a4 4 0 0 1 4 4v4a4 4 0 0 1-4 4H8" />
        <path d="M8 16h12" />
    </svg>
);

const Number3Icon = (props) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
    >
        <path d="M8 4h8a4 4 0 0 1 4 4v8a4 4 0 0 1-4 4H8" />
        <path d="M8 12h8" />
    </svg>
);

const Number4Icon = (props) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
    >
        <path d="M16 4v16" />
        <path d="M4 12h12" />
        <path d="M4 4v8" />
    </svg>
);

const CATEGORIES_A = [
    { name: 'Grupo o solista', color: WHEEL_COLORS.green, Icon: Users },
    { name: '¿Anterior al 2000?', color: WHEEL_COLORS.pink, Icon: Clock },
    { name: '4 años arriba o abajo', color: WHEEL_COLORS.yellow, Icon: Number4Icon },
    { name: 'Década', color: WHEEL_COLORS.purple, Icon: Calendar },
    { name: '2 años arriba o abajo', color: WHEEL_COLORS.blue, Icon: Number2Icon }
];

const CATEGORIES_B = [
    { name: 'Título de la canción', color: WHEEL_COLORS.green, Icon: Music },
    { name: 'Año exacto', color: WHEEL_COLORS.pink, Icon: Target },
    { name: 'Nombre del grupo o solista', color: WHEEL_COLORS.yellow, Icon: Mic2 },
    { name: 'Década', color: WHEEL_COLORS.purple, Icon: Calendar },
    { name: '3 años arriba o abajo', color: WHEEL_COLORS.blue, Icon: Number3Icon }
];

const easeOutQuad = (t) => t * (2 - t);

const CategoryWheel = ({ difficulty = 'principiante', onCategorySelected = () => { } }) => {
    const [isSpinning, setIsSpinning] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const [finalSelectedCategory, setFinalSelectedCategory] = useState(null);

    const categories = difficulty === 'principiante' ? CATEGORIES_A : CATEGORIES_B;

    const spinWheel = () => {
        if (isSpinning) return;

        setIsSpinning(true);
        setFinalSelectedCategory(null);

        const duration = 3500;
        const startTime = Date.now();

        const totalSegments = categories.length;
        const randomSpins = Math.floor(Math.random() * (20 - 10 + 1)) + 10;
        const totalSteps = randomSpins * totalSegments;

        const initialIndex = Math.floor(Math.random() * totalSegments);
        setHighlightedIndex(initialIndex);

        const animateSpin = () => {
            const currentTime = Date.now();
            const elapsedTime = currentTime - startTime;
            const progress = Math.min(elapsedTime / duration, 1);

            const easedProgress = easeOutQuad(progress);
            const currentStep = Math.floor(easedProgress * totalSteps);
            const currentIndex = (initialIndex + currentStep) % totalSegments;

            setHighlightedIndex(currentIndex);

            if (progress < 1) {
                requestAnimationFrame(animateSpin);
            } else {
                const finalIndex = (initialIndex + totalSteps) % totalSegments;
                const finalCategory = categories[finalIndex];
                setFinalSelectedCategory(finalCategory);
                setIsSpinning(false);

                setTimeout(() => {
                    onCategorySelected(finalCategory);
                }, 2000);
            }
        };

        animateSpin();
    };

    const generateWheelSegments = () => {
        return categories.map((category, index) => {
            const startAngle = index * (360 / categories.length);
            const endAngle = startAngle + (360 / categories.length);
            const midAngle = startAngle + (180 / categories.length);

            const startX = Math.cos((startAngle - 90) * Math.PI / 180);
            const startY = Math.sin((startAngle - 90) * Math.PI / 180);
            const endX = Math.cos((endAngle - 90) * Math.PI / 180);
            const endY = Math.sin((endAngle - 90) * Math.PI / 180);

            const radius = 0.65;
            const textX = Math.cos((midAngle - 90) * Math.PI / 180) * radius;
            const textY = Math.sin((midAngle - 90) * Math.PI / 180) * radius;

            const largeArcFlag = "0";
            const pathData = `M 0 0 L ${startX} ${startY} A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY} Z`;

            const isHighlighted = index === highlightedIndex;
            const isSelected = category === finalSelectedCategory;
            const { Icon } = category;

            return (
                <g key={index}>
                    <path
                        d={pathData}
                        fill={category.color}
                        stroke="white"
                        strokeWidth="0.01"
                        className={`transition-opacity duration-300 ${isHighlighted || isSelected ? 'opacity-100' : 'opacity-50'
                            }`}
                    />
                    <g transform={`translate(${textX}, ${textY})`}>
                        <g transform={`rotate(${midAngle})`}>
                            <g transform="scale(0.006)">
                                <Icon
                                    size={24}
                                    strokeWidth={2}
                                    className="text-gray-800"
                                    absoluteStrokeWidth
                                />
                            </g>
                        </g>
                    </g>
                </g>
            );
        });
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
            <div className="relative w-full max-w-xl aspect-square">
                <svg
                    viewBox="-1.1 -1.1 2.2 2.2"
                    className="w-full h-full"
                >
                    {generateWheelSegments()}
                    <circle cx="0" cy="0" r="0.15" fill="white" />
                </svg>
            </div>

            <Button
                onClick={spinWheel}
                disabled={isSpinning}
                className="mt-8 px-8 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-full"
            >
                {isSpinning ? "Girando..." : "Girar Ruleta"}
            </Button>

            {finalSelectedCategory && (
                <div className="mt-4 text-center">
                    <p className="text-xl font-bold">
                        Categoría seleccionada: {finalSelectedCategory.name}
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