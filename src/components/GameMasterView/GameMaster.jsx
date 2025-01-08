import { useState, useCallback } from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { useSpotify } from '../../hooks/useSpotify';

// Expanded list of artists for more comprehensive genre matching
const GENRE_ARTISTS = {
  latino: [
    'Bad Bunny', 'J Balvin', 'Daddy Yankee', 'Ozuna', 'Maluma', 
    'Wisin', 'Yandel', 'Don Omar', 'Anuel AA', 'Rauw Alejandro',
    'Karol G', 'Nicky Jam', 'Farruko', 'Sech', 'Myke Towers',
    'Lunay', 'Manuel Turizo', 'Bryant Myers', 'Arcángel', 'De La Ghetto',
    'Zion & Lennox', 'Plan B', 'Tego Calderón', 'Nio García', 'Casper Mágico',
    'Justin Quiles', 'Darell', 'Chencho Corleone', 'Jhay Cortez', 'Mora'
  ],
  rock: [
    'Coldplay', 'The Beatles', 'Queen', 'Radiohead', 'Arctic Monkeys',
    'Red Hot Chili Peppers', 'Green Day', 'Foo Fighters', 'Muse', 'Kings of Leon'
  ],
  pop: [
    'Taylor Swift', 'Ed Sheeran', 'Ariana Grande', 'Bruno Mars', 'Lady Gaga',
    'Justin Bieber', 'Dua Lipa', 'The Weeknd', 'Post Malone', 'Shawn Mendes'
  ],
  electronic: [
    'Daft Punk', 'Calvin Harris', 'David Guetta', 'Deadmau5', 'Zedd',
    'Martin Garrix', 'The Chainsmokers', 'Kygo', 'Marshmello', 'Avicii'
  ]
};

const getDeviceId = async (spotifyApi) => {
  try {
    const devices = await spotifyApi.getMyDevices();
    if (devices.body && devices.body.devices && devices.body.devices.length > 0) {
      return devices.body.devices[0].id;
    }
    throw new Error('No se encontró ningún dispositivo de Spotify conectado.');
  } catch (error) {
    console.error('Error obteniendo dispositivos de Spotify:', error);
    throw error;
  }
};

const GameMaster = () => {
  const { spotify, loggedIn, login } = useSpotify();
  const [currentCard, setCurrentCard] = useState(null);
  const [selectedGenre, setSelectedGenre] = useState('pop');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const generateNewCard = useCallback(async () => {
    if (!loggedIn) return;

    setIsLoading(true);
    try {
      // Create more flexible search queries
      const searchQueries = {
        latino: [
          'genre:reggaeton', 
          'genre:latin', 
          'tag:reggaeton', 
          ...GENRE_ARTISTS.latino.map(artist => `artist:"${artist}"`)
        ],
        rock: [
          'genre:rock', 
          ...GENRE_ARTISTS.rock.map(artist => `artist:"${artist}"`)
        ],
        pop: [
          'genre:pop', 
          'NOT genre:k-pop', 
          ...GENRE_ARTISTS.pop.map(artist => `artist:"${artist}"`)
        ],
        electronic: [
          'genre:edm', 
          'genre:dance', 
          'genre:electronic', 
          ...GENRE_ARTISTS.electronic.map(artist => `artist:"${artist}"`)
        ]
      };

      const queries = searchQueries[selectedGenre];
      
      // Try multiple search queries if the first fails
      let tracks = [];
      for (const query of queries) {
        const response = await spotify.searchTracks(query, { 
          limit: 50,
          market: 'ES'
        });

        if (response.tracks.items.length > 0) {
          tracks = response.tracks.items;
          break;
        }
      }

      if (tracks.length === 0) {
        console.warn(`No tracks found for genre: ${selectedGenre}. Falling back to generic search.`);
        // Fallback to a very generic search if all else fails
        const genericResponse = await spotify.searchTracks('year:2000-2024', { 
          limit: 50,
          market: 'ES'
        });
        tracks = genericResponse.tracks.items;
      }

      if (tracks.length === 0) {
        throw new Error("Unable to find any tracks");
      }

      // Randomly select a track
      const randomTrack = tracks[Math.floor(Math.random() * tracks.length)];

      setCurrentCard({
        title: randomTrack.name,
        year: randomTrack.album.release_date.split('-')[0],
        artist: randomTrack.artists[0].name,
        uri: randomTrack.uri
      });
    } catch (error) {
      console.error("Error generating new card:", error);
      alert('No se pudo generar una tarjeta. Por favor, inténtalo de nuevo.');
    } finally {
      setIsLoading(false);
    }
  }, [loggedIn, selectedGenre, spotify]);

  const togglePlay = async () => {
    if (!loggedIn || !currentCard) return;

    try {
      const deviceId = await getDeviceId(spotify);
      if (isPlaying) {
        await spotify.pause();
      } else {
        await spotify.play({
          uris: [currentCard.uri],
          device_id: deviceId
        });
      }
      setIsPlaying(!isPlaying);
    } catch (error) {
      console.error("Error controlando reproducción:", error);
      alert('No se pudo controlar la reproducción. Verifica tu conexión de Spotify y los permisos de la aplicación.');
    }
  };

  if (!loggedIn) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <h1 className="text-2xl font-bold mb-8">Music Bingo - Game Master</h1>
        <Button onClick={login} className="py-6 px-8 text-lg">
          Conectar con Spotify
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold text-center mb-8">Game Master Panel</h1>
      
      <div className="relative mb-6">
        <Select value={selectedGenre} onValueChange={setSelectedGenre}>
          <SelectTrigger className="w-full bg-white">
            <SelectValue placeholder="Selecciona un género" />
          </SelectTrigger>
          <SelectContent position="popper" sideOffset={5}>
            <SelectItem value="pop">Pop Internacional</SelectItem>
            <SelectItem value="rock">Rock</SelectItem>
            <SelectItem value="electronic">Electrónica/Dance</SelectItem>
            <SelectItem value="latino">Reggaeton</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {currentCard && (
        <Card className="mb-6 overflow-hidden">
          <div className="flex flex-col h-96 bg-gradient-to-b from-purple-100 to-blue-100">
            <div className="flex-1 flex items-center justify-center p-4 border-b">
              <h2 className="text-2xl font-bold text-center">
                {currentCard.title}
              </h2>
            </div>
            
            <div className="flex-1 flex items-center justify-center p-4 border-b bg-opacity-50 bg-white">
              <div className="text-4xl font-bold">
                {currentCard.year}
              </div>
            </div>
            
            <div className="flex-1 flex items-center justify-center p-4">
              <div className="text-xl font-semibold">
                {currentCard.artist}
              </div>
            </div>
          </div>
        </Card>
      )}

      <div className="space-y-4">
        <Button 
          className="w-full py-6 text-lg"
          onClick={generateNewCard}
          disabled={isLoading}
        >
          {isLoading ? 'Generando...' : 'Nueva Tarjeta'}
        </Button>
        
        <Button 
          variant="outline"
          className="w-full py-6 text-lg"
          onClick={togglePlay}
          disabled={!currentCard || isLoading}
        >
          {isPlaying ? 'Pausar' : 'Reproducir'} Música
        </Button>
      </div>
    </div>
  );
};

export default GameMaster;