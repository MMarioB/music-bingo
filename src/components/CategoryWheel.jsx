import { useState } from 'react';
import { motion } from 'framer-motion';
import PropTypes from 'prop-types';
import { CATEGORIES_A, CATEGORIES_B } from './constants';

const CategoryWheel = ({ difficulty, onCategorySelected }) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);

  const categories = difficulty === 'experto' ? CATEGORIES_B : CATEGORIES_A;
  const numSlices = categories.length;
  const sliceAngle = 360 / numSlices;

  const handleSpin = () => {
    if (isSpinning) return;

    setIsSpinning(true);
    const spins = 8; // Número de vueltas completas
    const extraDegrees = Math.random() * 360; // Grados adicionales aleatorios
    const totalRotation = spins * 360 + extraDegrees;
    
    setRotation(prevRotation => prevRotation + totalRotation);

    // Calcular la categoría seleccionada
    setTimeout(() => {
      const finalAngle = extraDegrees;
      const selectedIndex = Math.floor(((360 - (finalAngle % 360)) % 360) / sliceAngle);
      onCategorySelected(categories[selectedIndex]);
      setIsSpinning(false);
    }, 3000);
  };

  return (
    <div className="flex flex-col items-center space-y-6">
      <div className="relative w-64 h-64">
        <motion.div
          animate={{ rotate: rotation }}
          transition={{ duration: 3, ease: "easeOut" }}
          className="absolute inset-0"
        >
          {categories.map((category, index) => {
            const Icon = category.icon;
            const angle = (index * sliceAngle);
            const sliceRotation = angle + sliceAngle / 2;
            
            return (
              <div
                key={category.name}
                className="absolute w-full h-full"
                style={{
                  transform: `rotate(${angle}deg)`,
                  transformOrigin: '50% 50%',
                }}
              >
                {/* Slice background */}
                <div
                  className={`absolute w-1/2 h-full origin-right ${category.color}`}
                  style={{
                    clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)',
                  }}
                />

                {/* Icon container */}
                <div
                  className="absolute flex items-center justify-center"
                  style={{
                    width: '32px',
                    height: '32px',
                    left: '50%',
                    top: '50%',
                    transform: `rotate(${sliceRotation}deg) translate(70px, -16px)`,
                  }}
                >
                  <Icon
                    size={24}
                    className="text-gray-700"
                    style={{
                      filter: 'drop-shadow(0 0 1px rgba(0,0,0,0.5))',
                      transform: `rotate(-${sliceRotation}deg)`,
                    }}
                  />
                </div>
              </div>
            );
          })}
          {/* Center circle */}
          <div className="absolute top-1/2 left-1/2 w-4 h-4 -mt-2 -ml-2 bg-white rounded-full shadow-md" />
        </motion.div>
      </div>

      <button
        onClick={handleSpin}
        disabled={isSpinning}
        className={`
          px-6 py-2 rounded-full text-white font-semibold
          transition-all duration-200
          ${isSpinning 
            ? 'bg-purple-400 cursor-not-allowed' 
            : 'bg-purple-600 hover:bg-purple-700 hover:shadow-lg'
          }
        `}
      >
        Girar Ruleta
      </button>
    </div>
  );
};

CategoryWheel.propTypes = {
  difficulty: PropTypes.oneOf(['principiante', 'experto']).isRequired,
  onCategorySelected: PropTypes.func.isRequired
};

export default CategoryWheel;