import { Users } from 'lucide-react';
import PropTypes from 'prop-types';

const GameLayout = ({ children, roomCode, playersCount, showSelect, selectContent }) => {
    return (
        <div className="min-h-screen bg-[#1a0133] flex flex-col relative overflow-hidden">
            {/* Fondo con cuadrícula */}
            <div
                className="absolute inset-0 opacity-10"
                style={{
                    backgroundImage: `
            linear-gradient(to right, #ff00ee 1px, transparent 1px),
            linear-gradient(to bottom, #ff00ee 1px, transparent 1px)
          `,
                    backgroundSize: '40px 40px',
                    transform: 'perspective(500px) rotateX(60deg)',
                    transformOrigin: 'bottom'
                }}
            />

            {/* Header compacto */}
            <div className="w-full bg-gradient-to-b from-black/60 to-transparent backdrop-blur-sm border-b border-white/10">
                <div className="max-w-xl mx-auto p-4">
                    <div className="flex items-center justify-between gap-4">
                        {/* Título compacto a la izquierda */}
                        <div className="flex items-center gap-4">
                            <h1 className="font-audiowide bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent text-sm tracking-wider">
                                DISCOHITS
                            </h1>
                            <div className="text-sm font-audiowide tracking-wide bg-black/20 px-3 py-1 rounded-full border border-white/10">
                                Sala: <span className="text-white/90">{roomCode}</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            {/* Select de dificultad si es necesario */}
                            {showSelect && (
                                <div className="w-40">
                                    {selectContent}
                                </div>
                            )}

                            {/* Contador de jugadores */}
                            <div className="flex items-center gap-2 bg-black/20 px-3 py-1 rounded-full border border-white/10">
                                <Users className="w-4 h-4 text-purple-300" />
                                <span className="text-white/90 text-sm">
                                    {playersCount}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Contenido principal */}
            <div className="flex-1 flex flex-col p-4">
                <div className="max-w-xl w-full mx-auto flex-1 flex flex-col">
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
    selectContent: PropTypes.node
};

GameLayout.defaultProps = {
    showSelect: false,
    selectContent: null
};

export default GameLayout;