import { useState, useCallback } from 'react';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { useSpotify } from '../../hooks/useSpotify';
import { ExternalLinkIcon, MusicIcon, CalendarIcon, MicIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion'

const CATEGORIES_A = [
  { name: 'Grupo o solista', color: 'bg-green-200', icon: '🎸' },
  { name: '¿Anterior al 2000?', color: 'bg-pink-200', icon: '20' },
  { name: '4 años arriba o abajo', color: 'bg-yellow-200', icon: '4' },
  { name: 'Década', color: 'bg-purple-200', icon: '0s' },
  { name: '2 años arriba o abajo', color: 'bg-blue-200', icon: '2' }
];

const CATEGORIES_B = [
  { name: 'Título de la canción', color: 'bg-green-200', icon: '🎵' },
  { name: 'Año exacto', color: 'bg-pink-200', icon: '📅' },
  { name: 'Nombre del grupo o solista', color: 'bg-yellow-200', icon: '🎤' },
  { name: 'Década', color: 'bg-purple-200', icon: '0s' },
  { name: '3 años arriba o abajo', color: 'bg-blue-200', icon: '3' }
];

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
    'Second', 'Depedro', 'Antonio Vega', 'Los Piratas', 'Jarabe de Palo',
    'Carlos Tarque', 'Santa', 'Raimundo Amador', 'Los de Marras', 'Revólver'
  ],
  musicaUrbana: [
    'C. Tangana', 'Rosalía', 'Bad Bunny', 'Rauw Alejandro', 'Aitana', 
    'Alfred García', 'Ana Guerra', 'Lola Índigo', 'Rels B', 'Cruje',
    'Daddy Yankee', 'J Balvin', 'Maluma', 'Ozuna', 'Nicky Jam', 
    'De La Ghetto', 'Wisin', 'Yandel', 'Anuel AA', 'Farruko', 
    'Sech', 'Jhay Cortez', 'Myke Towers', 'Bryant Myers', 'Arcángel',
    'Don Omar', 'Tego Calderón', 'Zion y Lennox', 'Chencho Corleone', 'Justin Quiles'
  ],
  internacional: [
    'Queen', 'Michael Jackson', 'Madonna', 'The Beatles', 'Coldplay', 
    'Bruno Mars', 'Taylor Swift', 'Ed Sheeran', 'Lady Gaga', 'The Weeknd',
    'Adele', 'Beyoncé', 'Rihanna', 'Justin Bieber', 'Katy Perry',
    'Ariana Grande', 'Drake', 'Post Malone', 'The Killers', 'Maroon 5',
    'Dua Lipa', 'Billie Eilish', 'Harry Styles', 'Shawn Mendes', 
    'Imagine Dragons', 'Sam Smith', 'Daft Punk', 'David Guetta', 
    'Calvin Harris', 'Avicci', 'Martin Garrix', 'The Chainsmokers',
    'Bruno Mars', 'Pharrell Williams', 'John Legend', 'Justin Timberlake',
    'Pink', 'Shakira', 'Enrique Iglesias', 'Jennifer Lopez',
    'Ricky Martin', 'Pitbull', 'Jason Derulo', 'Charlie Puth', 'OneRepublic'
  ]
};

const CATEGORIES = Object.keys(ARTISTS);

