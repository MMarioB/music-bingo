/* ---------------------------------------------------------------
   useGameMasterLogic.jsx
   Hook that contains the whole “Game Master” logic:
   – authentication with Spotify
   – socket‑io connection & event handling
   – creation of rooms, categories, cards
   – marking players, finishing / restarting games
   --------------------------------------------------------------- */
   import { useState, useCallback, useEffect, useRef } from 'react';
   import { useSpotify } from '../../hooks/useSpotify';
   // Asegúrate de que la ruta a socketService sea correcta
   // Si usas la actualizacion global, esta linea NO cambia, solo cambia el paquete
   import { gameSocket } from '../../services/socketService';
   import { ARTISTS } from './constants';
   
   /**
    * Helper that turns a socket.io callback‑ack into a Promise.
    * Allows us to write:  await emitWithAck('event', payload);
    *
    * NOTA IMPORTANTE: El método `.timeout()` está disponible en
    * versiones recientes de `socket.io-client`. Si este sigue produciendo
    * el error `TypeError: Qe.timeout is not a function`, asegúrate de
    * haber actualizado `socket.io-client` en tu `package.json` a la última versión.
    * Si el error persiste despues de actualizar, revisa el archivo
    * `../../services/socketService.js` para asegurarte de que exporta
    * una instancia correcta del cliente Socket.IO.
    */
   const emitWithAck = (event, payload) =>
     new Promise((resolve, reject) => {
       // Aquí es donde ocurre el error si gameSocket no tiene el método timeout()
       if (!gameSocket || typeof gameSocket.timeout !== 'function') {
         // Si confirmamos que el problema es la versión o configuración,
         // podríamos añadir un fallback, pero NO es lo ideal.
         // Lo ideal es que el cliente de socket.io esté actualizado.
         // Para propósitos de corrección y si el contexto lo exige, haríamos:
         // return new Promise((resolve, reject) => { ... simular timeout manualmente ... });
         // PERO, para solucionar el error de origen, el cliente debe tenerlo.
         console.error('Error: gameSocket.timeout no está disponible. Asegúrate de tener una versión reciente de socket.io-client y que el servicio socketService exporta una instancia válida.');
         reject(new Error('gameSocket.timeout is not a function. Make sure socket.io-client is updated.'));
         return; // Evita continuar si el método no está
       }
   
       gameSocket.timeout(5000).emit(event, payload, (err, data) => {
         if (err) reject(err);
         else resolve(data);
       });
     });
   
   export const useGameMasterLogic = ({ roomCode, initialDifficulty }) => {
     /* ------------------------------- STATE ------------------------------- */
     const { spotify, loggedIn, login, logout, token } = useSpotify();
   
     const [currentCard, setCurrentCard] = useState(null);
     const [isLoading, setIsLoading] = useState(false);
     const [selectedCategory, setSelectedCategory] = useState(null);
     // init | wheel | card | gameOver
     const [gameStep, setGameStep] = useState('init');
     // [{id, name, ready, isHost}, …]
     const [connectedPlayers, setConnectedPlayers] = useState([]);
     const [difficulty, setDifficulty] = useState(initialDifficulty);
     const [connectionError, setConnectionError] = useState(null);
     const [isMarkingEnabled, setIsMarkingEnabled] = useState(false);
     const [allPlayersReady, setAllPlayersReady] = useState(false);
     const [isTokenValid, setIsTokenValid] = useState(true);
     const [songPlaying, setSongPlaying] = useState(false);
     // {playerName: [pred1, pred2,…]}
     const [playerPredictions, setPlayerPredictions] = useState({});
     // {playerId: true/false}
     const [playerCorrect, setPlayerCorrect] = useState({});
     const [gameOver, setGameOver] = useState(false);
     // [{id, name}, …]
     const [winners, setWinners] = useState([]);
   
     /* ------------------------------- REFS ------------------------------- */
     // Refs keep the latest value for callbacks that run after a render
     const playerCorrectRef = useRef({});
     const connectedPlayersRef = useRef([]);
     const markingEnabledRef = useRef(false);
     const isTokenValidRef = useRef(true);
   
     // Sincronizar refs con el estado
     useEffect(() => { playerCorrectRef.current = playerCorrect; }, [playerCorrect]);
     useEffect(() => { connectedPlayersRef.current = connectedPlayers; }, [connectedPlayers]);
     useEffect(() => { markingEnabledRef.current = isMarkingEnabled; }, [isMarkingEnabled]);
     useEffect(() => { isTokenValidRef.current = isTokenValid; }, [isTokenValid]);
   
     /* --------------------------- UTILITIES --------------------------- */
     /** Reset the map of “playerCorrect” to false for every player */
     const resetPlayerCorrectState = useCallback(() => {
       // If we still haven’t received the players list, try again in a tick
       if (!connectedPlayersRef.current.length) {
         setTimeout(resetPlayerCorrectState, 200);
         return;
       }
       const reset = {};
       connectedPlayersRef.current.forEach(p => (reset[p.id] = false));
       setPlayerCorrect(reset);
     }, []); // only uses refs, so deps = []
   
     /* -------------------- 1️⃣ TOKEN VALIDATION -------------------- */
     // Verify token existence (runs only when the token value changes)
     useEffect(() => {
       const tokenData = localStorage.getItem('spotify_token');
       // Si el token pasado por prop es null/undefined O no hay token en localStorage
       if (!token || !tokenData) {
         setIsTokenValid(false);
         logout(); // Asegurarse de cerrar sesión si no hay token
         setGameStep('init'); // Volver al estado inicial
         return;
       }
       // Si hay token, marcarlo como válido
       setIsTokenValid(true);
     }, [token, logout]); // Depende de 'token' y de la función 'logout'
   
     // Once we know the token is valid we move from “init” → “wheel”
     useEffect(() => {
       if (isTokenValid && gameStep === 'init') {
         setGameStep('wheel');
       }
     }, [isTokenValid, gameStep]); // Depende de 'isTokenValid' y 'gameStep'
   
     /* ------------------ 2️⃣ RESTORE STATE ON VISIBILITY ------------------ */
     // Para restaurar el estado del juego si la pestaña se oculta y se vuelve a mostrar
     useEffect(() => {
       const handleVisibilityChange = () => {
         if (!document.hidden) { // Si la pestaña vuelve a ser visible
           const saved = localStorage.getItem('musicBingoState');
           if (!saved) return; // Si no hay nada guardado, no hacer nada
           try {
             const { timestamp, cardState } = JSON.parse(saved);
             // Si los datos guardados tienen menos de 5 minutos (300_000 ms) y tenemos datos de carta, y la carta actual no está cargada
             if (Date.now() - timestamp < 300_000 && cardState && !currentCard) {
               setCurrentCard(cardState); // Restaurar la carta
               setSongPlaying(true);      // Indicar que hay una canción sonando
               setGameStep('card');       // Forzar la UI a mostrar la carta
             }
           } catch (e) {
             console.error('Error restoring state from localStorage:', e);
           }
         }
       };
       // Añadir el listener al montar el componente
       document.addEventListener('visibilitychange', handleVisibilityChange);
       // Limpiar el listener al desmontar el componente
       return () =>
         document.removeEventListener('visibilitychange', handleVisibilityChange);
     }, [currentCard]); // Depende de 'currentCard' para saber si ya se ha cargado una carta
   
     /* ---------------------- 3️⃣ SOCKET & ROOM ---------------------- */
     // Este useEffect se encarga de la conexión inicial y de registrar los listeners
     useEffect(() => {
       /* ---------- 3.1 Register socket listeners (once) ---------- */
       // Definición de todos los handlers que esperamos del servidor
       const handlers = {
         // Actualiza la lista de jugadores conectados en el estado
         playersUpdate: ({ players }) => {
           setConnectedPlayers(players);
           // Actualiza si todos los jugadores listos (o son host)
           setAllPlayersReady(players.every(p => p.ready || p.isHost));
         },
   
         // Recibe una predicción de un jugador
         playerPrediction: ({ playerName, prediction }) => {
           setPlayerPredictions(prev => ({
             ...prev,
             // Añade la nueva predicción a la lista de ese jugador
             [playerName]: [...(prev[playerName] || []), prediction],
           }));
         },
   
         // Un jugador ha sido marcado como correcto/incorrecto por el host
         playerMarked: ({ playerId, isCorrect }) => {
           setPlayerCorrect(prev => ({
             ...prev,
             [playerId]: isCorrect, // Actualiza el estado del jugador
           }));
         },
   
         // El host habilita o deshabilita el marcado global
         markingEnabled: () => setIsMarkingEnabled(true),
         markingDisabled: () => setIsMarkingEnabled(false),
   
         // El host anuncia un ganador
         playerWon: ({ playerId, playerName }) => {
           setWinners(prev => {
             // Evitar duplicados si el mismo jugador gana varias veces
             if (prev.some(w => w.id === playerId)) return prev;
             return [...prev, { id: playerId, name: playerName }];
           });
         },
   
         // El servidor responde que no se pudo iniciar el juego (ej: pocos jugadores)
         gameStartFailed: err => {
           setConnectionError(err.message);
           setGameStep('wheel'); // Volver a la rueda para que el host pueda Intentar de nuevo
         },
   
         // Error genérico del socket
         error: err => setConnectionError(err.message),
       };
   
       // Registrar cada handler en el socket
       Object.entries(handlers).forEach(([ev, fn]) => gameSocket.on(ev, fn));
   
       /* ---------- 3.2 Create / join the room (once) ---------- */
       // Función asíncrona para inicializar la habitación
       const initRoom = async () => {
         try {
           // Si el socket no está conectado, conéctate primero
           if (!gameSocket.connected) await gameSocket.connect();
   
           // Emitir el evento 'createRoom' al servidor con los datos necesarios
           const roomResponse = await emitWithAck('createRoom', {
             roomCode,
             difficulty,
             maxPlayers: 12, // Valor fijo definido en el hook
             host: true,     // Este hook es para el Game Master (host)
           });
   
           // Si la respuesta del servidor contiene la lista de jugadores, actualizar el estado
           if (roomResponse?.players) {
             setConnectedPlayers(roomResponse.players);
             setAllPlayersReady(
               roomResponse.players.every(p => p.ready || p.isHost)
             );
           }
         } catch (e) {
           console.error('Error initializing room:', e);
           setConnectionError(
             (e && e.message) || 'Error while creating or joining the room'
           );
         }
       };
   
       // Ejecutar la inicialización de la sala
       initRoom();
   
       /* ---------- 3.3 Cleanup ---------- */
       // Al desmontar el componente, remover todos los listeners del socket
       return () => {
         Object.keys(handlers).forEach(ev => gameSocket.off(ev));
         // Opcional: Si quieres desconectar el socket al irte, descomenta la línea de abajo
         // gameSocket.disconnect();
       };
       // eslint-disable-next-line react-hooks/exhaustive-deps
     }, []); // [] -> Este effect se ejecuta solo UNA VEZ al montar (y la limpieza al desmontar)
   
   
     /* -------------------- 4️⃣ GAME LOGIC CALLBACKS -------------------- */
   
     /** Change room difficulty */
     const handleDifficultyChange = useCallback(
       async newDifficulty => {
         // Si no está logueado o el token no es válido, redirigir a init
         if (!loggedIn || !isTokenValid) {
           setGameStep('init');
           return;
         }
         try {
           setDifficulty(newDifficulty); // Actualizar estado local
           // Notificar al servidor del cambio de dificultad
           await emitWithAck('updateRoom', { roomCode, difficulty: newDifficulty });
         } catch (e) {
           console.error('Error changing difficulty:', e);
           setConnectionError((e && e.message) || 'Error changing difficulty');
         }
       },
       // Depende de las props y estado que se usan o se emiten
       [roomCode, loggedIn, isTokenValid]
     );
   
     /** Choose a music category – moves to “card” step */
     const handleCategorySelected = useCallback(
       async category => {
         if (!loggedIn || !isTokenValid) {
           setGameStep('init');
           return;
         }
         try {
           // Notificar al servidor que la categoría ha sido seleccionada
           await emitWithAck('selectCategory', { roomCode, category });
           // Actualizar estado local
           setSelectedCategory(category);
           setGameStep('card');      // Avanzar al paso de mostrar la carta
           setIsMarkingEnabled(false); // Deshabilitar marcado al iniciar nueva ronda
           setCurrentCard(null);      // Limpiar carta anterior
           setSongPlaying(false);     // No hay canción sonando al seleccionar categoria
           setPlayerPredictions({}); // Limpiar predicciones
           resetPlayerCorrectState(); // Resetear estado de aciertos de jugadores
         } catch (e) {
           console.error('Error selecting category:', e);
           setConnectionError((e && e.message) || 'Error selecting category');
         }
       },
       [roomCode, loggedIn, isTokenValid, resetPlayerCorrectState] // Dps: todas las dependencias externas usadas
     );
   
     /** Generate a new bingo card (calls Spotify) */
     const generateNewCard = useCallback(
       async () => {
         // Si no está logueado, no hay token, no hay categoría seleccionada o no hay instancia de spotify, salir.
         if (!loggedIn || !isTokenValid || !selectedCategory || !spotify) return;
   
         setIsLoading(true); // Iniciar indicador de carga
         try {
           // 1️⃣ Random music category & random artist inside it
           // (Nota: Aquí se ignora la `selectedCategory` pasada como prop,
           // y se elige una categoría y artista aleatorios. Si se quiere
           // usar la categoria seleccionada, esta parte debe modificarse.)
           const categories = Object.keys(ARTISTS);
           const randomMusicCategory = categories[Math.floor(Math.random() * categories.length)];
           const artistsInCategory = ARTISTS[randomMusicCategory];
           const randomArtist = artistsInCategory[Math.floor(Math.random() * artistsInCategory.length)];
   
           // 2️⃣ Search tracks on Spotify
           // Buscar canciones del artista aleatorio. `market: 'ES'` limita los resultados a España.
           const response = await spotify.searchTracks(
             `artist:"${randomArtist}"`,
             { limit: 50, market: 'ES' } // Limitar a 50 y mercado español como ejemplo
           );
           const tracks = response.tracks.items;
           if (!tracks.length) throw new Error('No songs found for this artist');
   
           // Seleccionar una canción aleatoria de los resultados
           const randomTrack = tracks[Math.floor(Math.random() * tracks.length)];
           // Extraer el año del lanzamiento
           const year = parseInt(randomTrack.album.release_date.split('-')[0], 10);
   
           // Construir el objeto de la nueva carta de bingo
           const newCard = {
             title: randomTrack.name,
             artist: randomTrack.artists[0].name,
             year,
             spotifyUrl: randomTrack.external_urls.spotify,
             uri: randomTrack.uri, // URI para reproducir la canción
             musicCategory: randomMusicCategory, // Categoría de la canción (usada en la lógica de la carta, no afectada por la prop)
             revealed: false, // Inicialmente no revelada
           };
   
           // 3️⃣ Persist state for “resume” feature
           // Guardar estado en localStorage para poder reanudar si el usuario cambia de pestaña/cierra el navegador
           const gameState = {
             currentTrack: randomTrack.uri, // Guardar la URI de la canción
             timestamp: Date.now(),         // Momento de guardado
             cardState: newCard,            // El estado de la carta
           };
           localStorage.setItem('musicBingoState', JSON.stringify(gameState));
   
           // 4️⃣ Update UI, play the track and notify the server
           setCurrentCard(newCard); // Actualizar el estado de la carta actual
           setGameStep('card');     // Cambiar el paso del juego a 'card'
           await spotify.playTrack(randomTrack.uri); // Reproducir la canción
           await emitWithAck('startSong', { roomCode }); // Notificar al server que la canción ha iniciado
           setSongPlaying(true);    // Indicar que la canción está sonando
           resetPlayerCorrectState(); // Resetear el estado de aciertos de jugadores para la nueva ronda
         } catch (e) {
           console.error('Error generating card:', e);
           if (e && e.status === 401) { // Si el error es de autenticación (token expirado)
             setIsTokenValid(false);
             logout();
             setGameStep('init');
           } else {
             setConnectionError((e && e.message) || 'Error generating the card');
           }
         } finally {
           setIsLoading(false); // Terminar indicador de carga
         }
       },
       // Dependencias del hook useCallback
       [
         loggedIn,
         isTokenValid,
         selectedCategory, // Es una dependencia porque la lógica de generación PODRÍA depender de ella
         spotify,
         roomCode,
         logout,
         resetPlayerCorrectState,
       ]
     );
   
     /** Reveal the song (end of round) */
     const handleRevealSong = useCallback(
       async () => {
         // Solo actuar si hay una carta cargada y el usuario está logueado
         if (!currentCard || !loggedIn || !isTokenValid) return;
         try {
           // Notificar al servidor que la canción se está revelando con sus datos
           await emitWithAck('revealSong', {
             roomCode,
             songData: {
               title: currentCard.title,
               artist: currentCard.artist,
               year: currentCard.year,
             },
           });
           // Marcar la carta como revelada en el estado local
           setCurrentCard(prev => ({ ...prev, revealed: true }));
           setSongPlaying(false); // La canción ya no está sonando activamente
           resetPlayerCorrectState(); // Resetear estado de aciertos por si acaso
         } catch (e) {
           console.error('Error revealing song:', e);
           setConnectionError('Error revealing the song');
         }
       },
       [currentCard, roomCode, loggedIn, isTokenValid, resetPlayerCorrectState]
     );
   
     /** Toggle a single player's “correct” flag */
     const handlePlayerCorrectToggle = useCallback(
       async playerId => {
         if (!loggedIn || !isTokenValid) return; // Validar estado
         try {
           // Determinar el nuevo estado (si estaba incorrecto, pasa a correcto; si estaba correcto, pasa a incorrecto)
           const newCorrect = !playerCorrectRef.current[playerId];
           const player = connectedPlayersRef.current.find(p => p.id === playerId);
           console.log(
             'Toggling player:',
             player?.name ?? 'unknown', // Nombre del jugador o 'unknown' si no se encuentra
             `(ID:${playerId}) →`,
             newCorrect ? 'ACERTANTE' : 'NO ACERTANTE'
           );
   
           // Notificar al servidor el cambio de estado del jugador
           await emitWithAck('markPlayerCorrect', {
             roomCode,
             playerId,
             isCorrect: newCorrect,
           });
   
           // Actualizar el estado local de `playerCorrect`
           setPlayerCorrect(prev => ({
             ...prev,
             [playerId]: newCorrect,
           }));
   
           // Si el marcado global global está activo, deshabilitarlo
           // para que el servidor recalcule si es necesario.
           if (markingEnabledRef.current) {
             await emitWithAck('disableMarking', { roomCode });
             setIsMarkingEnabled(false);
           }
         } catch (e) {
           console.error('Error toggling player correct flag:', e);
           setConnectionError('Error toggling player correct flag');
         }
       },
       [roomCode, loggedIn, isTokenValid]
     );
   
     /** Enable / disable global marking (the “ready to judge” button) */
     const handleMarkingToggle = useCallback(
       async () => {
         if (!loggedIn || !isTokenValid) return; // Validar estado
         try {
           // Si el marcado global ya está habilitado, solo hay que deshabilitarlo
           if (markingEnabledRef.current) {
             await emitWithAck('disableMarking', { roomCode });
             setIsMarkingEnabled(false);
             return;
           }
   
           // --------------------------------------------------------------
           //  Enable marking: gather eligible players
           // --------------------------------------------------------------
           const currentCorrect = playerCorrectRef.current;
           // Obtener los IDs de los jugadores marcados como acertantes
           const eligiblePlayers = Object.entries(currentCorrect)
             .filter(([, ok]) => ok) // Filtrar solo los que son 'true' (acertantes)
             .map(([id]) => id);     // Extraer sus IDs
   
           // Si no hay jugadores marcados como acertantes, mostrar error y salir
           if (!eligiblePlayers.length) {
             setConnectionError(
               'No hay jugadores marcados como acertantes. Marca al menos uno antes de habilitar el marcado.'
             );
             return;
           }
   
           // Verificar que todos los jugadores marcados como acertantes sigan conectados
           const stillConnected = connectedPlayersRef.current.filter(p =>
               eligiblePlayers.includes(p.id)
           );
   
   
           // Si ninguno de los jugadores marcados como acertantes sigue conectado, mostrar error.
           if (!stillConnected.length) {
             setConnectionError(
               'Los jugadores marcados como acertantes ya no están conectados.'
             );
             return;
           }
   
           // Recopilar solo los IDs de los jugadores todavía conectados
           const eligiblePlayerIds = stillConnected.map(p => p.id);
   
   
           // Enviar la lista de jugadores elegibles al servidor para habilitar el marcado
           await emitWithAck('enableMarking', {
             roomCode,
             eligiblePlayers: eligiblePlayerIds, // Pasar los IDs de los jugadores válidos
           });
           setIsMarkingEnabled(true); // Actualizar estado local
         } catch (e) {
           console.error('Error toggling global marking:', e);
           setConnectionError('Error toggling global marking');
         }
       },
       [roomCode, loggedIn, isTokenValid]
     );
   
     /** Finish the game (declare winners) */
     const finishGame = useCallback(
       async () => {
         if (!loggedIn || !isTokenValid) return; // Validar estado
         // Si no hay ganadores, no se puede finalizar el juego
         if (!winners.length) {
           setConnectionError('No hay ganadores para finalizar el juego');
           return;
         }
         try {
           // Notificar al servidor que el juego ha terminado, pasando la lista de ganadores
           await emitWithAck('gameOver', { roomCode, winners });
           setGameOver(true);     // Actualizar estado de fin de juego
           setGameStep('gameOver'); // Cambiar el paso del juego a 'gameOver'
         } catch (e) {
           console.error('Error finishing game:', e);
           setConnectionError('Error finishing the game');
         }
       },
       [roomCode, loggedIn, isTokenValid, winners]
     );
   
     /** Start a brand‑new round (reset everything) */
     const startNewRound = useCallback(
       async () => {
         if (!loggedIn || !isTokenValid) return; // Validar estado
         try {
           // Si el juego anterior ya finalizó, hay que pedir al servidor que reinicie la partida
           if (gameOver) {
             await emitWithAck('restartGame', { roomCode });
             setGameOver(false);     // Resetear estado de fin de juego
             setWinners([]);          // Limpiar lista de ganadores
           }
   
           // Asegurarse de que el marcado esté deshabilitado al iniciar nueva ronda
           await emitWithAck('disableMarking', { roomCode });
   
           // Resetear todos los estados del juego a los valores iniciales para una nueva ronda
           setCurrentCard(null);
           setSelectedCategory(null);
           setGameStep('wheel'); // Volver al paso de la rueda para elegir categoría
           setIsMarkingEnabled(false);
           setSongPlaying(false);
           setPlayerPredictions({});
           resetPlayerCorrectState(); // Resetear estado de confirmación de jugadores
         } catch (e) {
           console.error('Error starting a new round:', e);
           setConnectionError('Error starting a new round');
         }
       },
       [
         roomCode,
         loggedIn,
         isTokenValid,
         resetPlayerCorrectState,
         gameOver, // Depende de gameOver para saber si hay que llamar a restartGame
       ]
     );
   
     /* ------------------------------- RETURN ------------------------------- */
     // Exportar todos los estados y callbacks necesarios para la UI
     return {
       // ----- State / data -----
       loggedIn,
       login,
       logout,
       currentCard,
       isLoading,
       selectedCategory,
       gameStep,
       connectedPlayers,
       difficulty,
       connectionError,
       setConnectionError, // Permitir que la UI pueda limpiar errores
       isMarkingEnabled,
       allPlayersReady,
       isTokenValid,
       songPlaying,
       playerPredictions,
       playerCorrect,
       gameOver,
       winners,
   
       // ----- Actions / callbacks -----
       handlePlayerCorrectToggle,
       handleDifficultyChange,
       handleCategorySelected,
       generateNewCard,
       handleRevealSong,
       handleMarkingToggle,
       startNewRound,
       finishGame,
   
       // ----- Misc helpers -----
       setCurrentCard, // Permitir que la UI establezca la carta directamente en algún caso (ej: reseteo)
     };
   };