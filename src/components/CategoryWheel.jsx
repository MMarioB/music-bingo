import { useState } from 'react';
import { Button } from './ui/button';
import PropTypes from 'prop-types';
import { CATEGORIES_A, CATEGORIES_B } from './constants';

const easeOutQuad = (t) => t * (2 - t);

const CategoryWheel = ({ difficulty = 'principiante', onCategorySelected = () => {} }) => {
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
            const Icon = category.icon;

            return (
                <g key={index}>
                    <path
                        d={pathData}
                        fill={category.wheelColor}
                        stroke="white"
                        strokeWidth="0.01"
                        className={`transition-opacity duration-300 ${
                            isHighlighted || isSelected ? 'opacity-100' : 'opacity-50'
                        }`}
                    />
                    <g transform={`translate(${textX}, ${textY})`}>
                        <g transform={`rotate(${midAngle})`}>
                            <g transform="scale(0.007)">
                                <Icon 
                                    {...category.iconProps}
                                    style={{
                                        ...category.iconProps.style,
                                        strokeWidth: '2.5'
                                    }}
                                />
                            </g>
                        </g>
                    </g>
                </g>
            );
        });
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-2">
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