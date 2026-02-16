import React, { useRef, useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Play, Pause, Volume2, VolumeX, Music } from 'lucide-react';
import { Button } from './ui/button';

const AudioPlayer = ({ previewUrl, isPlaying: externalIsPlaying, onEnded, autoPlay = false, showControls = true }) => {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(30);
  const [isMuted, setIsMuted] = useState(false);
  const [hasError, setHasError] = useState(false);
  const animationRef = useRef(null);

  const updateProgress = useCallback(() => {
    if (audioRef.current) {
      const current = audioRef.current.currentTime;
      const total = audioRef.current.duration || 30;
      setProgress((current / total) * 100);
      setDuration(total);
    }
    animationRef.current = requestAnimationFrame(updateProgress);
  }, []);

  const play = useCallback(() => {
    if (audioRef.current && previewUrl) {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
        animationRef.current = requestAnimationFrame(updateProgress);
      }).catch(err => {
        console.error('Error playing audio:', err);
        setHasError(true);
      });
    }
  }, [previewUrl, updateProgress]);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.muted = !audioRef.current.muted;
      setIsMuted(!isMuted);
    }
  }, [isMuted]);

  // Respond to external play/pause control
  useEffect(() => {
    if (externalIsPlaying === true && !isPlaying) {
      play();
    } else if (externalIsPlaying === false && isPlaying) {
      pause();
    }
  }, [externalIsPlaying, isPlaying, play, pause]);

  // Auto-play when URL changes
  useEffect(() => {
    if (previewUrl && autoPlay) {
      // Small delay to let the audio element load
      const timer = setTimeout(() => play(), 300);
      return () => clearTimeout(timer);
    }
  }, [previewUrl, autoPlay, play]);

  // Cleanup on unmount or URL change
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    };
  }, [previewUrl]);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    setProgress(100);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    onEnded?.();
  }, [onEnded]);

  if (!previewUrl) {
    return (
      <div className="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
        <Music className="w-4 h-4 text-yellow-400 flex-shrink-0" />
        <span className="text-yellow-300 text-sm">
          Preview no disponible. Usa el boton de Spotify.
        </span>
      </div>
    );
  }

  const timeLeft = duration - (duration * progress / 100);

  return (
    <div className="bg-black/40 border border-white/20 rounded-lg p-3">
      <audio
        ref={audioRef}
        src={previewUrl}
        preload="auto"
        onEnded={handleEnded}
        onError={() => setHasError(true)}
      />

      {hasError ? (
        <div className="flex items-center gap-2 text-red-300 text-sm">
          <Music className="w-4 h-4" />
          <span>Error al cargar el audio. Usa el boton de Spotify.</span>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          {/* Play/Pause button */}
          {showControls && (
            <Button
              onClick={isPlaying ? pause : play}
              size="sm"
              className={`w-9 h-9 rounded-full flex-shrink-0 ${
                isPlaying
                  ? 'bg-purple-600 hover:bg-purple-700'
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4 ml-0.5" />
              )}
            </Button>
          )}

          {/* Waveform / progress bar */}
          <div className="flex-1 space-y-1">
            <div className="relative w-full h-8 flex items-end gap-[2px]">
              {Array.from({ length: 40 }).map((_, i) => {
                const barProgress = (i / 40) * 100;
                const isActive = barProgress <= progress;
                // Pseudo-random heights based on index for waveform look
                const height = 30 + Math.sin(i * 0.8) * 25 + Math.cos(i * 1.3) * 20;
                return (
                  <div
                    key={i}
                    className={`flex-1 rounded-sm transition-colors duration-150 ${
                      isActive
                        ? isPlaying ? 'bg-purple-400' : 'bg-purple-500/60'
                        : 'bg-white/15'
                    }`}
                    style={{
                      height: `${Math.max(15, Math.min(100, height))}%`,
                    }}
                  />
                );
              })}

              {/* Animated playing indicator */}
              {isPlaying && (
                <div
                  className="absolute top-0 bottom-0 w-[2px] bg-white/80 rounded-full"
                  style={{ left: `${progress}%`, transition: 'left 0.1s linear' }}
                />
              )}
            </div>

            {/* Time info */}
            <div className="flex justify-between text-[10px] text-white/40">
              <span>{Math.floor((duration * progress / 100))}s</span>
              <span>{Math.ceil(timeLeft)}s</span>
            </div>
          </div>

          {/* Mute toggle */}
          <button
            onClick={toggleMute}
            className="text-white/60 hover:text-white transition-colors flex-shrink-0"
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>
        </div>
      )}

      <style>{`
        @keyframes pulseBar {
          0%, 100% { transform: scaleY(1); }
          50% { transform: scaleY(1.3); }
        }
      `}</style>
    </div>
  );
};

AudioPlayer.propTypes = {
  previewUrl: PropTypes.string,
  isPlaying: PropTypes.bool,
  onEnded: PropTypes.func,
  autoPlay: PropTypes.bool,
  showControls: PropTypes.bool,
};

export default React.memo(AudioPlayer);