const GameMaster = () => {
 const { spotify, loggedIn, login } = useSpotify();
 
 const [currentCard, setCurrentCard] = useState(null);
 const [isLoading, setIsLoading] = useState(false);
 const [difficulty, setDifficulty] = useState('principiante');

 const generateNewCard = useCallback(async () => {
   if (!loggedIn) return;

   setIsLoading(true);
   try {
     // Seleccionar categoría aleatoria de música
     const randomCategory = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
     
     // Seleccionar artista aleatorio de esa categoría
     const artistsInCategory = ARTISTS[randomCategory];
     const randomArtist = artistsInCategory[Math.floor(Math.random() * artistsInCategory.length)];

     // Buscar una canción del artista
     const response = await spotify.searchTracks(`artist:"${randomArtist}"`, { 
       limit: 50,
       market: 'ES'
     });

     const tracks = response.tracks.items;
     const randomTrack = tracks[Math.floor(Math.random() * tracks.length)];

     // Seleccionar categoría de juego según dificultad
     let randomGameCategory;
     if (difficulty === 'principiante') {
       randomGameCategory = CATEGORIES_A[Math.floor(Math.random() * CATEGORIES_A.length)];
     } else {
       randomGameCategory = CATEGORIES_B[Math.floor(Math.random() * CATEGORIES_B.length)];
     }

     setCurrentCard({
       title: randomTrack.name,
       artist: randomTrack.artists[0].name,
       year: randomTrack.album.release_date.split('-')[0],
       spotifyUrl: randomTrack.external_urls.spotify,
       musicCategory: randomCategory,
       gameCategory: randomGameCategory
     });

   } catch (error) {
     console.error("Error generando tarjeta:", error);
     alert('No se pudo generar una tarjeta. Inténtalo de nuevo.');
   } finally {
     setIsLoading(false);
   }
 }, [loggedIn, spotify, difficulty]);

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
  <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 flex flex-col items-center justify-center p-4">
    <div className="w-full max-w-xl bg-white/80 backdrop-blur-lg rounded-2xl shadow-2xl overflow-hidden">
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6">
        <h1 className="text-3xl font-bold text-center text-white drop-shadow-md">
          Music Bingo
        </h1>
      </div>

      <div className="p-6 space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            Selecciona dificultad
          </label>
          <Select value={difficulty} onValueChange={setDifficulty}>
            <SelectTrigger className="w-full bg-white border-purple-300">
              <SelectValue placeholder="Nivel de juego" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="principiante" className="hover:bg-purple-100">
                🟢 Principiante
              </SelectItem>
              <SelectItem value="experto" className="hover:bg-purple-100">
                🔥 Experto
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button 
          className="w-full py-6 text-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 transition-all duration-300"
          onClick={generateNewCard}
          disabled={isLoading}
        >
          {isLoading ? 'Generando...' : 'Nueva Tarjeta'}
        </Button>
        
        <AnimatePresence>
          {currentCard && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="overflow-hidden border-2 border-purple-200 shadow-lg">
                <div className="relative bg-gradient-to-br from-purple-100 to-indigo-100 p-6 space-y-4">
                  <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">
                      {currentCard.title}
                    </h2>
                    <div className="flex justify-center items-center space-x-2 text-gray-600">
                      <MusicIcon className="w-5 h-5" />
                      <span>{currentCard.artist}</span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center bg-white/60 rounded-lg p-4 shadow-inner">
                    <div className="flex items-center space-x-2">
                      <CalendarIcon className="w-6 h-6 text-purple-600" />
                      <span className="text-3xl font-bold text-gray-800">
                        {currentCard.year}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <MicIcon className="w-6 h-6 text-indigo-600" />
                      <span className="text-lg text-gray-700">
                        {
                          {
                            tradicional: 'Música Tradicional',
                            rockEspanol: 'Rock Español',
                            popNacional: 'Pop Nacional',
                            popRockIndie: 'Pop-Rock/Indie',
                            musicaUrbana: 'Música Urbana',
                            internacional: 'Internacional'
                          }[currentCard.musicCategory]
                        }
                      </span>
                    </div>
                  </div>

                  <div className={`flex items-center justify-center p-3 rounded-lg ${currentCard.gameCategory.color}`}>
                    <span className="mr-2 text-2xl">
                      {currentCard.gameCategory.icon}
                    </span>
                    <span className="font-semibold text-gray-800">
                      {currentCard.gameCategory.name}
                    </span>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
        
        {currentCard && currentCard.spotifyUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <a 
              href={currentCard.spotifyUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="block w-full"
            >
              <Button 
                variant="outline"
                className="w-full py-6 text-lg border-purple-400 text-purple-700 hover:bg-purple-50 transition-colors"
              >
                <ExternalLinkIcon className="mr-2 h-5 w-5" />
                Abrir en Spotify
              </Button>
            </a>
          </motion.div>
        )}
      </div>
    </div>
  </div>
);
};

export default GameMaster;