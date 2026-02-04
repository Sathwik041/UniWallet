import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://wallet-generator-backend.vercel.app',
});

export default api;
