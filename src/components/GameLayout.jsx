import React from 'react';
import { Users } from 'lucide-react';
import PropTypes from 'prop-types';

// Estilos estáticos extraídos fuera del componente para evitar recreación
const gridStyle = {
    backgroundImage: `linear-gradient(to right, #ff00ee 1px, transparent 1px), linear-gradient(to bottom, #ff00ee 1px, transparent 1px)`,
    backgroundSize: '40px 40px',
    transform: 'perspective(500px) rotateX(60deg)',
    transformOrigin: 'bottom'
};
const titleStyle = {
    background: 'linear-gradient(to right, #ff00ee, #00ffff)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    textShadow: '0 2px 20px rgba(255,0,238,0.5)'
};
const subtitleStyle = { textShadow: '0 0 10px rgba(255,255,255,0.5)' };

const GameLayout = ({ children, roomCode, playersCount, showSelect, selectContent, maxWidth }) => {
    const mw = maxWidth || 'max-w-xl';
    return (
        <div className="min-h-screen bg-[#1a0133] flex flex-col relative overflow-hidden">
            {/* Fondo con cuadrícula */}
            <div className="absolute inset-0 opacity-10" style={gridStyle} />

            {/* Header mejorado */}
            <div className="w-full bg-gradient-to-b from-black/60 to-transparent backdrop-blur-sm">
                <div className={`${mw} mx-auto px-4 py-4 space-y-2`}>
                    {/* Título con mejor espaciado y diseño */}
                    <div className="text-center space-y-1">
                        <h1 className="text-4xl font-bold tracking-wider" style={titleStyle}>
                            DISCOHITS
                        </h1>
                        <h2 className="text-2xl font-bold text-white/90" style={subtitleStyle}>
                            Music Bingo
                        </h2>
                    </div>

                    {/* Info de sala/jugadores */}
                    <div className="flex justify-between items-center">
                        {showSelect ? (
                            <div className="flex-1 min-w-[200px]">
                                {selectContent}
                            </div>
                        ) : (
                            <div className="flex-1 min-w-[200px]">
                                <div className="text, text-purple-300">
                                    Jugador
                                </div>
                            </div>
                        )}

                        <div className="flex items-center gap-3 ml-4">
                            <div className="flex items-center gap-2 bg-black/30 px-3 py-1 rounded-full border border-white/20">
                                <Users className="w-4 h-4 text-purple-300" />
                                <span className="text-white">{playersCount}</span>
                            </div>
                            <div className="text-sm text-purple-300 font-mono">
                                {roomCode}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Contenido principal */}
            <div className="flex-1 flex flex-col p-4 overflow-y-auto overflow-x-hidden">
                <div className={`${mw} w-full mx-auto flex-1 flex flex-col`}>
                    {children}
                </div>
            </div>
        </div>
    );
};

GameLayout.propTypes = {
    children: PropTypes.node.isRequired,
    roomCode: PropTypes.string.isRequired,
    playersCount: PropTypes.number.isRequired,
    showSelect: PropTypes.bool,
    selectContent: PropTypes.node,
    maxWidth: PropTypes.string
};

GameLayout.defaultProps = {
    showSelect: false,
    selectContent: null,
    maxWidth: 'max-w-xl'
};

export default React.memo(GameLayout);