import { useState } from 'react';
import { motion } from 'framer-motion';

// Define your categories here
const categories = [
    { name: 'Grupo o solista', color: '#BBF7D0', icon: '🎸' },
    { name: '¿Anterior al 2000?', color: '#FBCFE8', icon: '20' },
    { name: '4 años arriba o abajo', color: '#FEF08A', icon: '4' },
    { name: 'Década', color: '#E9D5FF', icon: '0s' },
    { name: '2 años arriba o abajo', color: '#BFDBFE', icon: '2' },
];

const Wheel = () => {
    const [rotation, setRotation] = useState(0);
    const [isSpinning, setIsSpinning] = useState(false);

    const spinWheel = () => {
        if (isSpinning) return;
        setIsSpinning(true);

        const spins = 5 + Math.random() * 5;
        const baseRotation = spins * 360;
        const categoryAngle = (Math.random() * categories.length) * (360 / categories.length);
        const finalRotation = rotation + baseRotation + categoryAngle;

        setRotation(finalRotation);

        setTimeout(() => {
            const normalizedRotation = finalRotation % 360;
            const categoryIndex = Math.floor((360 - normalizedRotation) / (360 / categories.length));
            const selectedCategory = categories[categoryIndex % categories.length];

            setIsSpinning(false);
            console.log('Selected category:', selectedCategory);
        }, 4000);
    };

    return (
        <div className="flex flex-col items-center justify-center h-screen">
            <div className="relative w-3/4 max-w-2xl h-3/4 max-h-2xl">
                {/* Wheel container */}
                <div className="absolute inset-0 rounded-full overflow-hidden border-4 border-purple-600 shadow-xl">
                    {/* Spinning wheel */}
                    <motion.div
                        className="w-full h-full relative"
                        style={{
                            transformOrigin: 'center',
                        }}
                        animate={{
                            rotate: rotation,
                        }}
                        transition={{
                            duration: 4,
                            ease: [0.2, 0.85, 0.3, 1],
                        }}
                    >
                        {categories.map((category, index) => (
                            <div
                                key={index}
                                className="absolute w-1/2 h-1/2 origin-bottom-right"
                                style={{
                                    top: '0',
                                    right: '50%',
                                    transform: `rotate(${index * (360 / categories.length)}deg) skewY(-${90 - 360 / categories.length}deg)`,
                                    backgroundColor: category.color,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '2rem',
                                    fontWeight: 'bold',
                                }}
                            >
                                {category.icon}
                            </div>
                        ))}
                    </motion.div>
                </div>

                {/* Wheel center */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-4 h-4 md:w-6 md:h-6 bg-purple-600 rounded-full z-10"></div>
                </div>
            </div>

            {/* Spin button */}
            <button
                onClick={spinWheel}
                disabled={isSpinning}
                className="mt-8 px-8 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold rounded-full transition-all duration-300 disabled:opacity-50"
            >
                {isSpinning ? 'Girando...' : 'Girar Ruleta'}
            </button>
        </div>
    );
};

export default Wheel;