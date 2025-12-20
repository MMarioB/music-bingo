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

// Función para generar un string aleatorio para PKCE
const generateRandomString = (length) => {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const values = crypto.getRandomValues(new Uint8Array(length));
    return values.reduce((acc, x) => acc + possible[x % possible.length], "");
};

// Función para generar el code_challenge a partir del code_verifier
const sha256 = async (plain) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(plain);
    return window.crypto.subtle.digest('SHA-256', data);
};

const base64encode = (input) => {
    return btoa(String.fromCharCode(...new Uint8Array(input)))
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
};

// Generar y guardar code_verifier y code_challenge para PKCE
export const generatePKCECodes = async () => {
    const codeVerifier = generateRandomString(64);
    const hashed = await sha256(codeVerifier);
    const codeChallenge = base64encode(hashed);

    // Guardar el code_verifier para usarlo después en el intercambio de token
    localStorage.setItem('spotify_code_verifier', codeVerifier);

    return { codeVerifier, codeChallenge };
};

// Generar URL de login con PKCE
export const getLoginUrl = async () => {
    const { codeChallenge } = await generatePKCECodes();

    const params = new URLSearchParams({
        client_id: SPOTIFY_CLIENT_ID,
        response_type: 'code',
        redirect_uri: REDIRECT_URI,
        scope: SCOPES,
        code_challenge_method: 'S256',
        code_challenge: codeChallenge,
        show_dialog: 'true'
    });

    return `https://accounts.spotify.com/authorize?${params.toString()}`;
};

// Mantener loginUrl para compatibilidad (aunque ahora es asíncrono)
export let loginUrl = null;

// Obtener el código de autorización de la URL
export const getCodeFromUrl = () => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('code');
};

// Intercambiar el código de autorización por un access token
export const exchangeCodeForToken = async (code) => {
    const codeVerifier = localStorage.getItem('spotify_code_verifier');

    if (!codeVerifier) {
        throw new Error('No se encontró el code_verifier');
    }

    const params = new URLSearchParams({
        client_id: SPOTIFY_CLIENT_ID,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: REDIRECT_URI,
        code_verifier: codeVerifier
    });

    try {
        const response = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: params.toString()
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Error en el intercambio de token: ${errorData.error_description || errorData.error}`);
        }

        const data = await response.json();

        // Limpiar el code_verifier después de usarlo
        localStorage.removeItem('spotify_code_verifier');

        return {
            access_token: data.access_token,
            token_type: data.token_type || 'Bearer',
            expires_in: data.expires_in || 3600,
            refresh_token: data.refresh_token || null
        };
    } catch (error) {
        console.error('Error intercambiando código por token:', error);
        throw error;
    }
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
    getLoginUrl,
    getCodeFromUrl,
    exchangeCodeForToken,
    getStoredToken
};