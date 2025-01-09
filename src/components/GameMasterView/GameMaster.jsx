import { useState, useCallback } from 'react';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { useSpotify } from '../../hooks/useSpotify';
import { ExternalLinkIcon } from 'lucide-react';

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
   <div className="p-4 max-w-xl mx-auto pb-20">
     <h1 className="text-2xl font-bold text-center mb-8">Music Bingo</h1>
     
     <div className="mb-6">
       <Select value={difficulty} onValueChange={setDifficulty}>
         <SelectTrigger className="w-full">
           <SelectValue placeholder="Selecciona dificultad" />
         </SelectTrigger>
         <SelectContent>
           <SelectItem value="principiante">Principiante</SelectItem>
           <SelectItem value="experto">Experto</SelectItem>
         </SelectContent>
       </Select>
     </div>

     <Button 
       className="w-full py-6 text-lg mb-6"
       onClick={generateNewCard}
       disabled={isLoading}
     >
       {isLoading ? 'Generando...' : 'Nueva Tarjeta'}
     </Button>
     
     {currentCard && (
       <Card className="mb-6 overflow-hidden">
         <div className="flex flex-col h-[500px] bg-gradient-to-b from-purple-100 to-blue-100">
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
           
           <div className={`flex-1 flex items-center justify-center p-4 ${currentCard.gameCategory.color}`}>
             <div className="text-lg text-gray-800 flex items-center">
               <span className="mr-2">{currentCard.gameCategory.icon}</span>
               {currentCard.gameCategory.name}
             </div>
           </div>
           
           <div className="flex-1 flex items-center justify-center p-4 bg-gray-100">
             <div className="text-lg text-gray-700">
               Categoría Musical: {
                 {
                   tradicional: 'Música Tradicional',
                   rockEspanol: 'Rock Español',
                   popNacional: 'Pop Nacional',
                   popRockIndie: 'Pop-Rock/Indie',
                   musicaUrbana: 'Música Urbana',
                   internacional: 'Internacional'
                 }[currentCard.musicCategory]
               }
             </div>
           </div>
         </div>
       </Card>
     )}
     
     {currentCard && currentCard.spotifyUrl && (
       <a 
         href={currentCard.spotifyUrl} 
         target="_blank" 
         rel="noopener noreferrer"
         className="block w-full"
       >
         <Button 
           variant="outline"
           className="w-full py-6 text-lg"
         >
           <ExternalLinkIcon className="mr-2 h-5 w-5" />
           Abrir en Spotify
         </Button>
       </a>
     )}
   </div>
 );
};

export default GameMaster;