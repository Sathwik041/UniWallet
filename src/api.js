import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || 'https://wallet-generator-backend.vercel.app';
console.log("API Base URL:", baseURL);

const api = axios.create({
  baseURL: baseURL,
});

export default api;