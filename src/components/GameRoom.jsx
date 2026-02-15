import React, { useState, useMemo, useCallback } from 'react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { Label } from '../components/ui/label';
import { Checkbox } from '../components/ui/checkbox';
import { AlertCircle, Users, CheckCircle, Crown, Loader2, Music } from 'lucide-react';
import PropTypes from 'prop-types';
import { useGameRoomLogic } from '../hooks/useGameRoomLogic';
import RoomQRCode from './RoomQRCode';
import { MUSIC_CATEGORIES } from './GameMasterView/constants';

// Estilos estáticos extraídos fuera del componente
const gridBgStyle = {
  backgroundImage: `linear-gradient(to right, #ff00ee 1px, transparent 1px), linear-gradient(to bottom, #ff00ee 1px, transparent 1px)`,
  backgroundSize: '40px 40px',
  transform: 'perspective(500px) rotateX(60deg)',
  transformOrigin: 'bottom'
};
const readyBtnStyle = { boxShadow: '0 0 15px rgba(0,255,0,0.2)' };
const startBtnStyle = { boxShadow: '0 0 15px rgba(0,255,0,0.2)' };

const GameRoom = ({ roomCode, playerName, isHost, onStartGame }) => {
  const {
    players,
    difficulty,
    allPlayersReady,
    error,
    isConnected,
    handleSetReady,
    handleStartGame,
    handleDifficultyChange,
  } = useGameRoomLogic({ roomCode, playerName, isHost, onStartGame });

  const [isSettingReady, setIsSettingReady] = useState(false);
  const [selectedThemes, setSelectedThemes] = useState(
    MUSIC_CATEGORIES.reduce((acc, theme) => ({ ...acc, [theme]: true }), {})
  );

  const currentPlayer = useMemo(() => players.find(p => p.name === playerName || (p.isHost && isHost)), [players, playerName, isHost]);

  const onSetReadyClick = useCallback(async () => {
    setIsSettingReady(true);
    await handleSetReady();
  }, [handleSetReady]);

  const handleThemeToggle = useCallback((theme) => {
    setSelectedThemes(prev => ({
      ...prev,
      [theme]: !prev[theme]
    }));
  }, []);

  const handleStartClick = useCallback(() => {
    handleStartGame(selectedThemes);
  }, [handleStartGame, selectedThemes]);

  const isGameReadyToStart = allPlayersReady && players.length >= 2;

  if (!isConnected && !error) {
    return (
      <div className="min-h-screen bg-[#1a0133] flex items-center justify-center text-white">
        <Loader2 className="mr-2 h-6 w-6 animate-spin" />
        Conectando a la sala...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1a0133] flex flex-col items-center justify-center relative overflow-hidden p-4">
      <div className="absolute inset-0 opacity-10" style={gridBgStyle} />

      <div className="w-full max-w-md mx-auto animate-scaleIn">
        <div className="bg-black/40 backdrop-blur-lg rounded-xl p-4 mb-4 border border-white/10">
          <div className="flex justify-between items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">Music Bingo</h1>
              <div className="flex items-center gap-2">
                <span className="text-purple-300 text-sm">Sala:</span>
                <span className="text-white font-mono font-bold">{roomCode}</span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-2 text-white/80 bg-white/10 px-3 py-1 rounded-full border border-white/20"><Users className="w-4 h-4" /><span>{players.length}</span></div>
              {isHost && <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded-full border border-purple-400/30">Game Master</span>}
            </div>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-4 bg-red-500/10 border border-red-500/50"><AlertCircle className="h-4 w-4" /><AlertDescription className="text-white">{error}</AlertDescription></Alert>
        )}

        <div className="space-y-4">
          {!isHost && currentPlayer && !currentPlayer.ready && (
            <Button onClick={onSetReadyClick} disabled={isSettingReady} className="w-full h-12 bg-gradient-to-r from-green-500/60 to-emerald-500/60 hover:from-green-500/80 hover:to-emerald-500/80 border border-green-400" style={readyBtnStyle}>
              {isSettingReady ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Preparando...</> : '¡Estoy listo!'}
            </Button>
          )}

          {isHost && (
            <Card className="bg-black/40 border-white/20 p-4 space-y-4">
              <RadioGroup value={difficulty} onValueChange={handleDifficultyChange} className="grid grid-cols-2 gap-4 mb-4">
                <div className="flex items-center space-x-2"><RadioGroupItem value="principiante" id="principiante" className="border-green-400 text-green-400" /><Label htmlFor="principiante" className="text-green-400">Principiante</Label></div>
                <div className="flex items-center space-x-2"><RadioGroupItem value="experto" id="experto" className="border-purple-400 text-purple-400" /><Label htmlFor="experto" className="text-purple-400">Experto</Label></div>
              </RadioGroup>

              <div className="border-t border-white/10 pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Music className="w-4 h-4 text-purple-400" />
                  <h3 className="text-sm font-semibold text-white">Temas Musicales</h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {MUSIC_CATEGORIES.map((theme) => (
                    <div
                      key={theme}
                      className="flex items-center space-x-2 cursor-pointer"
                      onClick={() => handleThemeToggle(theme)}
                    >
                      <Checkbox
                        id={`theme-${theme}`}
                        checked={selectedThemes[theme]}
                        onCheckedChange={() => handleThemeToggle(theme)}
                      />
                      <label
                        htmlFor={`theme-${theme}`}
                        className="text-sm text-white/90 cursor-pointer select-none"
                      >
                        {theme === 'tradicional' && 'Tradicional'}
                        {theme === 'rockEspanol' && 'Rock Español'}
                        {theme === 'popNacional' && 'Pop Nacional'}
                        {theme === 'popRockIndie' && 'Pop/Rock/Indie'}
                        {theme === 'musicaUrbana' && 'Música Urbana'}
                        {theme === 'internacional' && 'Internacional'}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <Button
                onClick={handleStartClick}
                className={`w-full h-12 transition-all duration-300 ${isGameReadyToStart ? 'bg-gradient-to-r from-green-500/60 to-emerald-500/60 hover:from-green-500/80 hover:to-emerald-500/80 border border-green-400' : 'bg-gray-500/30 border border-gray-400 cursor-not-allowed'}`}
                style={isGameReadyToStart ? startBtnStyle : undefined}
                disabled={!isGameReadyToStart}
              >
                Comenzar Partida
              </Button>
              {!isGameReadyToStart && (<div className="text-sm text-center space-y-1"><p className="text-yellow-300">{players.length < 2 ? 'Se necesitan al menos 2 jugadores' : 'Esperando que todos estén listos'}</p></div>)}
            </Card>
          )}

          {isHost && (
            <RoomQRCode roomCode={roomCode} />
          )}

          <div className="bg-black/40 backdrop-blur-lg rounded-xl border border-white/10 overflow-hidden">
            <div className="flex items-center justify-between p-3 border-b border-white/10"><h3 className="font-medium text-white">Jugadores</h3><div className="flex items-center gap-2 text-white/60 text-sm">{players.length}/12</div></div>
            <div className="divide-y divide-white/10">
              {players.map((player) => (
                <div key={player.id} className="flex items-center justify-between p-3 animate-slideUp">
                  <div className="flex items-center gap-2">
                    {player.isHost ? <Crown className="w-4 h-4 text-yellow-400" /> : <div className={`w-2 h-2 rounded-full ${player.ready ? 'bg-green-400' : 'bg-gray-400'}`} />}
                    <span className="font-medium text-white">{player.name}{player.id === currentPlayer?.id && <span className="text-purple-400 ml-1">(Tú)</span>}</span>
                  </div>
                  {(player.ready || player.isHost) && <CheckCircle className="h-4 w-4 text-green-400" />}
                </div>
              ))}
              {players.length === 0 && <div className="p-4 text-center text-white/60">{!isConnected ? 'Conectando...' : 'Esperando jugadores...'}</div>}
            </div>
          </div>
        </div>
      </div>

      {/* CSS animations */}
      <style>{`
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-scaleIn { animation: scaleIn 0.5s ease-out forwards; }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slideUp { animation: slideUp 0.3s ease-out forwards; }
      `}</style>
    </div>
  );
};

GameRoom.propTypes = {
  roomCode: PropTypes.string.isRequired,
  playerName: PropTypes.string,
  isHost: PropTypes.bool.isRequired,
  onStartGame: PropTypes.func.isRequired
};

export default React.memo(GameRoom);
