import React from 'react';
import { Card } from './ui/card';
import { Music, Calendar, User, Clock } from 'lucide-react';
import PropTypes from 'prop-types';

const SongHistory = ({ songs = [] }) => {
  if (songs.length === 0) {
    return null;
  }

  return (
    <Card className="bg-black/40 border-white/20 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="h-5 w-5 text-purple-400" />
        <h3 className="text-white font-semibold text-sm">Historial de Canciones</h3>
      </div>

      <div className="space-y-2 max-h-[300px] overflow-y-auto">
        {songs.map((song, index) => (
          <div
            key={`${song.title}-${index}`}
            className="bg-white/5 rounded-lg p-3 border border-white/10 hover:bg-white/10 transition-colors animate-slideInLeft"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2 mb-2">
                  <Music className="h-4 w-4 text-purple-400 flex-shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <h4 className="text-white font-medium text-sm truncate">
                      {song.title}
                    </h4>
                    <p className="text-purple-300 text-xs truncate flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {song.artist}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs text-white/60">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {song.year}
                  </div>
                  {song.musicCategory && (
                    <div className="px-2 py-0.5 bg-purple-500/20 rounded text-purple-300">
                      {song.musicCategory}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex-shrink-0 bg-purple-500/20 rounded-full w-6 h-6 flex items-center justify-center">
                <span className="text-purple-300 text-xs font-bold">
                  {songs.length - index}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {songs.length > 0 && (
        <div className="mt-3 pt-3 border-t border-white/10">
          <p className="text-white/40 text-xs text-center">
            {songs.length} {songs.length === 1 ? 'canción jugada' : 'canciones jugadas'}
          </p>
        </div>
      )}

      <style>{`
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-slideInLeft { animation: slideInLeft 0.3s ease-out forwards; }
      `}</style>
    </Card>
  );
};

SongHistory.propTypes = {
  songs: PropTypes.arrayOf(
    PropTypes.shape({
      title: PropTypes.string.isRequired,
      artist: PropTypes.string.isRequired,
      year: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      musicCategory: PropTypes.string,
    })
  ),
};

export default React.memo(SongHistory);
