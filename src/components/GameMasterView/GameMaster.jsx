import { useState, useCallback } from 'react';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { useSpotify } from '../../hooks/useSpotify';
import { ExternalLinkIcon } from 'lucide-react';

const GameMaster = () => {
 const { spotify, loggedIn, login } = useSpotify();
 
 const [currentCard, setCurrentCard] = useState(null);
 const [selectedGenre, setSelectedGenre] = useState('pop');
 const [isLoading, setIsLoading] = useState(false);

 const generateNewCard = useCallback(async () => {
   if (!loggedIn) return;

   setIsLoading(true);
   try {
     const response = await spotify.searchTracks(`genre:${selectedGenre}`, { 
       limit: 50,
       market: 'ES'
     });

     const tracks = response.tracks.items;
     const randomTrack = tracks[Math.floor(Math.random() * tracks.length)];

     setCurrentCard({
       title: randomTrack.name,
       artist: randomTrack.artists[0].name,
       year: randomTrack.album.release_date.split('-')[0],
       spotifyUrl: randomTrack.external_urls.spotify
     });

   } catch (error) {
     console.error("Error generando tarjeta:", error);
     alert('No se pudo generar una tarjeta. Inténtalo de nuevo.');
   } finally {
     setIsLoading(false);
   }
 }, [loggedIn, selectedGenre, spotify]);

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
     <h1 className="text-2xl font-bold text-center mb-8">Game Master Panel</h1>
     
     <div className="relative mb-6">
       <Select value={selectedGenre} onValueChange={setSelectedGenre}>
         <SelectTrigger className="w-full bg-white">
           <SelectValue placeholder="Selecciona un género" />
         </SelectTrigger>
         <SelectContent position="popper" sideOffset={5}>
           <SelectItem value="pop">Pop Internacional</SelectItem>
           <SelectItem value="rock">Rock</SelectItem>
           <SelectItem value="electronic">Electrónica</SelectItem>
           <SelectItem value="latino">Latino</SelectItem>
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