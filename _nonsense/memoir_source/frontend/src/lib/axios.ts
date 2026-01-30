import axios from 'axios';
import { toast } from 'sonner';

// Create a custom instance
export const api = axios.create({
    baseURL: '/api' // Proxy will handle this in dev, relative path in prod
});

// Request Interceptor - inject auth token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('session_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response Interceptor
api.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        const { response } = error;

        // Network Error (server down / unreachable)
        if (!response) {
            toast.error("Network Error: Unable to reach the server.");
            return Promise.reject(error);
        }

        // Status Based Handling
        switch (response.status) {
            case 401: {
                // Session expired - clear and redirect to login
                const currentPath = window.location.pathname;
                if (!['/login', '/signup', '/'].includes(currentPath)) {
                    localStorage.removeItem('session_token');
                    localStorage.removeItem('user_id');
                    window.location.href = '/login';
                }
                toast.error("Unauthorized: Please log in.");
                break;
            }
            case 403:
                toast.error("Forbidden: You don't have permission.");
                break;
            case 429:
                toast.warning("Rate Limit Exceeded: Please slow down.");
                break;
            case 500: {
                const msg = response.data?.error || "Internal Server Error";
                toast.error(`Server Error: ${msg}`);
                break;
            }
            default:
                // For other errors, let the calling code decide, but show a generic toast if it's 4xx/5xx
                if (response.status >= 400) {
                    toast.error(response.data?.error || `Error ${response.status}: Something went wrong.`);
                }
        }

        return Promise.reject(error);
    }
);
