const SPOTIFY_CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
const REDIRECT_URI = 'https://www.discohitsbingo.com';

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
    const hash = window.location.hash
        .substring(1)
        .split('&')
        .reduce((initial, item) => {
            let parts = item.split('=');
            initial[parts[0]] = decodeURIComponent(parts[1] || '');
            return initial;
        }, {});

    // Asegurarnos de tener todos los campos necesarios
    return {
        access_token: hash.access_token || null,
        token_type: hash.token_type || 'Bearer',
        expires_in: parseInt(hash.expires_in || '3600'),
        state: hash.state || null
    };
};

export const getStoredToken = () => {
    const token = localStorage.getItem('spotify_token');
    const expiration = localStorage.getItem('spotify_token_expiration');
    
    if (!token || !expiration) return null;
    
    return {
        access_token: token,
        expires_in: Math.floor((parseInt(expiration) - Date.now()) / 1000)
    };
};

export default {
    loginUrl,
    getTokenFromUrl,
    getStoredToken
};