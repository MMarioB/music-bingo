import { useState, useCallback } from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { useSpotify } from '../../hooks/useSpotify';
import { ExternalLinkIcon, MusicIcon, CalendarIcon, MicIcon, RefreshCwIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import CategoryWheel from '../CategoryWheel';

const ARTISTS = {
  tradicional: [
    'Raphael', 'Julio Iglesias', 'Rocío Jurado', 'Isabel Pantoja', 'Camilo Sesto',
    'José Luis Perales', 'Manolo Escobar', 'Massiel', 'Miguel Ríos', 'Nuestro Small',
    'Lola Flores', 'Antonio Machín', 'Marifé de Triana', 'Juanito Valderrama',
    'Los Chunguitos', 'Paso Doble', 'Dúo Dinámico', 'Juan Pardo', 'Mari Trini',
    'Imanol', 'Los Diablos', 'Roberto Carlos', 'Sandro', 'Peret'
  ],
  rockEspanol: [
    'Joaquín Sabina', 'Alaska', 'Hombres G', 'Mecano', 'Los Rodriguez',
    'La Unión', 'Duncan Dhu', 'Radio Futura', 'Loquillo', 'Los Secretos',
    'Heroes del Silencio', 'Barricada', 'Tequila', 'Burning', 'Leño',
    'Triana', 'Más Birras', 'Eskorbuto', 'La Polla Records', 'Extremoduro',
    'Rosendo', 'Barón Rojo', 'Asfalto', 'Alerta Roja', 'Los Nikis'
  ],
  popNacional: [
    'Alejandro Sanz', 'David Bustamante', 'Chenoa', 'Rosa López', 'David Bisbal',
    'Operación Triunfo Artists', 'Melendi', 'Pablo Alborán', 'Beret', 'Antonio José',
    'Ana Torroja', 'Conchita', 'Marta Sánchez', 'Sergio Dalma', 'Miguel Bosé',
    'Juan Luis Guerra', 'Elsa Pataky', 'Emma García', 'Pastora Soler', 'Soraya',
    'David DeMaría', 'Tamara', 'Malú', 'Carlos Baute', 'Edurne'
  ],
  popRockIndie: [
    'La Oreja de Van Gogh', 'Amaral', 'Vetusta Morla', 'Izal', 'Sidecars',
    'León Benavente', 'Fito & Fitipaldis', 'Leiva', 'Dani Martín', 'Supersubmarina',
    'M Clan', 'Pereza', 'Luz Casal', 'La Casa Azul', 'Dorian',
    'Second', 'Depedro', 'Antonio Vega', 'Los Piratas', 'Jarabe de Palo'
  ],
  musicaUrbana: [
    'C. Tangana', 'Rosalía', 'Bad Bunny', 'Rauw Alejandro', 'Aitana',
    'Alfred García', 'Ana Guerra', 'Lola Índigo', 'Rels B', 'Cruje',
    'Daddy Yankee', 'J Balvin', 'Maluma', 'Ozuna', 'Nicky Jam'
  ],
  internacional: [
    'Queen', 'Michael Jackson', 'Madonna', 'The Beatles', 'Coldplay',
    'Bruno Mars', 'Taylor Swift', 'Ed Sheeran', 'Lady Gaga', 'The Weeknd',
    'Adele', 'Beyoncé', 'Rihanna', 'Justin Bieber', 'Katy Perry',
    'Ariana Grande', 'Drake', 'Post Malone', 'The Killers', 'Maroon 5'
  ]
};

const MUSIC_CATEGORIES = Object.keys(ARTISTS);

const GameMaster = () => {
  const { spotify, loggedIn, login } = useSpotify();
  const [currentCard, setCurrentCard] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [difficulty, setDifficulty] = useState('principiante');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [gameStep, setGameStep] = useState('wheel');

  const handleCategorySelected = useCallback((category) => {
    setSelectedCategory(category);
    setGameStep('card');
  }, []);

  const generateNewCard = useCallback(async () => {
    if (!loggedIn || !selectedCategory) return;

    setIsLoading(true);
    try {
      const randomMusicCategory = MUSIC_CATEGORIES[Math.floor(Math.random() * MUSIC_CATEGORIES.length)];
      const artistsInCategory = ARTISTS[randomMusicCategory];
      const randomArtist = artistsInCategory[Math.floor(Math.random() * artistsInCategory.length)];

      const response = await spotify.searchTracks(`artist:"${randomArtist}"`, {
        limit: 50,
        market: 'ES'
      });

      const tracks = response.tracks.items;
      const randomTrack = tracks[Math.floor(Math.random() * tracks.length)];
      const year = parseInt(randomTrack.album.release_date.split('-')[0]);

      const categoryInfo = {};
      switch (selectedCategory.name) {
        case 'Grupo o solista': {
          categoryInfo.respuesta = randomTrack.artists[0].name.includes('Los ') ||
            randomTrack.artists[0].name.includes('Las ') ?
            'Grupo' : 'Solista';
          break;
        }
        case '¿Anterior al 2000?': {
          categoryInfo.respuesta = year < 2000 ? 'Sí' : 'No';
          break;
        }
        case '4 años arriba o abajo': {
          categoryInfo.respuesta = `${year - 4} - ${year + 4}`;
          break;
        }
        case '2 años arriba o abajo': {
          categoryInfo.respuesta = `${year - 2} - ${year + 2}`;
          break;
        }
        case '3 años arriba o abajo': {
          categoryInfo.respuesta = `${year - 3} - ${year + 3}`;
          break;
        }
        case 'Década': {
          const decade = Math.floor(year / 10) * 10;
          categoryInfo.respuesta = `${decade}s`;
          break;
        }
        case 'Título de la canción': {
          categoryInfo.respuesta = randomTrack.name;
          break;
        }
        case 'Año exacto': {
          categoryInfo.respuesta = year.toString();
          break;
        }
        case 'Nombre del grupo o solista': {
          categoryInfo.respuesta = randomTrack.artists[0].name;
          break;
        }
      }

      setCurrentCard({
        title: randomTrack.name,
        artist: randomTrack.artists[0].name,
        year: year,
        spotifyUrl: randomTrack.external_urls.spotify,
        musicCategory: randomMusicCategory,
        gameCategory: selectedCategory,
        categoryInfo: categoryInfo,
        revealed: false
      });
    } catch (error) {
      console.error("Error generando tarjeta:", error);
      alert('No se pudo generar una tarjeta. Inténtalo de nuevo.');
    } finally {
      setIsLoading(false);
    }
  }, [loggedIn, spotify, selectedCategory]);

  const startOver = () => {
    setCurrentCard(null);
    setSelectedCategory(null);
    setGameStep('wheel');
  };

  if (!loggedIn) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-xl p-6 w-full max-w-md">
          <h1 className="text-3xl font-bold mb-6 text-center text-indigo-600">
            Music Bingo<br />Game Master
          </h1>
          <Button onClick={login} className="w-full py-4 text-lg font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-full">
            Conectar con Spotify
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 p-4">
      <div className="w-full max-w-4xl mx-auto bg-white/80 backdrop-blur-lg rounded-xl shadow-xl overflow-hidden">
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4">
          <h1 className="text-2xl md:text-3xl font-bold text-center text-white">
            Music Bingo
          </h1>
        </div>

        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <Select value={difficulty} onValueChange={(value) => {
                setDifficulty(value);
                startOver();
              }}>
                <SelectTrigger className="w-full bg-white/90">
                  <SelectValue placeholder="Nivel de juego" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="principiante">🟢 Principiante</SelectItem>
                  <SelectItem value="experto">🔥 Experto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {gameStep === 'card' && (
              <Button
                onClick={startOver}
                variant="outline"
                className="flex-shrink-0"
              >
                <RefreshCwIcon className="w-4 h-4 mr-2" />
                Nueva Categoría
              </Button>
            )}
          </div>

          <AnimatePresence mode="wait">
            {gameStep === 'wheel' ? (
              <motion.div
                key="wheel"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="py-4"
              >
                <CategoryWheel
                  difficulty={difficulty}
                  onCategorySelected={handleCategorySelected}
                />
              </motion.div>
            ) : (
              <motion.div
                key="card-section"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-4"
              >
                {selectedCategory && (
                  <div className={`${selectedCategory.color} p-4 rounded-lg flex items-center justify-center gap-3`}>
                    {selectedCategory.icon && (
                      <div className="flex items-center gap-2">
                        {(() => {
                          const Icon = selectedCategory.icon;
                          return <Icon {...selectedCategory.iconProps} />;
                        })()}
                        <span className="text-base font-medium text-gray-800">
                          {selectedCategory.name}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {!currentCard ? (
                  <Button
                    onClick={generateNewCard}
                    disabled={isLoading}
                    className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600"
                  >
                    {isLoading ? 'Generando...' : 'Generar Tarjeta'}
                  </Button>
                ) : (
                  <Card className="overflow-hidden border-purple-200 p-4">
                    <div className="space-y-3">
                      <div className={`transition-all duration-500 ${currentCard.revealed ? '' : 'blur-md'}`}>
                        <div className="text-center">
                          <h2 className="text-xl font-bold text-gray-800 mb-2">
                            {currentCard.title}
                          </h2>
                          <div className="flex justify-center items-center space-x-2 text-gray-600">
                            <MusicIcon className="w-4 h-4" />
                            <span className="text-base">{currentCard.artist}</span>
                          </div>
                        </div>

                        <div className="flex justify-between items-center bg-white/60 rounded-lg p-3 mt-3">
                          <div className="flex items-center space-x-2">
                            <CalendarIcon className="w-5 h-5 text-purple-600" />
                            <span className="text-2xl font-bold text-gray-800">
                              {currentCard.year}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <MicIcon className="w-5 h-5 text-indigo-600" />
                            <span className="text-sm text-gray-700">
                              {currentCard.musicCategory}
                            </span>
                          </div>
                        </div>

                        {currentCard.categoryInfo && (
                          <div className="bg-purple-50 rounded-lg p-3 mt-3">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-purple-700">
                                Respuesta para {selectedCategory.name}:
                              </span>
                              <span className="text-lg font-bold text-purple-900">
                                {currentCard.categoryInfo.respuesta}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      {currentCard.spotifyUrl && (
                        <Button
                          variant="outline"
                          className="w-full border-purple-400 text-purple-700"
                          onClick={() => {
                            window.open(currentCard.spotifyUrl, '_blank');
                            setCurrentCard({ ...currentCard, revealed: true });
                          }}
                        >
                          <ExternalLinkIcon className="mr-2 h-4 w-4" />
                          {currentCard.revealed ? 'Abrir en Spotify' : 'Revelar Canción'}
                        </Button>
                      )}

                      <Button
                        onClick={() => setCurrentCard(null)}
                        className="w-full bg-gradient-to-r from-purple-600 to-indigo-600"
                      >
                        Generar Nueva Tarjeta
                      </Button>
                    </div>
                  </Card>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default GameMaster;