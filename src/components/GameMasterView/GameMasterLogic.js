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
   import { gameSocket } from '../../services/socketService';
   import { ARTISTS } from './constants';
   
   /**
    * Helper that turns a socket.io callback‑ack into a Promise.
    * Allows us to write:  await emitWithAck('event', payload);
    */
   const emitWithAck = (event, payload) =>
     new Promise((resolve, reject) => {
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
     const [gameStep, setGameStep] = useState('init'); // init | wheel | card | gameOver
     const [connectedPlayers, setConnectedPlayers] = useState([]); // [{id, name, ready, isHost}, …]
     const [difficulty, setDifficulty] = useState(initialDifficulty);
     const [connectionError, setConnectionError] = useState(null);
     const [isMarkingEnabled, setIsMarkingEnabled] = useState(false);
     const [allPlayersReady, setAllPlayersReady] = useState(false);
     const [isTokenValid, setIsTokenValid] = useState(true);
     const [songPlaying, setSongPlaying] = useState(false);
     const [playerPredictions, setPlayerPredictions] = useState({}); // {playerName: [pred1, pred2,…]}
     const [playerCorrect, setPlayerCorrect] = useState({}); // {playerId: true/false}
     const [gameOver, setGameOver] = useState(false);
     const [winners, setWinners] = useState([]); // [{id, name}, …]
   
     /* ------------------------------- REFS ------------------------------- */
     // Refs keep the latest value for callbacks that run after a render
     const playerCorrectRef = useRef({});
     const connectedPlayersRef = useRef([]);
     const markingEnabledRef = useRef(false);
     const isTokenValidRef = useRef(true);
   
     useEffect(() => {
       playerCorrectRef.current = playerCorrect;
     }, [playerCorrect]);
   
     useEffect(() => {
       connectedPlayersRef.current = connectedPlayers;
     }, [connectedPlayers]);
   
     useEffect(() => {
       markingEnabledRef.current = isMarkingEnabled;
     }, [isMarkingEnabled]);
   
     useEffect(() => {
       isTokenValidRef.current = isTokenValid;
     }, [isTokenValid]);
   
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
       if (!token || !tokenData) {
         setIsTokenValid(false);
         logout();
         setGameStep('init');
         return;
       }
       setIsTokenValid(true);
     }, [token, logout]);
   
     // Once we know the token is valid we move from “init” → “wheel”
     useEffect(() => {
       if (isTokenValid && gameStep === 'init') {
         setGameStep('wheel');
       }
     }, [isTokenValid, gameStep]);
   
     /* ------------------ 2️⃣ RESTORE STATE ON VISIBILITY ------------------ */
     useEffect(() => {
       const handleVisibilityChange = () => {
         if (!document.hidden) {
           const saved = localStorage.getItem('musicBingoState');
           if (!saved) return;
           try {
             const { timestamp, cardState } = JSON.parse(saved);
             if (Date.now() - timestamp < 300_000 && cardState && !currentCard) {
               setCurrentCard(cardState);
               setSongPlaying(true);
               setGameStep('card'); // UI must show the card
             }
           } catch (e) {
             console.error('Error restoring state from localStorage:', e);
           }
         }
       };
       document.addEventListener('visibilitychange', handleVisibilityChange);
       return () =>
         document.removeEventListener('visibilitychange', handleVisibilityChange);
     }, []); // runs only once
   
     /* ---------------------- 3️⃣ SOCKET & ROOM ---------------------- */
     useEffect(() => {
       /* ---------- 3.1 Register socket listeners (once) ---------- */
       const handlers = {
         // Update players list
         playersUpdate: ({ players }) => {
           setConnectedPlayers(players);
           setAllPlayersReady(players.every(p => p.ready || p.isHost));
         },
   
         // Receive a prediction from a player
         playerPrediction: ({ playerName, prediction }) => {
           setPlayerPredictions(prev => ({
             ...prev,
             [playerName]: [...(prev[playerName] || []), prediction],
           }));
         },
   
         // Player marked as correct / incorrect
         playerMarked: ({ playerId, isCorrect }) => {
           setPlayerCorrect(prev => ({
             ...prev,
             [playerId]: isCorrect,
           }));
         },
   
         // Global marking enabled / disabled
         markingEnabled: () => setIsMarkingEnabled(true),
         markingDisabled: () => setIsMarkingEnabled(false),
   
         // Winner announced
         playerWon: ({ playerId, playerName }) => {
           setWinners(prev => {
             if (prev.some(w => w.id === playerId)) return prev;
             return [...prev, { id: playerId, name: playerName }];
           });
         },
   
         // Game start failed (e.g. not enough)
         gameStartFailed: err => {
           setConnectionError(err.message);
           setGameStep('wheel');
         },
   
         // Generic socket error
         error: err => setConnectionError(err.message),
       };
   
       // Register every handler
       Object.entries(handlers).forEach(([ev, fn]) => gameSocket.on(ev, fn));
   
       /* ---------- 3.2 Create / join the room (once) ---------- */
       const initRoom = async () => {
         try {
           if (!gameSocket.connected) await gameSocket.connect();
   
           const roomResponse = await emitWithAck('createRoom', {
             roomCode,
             difficulty,
             maxPlayers: 12,
             host: true,
           });
   
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
   
       initRoom();
   
       /* ---------- 3.3 Cleanup ---------- */
       return () => {
         Object.keys(handlers).forEach(ev => gameSocket.off(ev));
       };
       // eslint-disable-next-line react-hooks/exhaustive-deps
     }, []); // empty deps → runs only on mount
   
     /* -------------------- 4️⃣ GAME LOGIC CALLBACKS -------------------- */
   
     /** Change room difficulty */
     const handleDifficultyChange = useCallback(
       async newDifficulty => {
         if (!loggedIn || !isTokenValid) {
           setGameStep('init');
           return;
         }
         try {
           setDifficulty(newDifficulty);
           await emitWithAck('updateRoom', { roomCode, difficulty: newDifficulty });
         } catch (e) {
           console.error('Error changing difficulty:', e);
           setConnectionError((e && e.message) || 'Error changing difficulty');
         }
       },
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
           await emitWithAck('selectCategory', { roomCode, category });
           setSelectedCategory(category);
           setGameStep('card');
           setIsMarkingEnabled(false);
           setCurrentCard(null);
           setSongPlaying(false);
           setPlayerPredictions({});
           resetPlayerCorrectState();
         } catch (e) {
           console.error('Error selecting category:', e);
           setConnectionError((e && e.message) || 'Error selecting category');
         }
       },
       [roomCode, loggedIn, isTokenValid, resetPlayerCorrectState]
     );
   
     /** Generate a new bingo card (calls Spotify) */
     const generateNewCard = useCallback(
       async () => {
         if (!loggedIn || !isTokenValid || !selectedCategory || !spotify) return;
   
         setIsLoading(true);
         try {
           // 1️⃣ Random music category & random artist inside it
           const randomMusicCategory =
             Object.keys(ARTISTS)[
               Math.floor(Math.random() * Object.keys(ARTISTS).length)
             ];
           const artistsInCategory = ARTISTS[randomMusicCategory];
           const randomArtist =
             artistsInCategory[
               Math.floor(Math.random() * artistsInCategory.length)
             ];
   
           // 2️⃣ Search tracks on Spotify
           const response = await spotify.searchTracks(
             `artist:"${randomArtist}"`,
             { limit: 50, market: 'ES' }
           );
           const tracks = response.tracks.items;
           if (!tracks.length) throw new Error('No songs found');
   
           const randomTrack = tracks[Math.floor(Math.random() * tracks.length)];
           const year = parseInt(randomTrack.album.release_date.split('-')[0], 10);
   
           const newCard = {
             title: randomTrack.name,
             artist: randomTrack.artists[0].name,
             year,
             spotifyUrl: randomTrack.external_urls.spotify,
             uri: randomTrack.uri,
             musicCategory: randomMusicCategory,
             revealed: false,
           };
   
           // 3️⃣ Persist state for “resume” feature
           const gameState = {
             currentTrack: randomTrack.uri,
             timestamp: Date.now(),
             cardState: newCard,
           };
           localStorage.setItem('musicBingoState', JSON.stringify(gameState));
   
           // 4️⃣ Update UI, play the track and notify the server
           setCurrentCard(newCard);
           setGameStep('card'); // force UI to card view
           await spotify.playTrack(randomTrack.uri);
           await emitWithAck('startSong', { roomCode });
           setSongPlaying(true);
           resetPlayerCorrectState();
         } catch (e) {
           console.error('Error generating card:', e);
           if (e && e.status === 401) {
             setIsTokenValid(false);
             logout();
             setGameStep('init');
           } else {
             setConnectionError('Error generating the card');
           }
         } finally {
           setIsLoading(false);
         }
       },
       [
         loggedIn,
         isTokenValid,
         selectedCategory,
         spotify,
         roomCode,
         logout,
         resetPlayerCorrectState,
       ]
     );
   
     /** Reveal the song (end of round) */
     const handleRevealSong = useCallback(
       async () => {
         if (!currentCard || !loggedIn || !isTokenValid) return;
         try {
           await emitWithAck('revealSong', {
             roomCode,
             songData: {
               title: currentCard.title,
               artist: currentCard.artist,
               year: currentCard.year,
             },
           });
           setCurrentCard(prev => ({ ...prev, revealed: true }));
           setSongPlaying(false);
           resetPlayerCorrectState();
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
         if (!loggedIn || !isTokenValid) return;
         try {
           const newCorrect = !playerCorrectRef.current[playerId];
           const player = connectedPlayersRef.current.find(p => p.id === playerId);
           console.log(
             'Toggling player:',
             player?.name ?? 'unknown',
             `(ID:${playerId}) →`,
             newCorrect ? 'ACERTANTE' : 'NO ACERTANTE'
           );
   
           await emitWithAck('markPlayerCorrect', {
             roomCode,
             playerId,
             isCorrect: newCorrect,
           });
   
           setPlayerCorrect(prev => ({
             ...prev,
             [playerId]: newCorrect,
           }));
   
           // If global marking is active, disable it so the server can recalc
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
         if (!loggedIn || !isTokenValid) return;
         try {
           // If already enabled → just disable
           if (markingEnabledRef.current) {
             await emitWithAck('disableMarking', { roomCode });
             setIsMarkingEnabled(false);
             return;
           }
   
           // --------------------------------------------------------------
           //  Enable marking: gather eligible players
           // --------------------------------------------------------------
           const currentCorrect = playerCorrectRef.current;
           const eligiblePlayers = Object.entries(currentCorrect)
             .filter(([, ok]) => ok)
             .map(([id]) => id);
   
           if (!eligiblePlayers.length) {
             setConnectionError(
               'No hay jugadores marcados como acertantes. Marca al menos uno antes de habilitar el marcado.'
             );
             return;
           }
   
           // Verify that every eligible player is still connected
           const stillConnected = eligiblePlayers.filter(id =>
             connectedPlayersRef.current.some(p => p.id === id)
           );
   
           if (!stillConnected.length) {
             setConnectionError(
               'Los jugadores marcados como acertantes ya no están conectados.'
             );
             return;
           }
   
           // Send the list to the server
           await emitWithAck('enableMarking', {
             roomCode,
             eligiblePlayers: stillConnected,
           });
           setIsMarkingEnabled(true);
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
         if (!loggedIn || !isTokenValid) return;
         if (!winners.length) {
           setConnectionError('No hay ganadores para finalizar el juego');
           return;
         }
         try {
           await emitWithAck('gameOver', { roomCode, winners });
           setGameOver(true);
           setGameStep('gameOver');
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
         if (!loggedIn || !isTokenValid) return;
         try {
           // If the previous game already ended, ask the server to restart it
           if (gameOver) {
             await emitWithAck('restartGame', { roomCode });
             setGameOver(false);
             setWinners([]);
           }
   
           await emitWithAck('disableMarking', { roomCode });
   
           setCurrentCard(null);
           setSelectedCategory(null);
           setGameStep('wheel');
           setIsMarkingEnabled(false);
           setSongPlaying(false);
           setPlayerPredictions({});
           resetPlayerCorrectState();
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
         gameOver,
       ]
     );
   
     /* ------------------------------- RETURN ------------------------------- */
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
       setConnectionError,
       isMarkingEnabled,
       allPlayersReady,
       isTokenValid,
       songPlaying,
       playerPredictions,
       playerCorrect,
   
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
       setCurrentCard,
       gameOver,
       winners,
     };
   };