import axios from 'axios';

// Dynamically determine API URL based on current hostname.
// This keeps network access working when the app is opened via IP/domain
// while still honoring VITE_API_URL when it points to a remote host.
const getApiUrl = () => {
  const envApiUrl = import.meta.env.VITE_API_URL;

  if (envApiUrl) {
    try {
      const url = new URL(envApiUrl);

      // If env is localhost/127.0.0.1 but the app is accessed via IP/domain,
      // swap in the current hostname so requests go to the right server.
      if (['localhost', '127.0.0.1'].includes(url.hostname)) {
        url.hostname = window.location.hostname;
      }

      return url.toString();
    } catch {
      // Fall back to raw env value if URL parsing fails
      return envApiUrl;
    }
  }

  // Otherwise, use current hostname with port 5000 (default backend port)
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  return `${protocol}//${hostname}:5000/api`;
};

const API_URL = getApiUrl();

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

