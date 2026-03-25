import axios from 'axios';

// Creamos una instancia configurada de Axios
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL, // Coge la URL del .env
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
});

// Inyectamos el token automáticamente
// Si el usuario ha iniciado sesión, adjuntamos su "llave" a cada petición
api.interceptors.request.use(config => {
    const token = localStorage.getItem('auth_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default api;