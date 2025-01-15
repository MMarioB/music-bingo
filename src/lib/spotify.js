const SPOTIFY_CLIENT_ID = '277eea2816be4656a4612eae1b3ca65e';
const REDIRECT_URI = 'http://localhost:5173';

const SCOPES = [
    'streaming',                    // Para reproducir audio
    'user-read-email',             // Info básica del usuario
    'user-read-private',           // Info básica del usuario
    'user-modify-playback-state',  // Control de reproducción
    'user-read-playback-state',    // Estado de reproducción
    'user-read-currently-playing', // Info de reproducción actual
    'playlist-read-private',       // Acceso a playlists
    'playlist-read-collaborative', // Acceso a playlists colaborativas
    'user-library-read'           // Acceso a biblioteca
].join(' ');

export const loginUrl = `https://accounts.spotify.com/authorize?client_id=${SPOTIFY_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent(SCOPES)}&response_type=token&show_dialog=true`;

export const getTokenFromUrl = () => {
    return window.location.hash
        .substring(1)
        .split('&')
        .reduce((initial, item) => {
            let parts = item.split('=');
            initial[parts[0]] = decodeURIComponent(parts[1]);
            return initial;
        }, {});
};

export const isTokenValid = (token) => {
    if (!token) return false;
    return true;
};

export default {
    loginUrl,
    getTokenFromUrl,
    isTokenValid
};