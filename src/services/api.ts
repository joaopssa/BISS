import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3001/api', // URL base do seu backend
});

// Interceptor para adicionar o token em todas as requisições autenticadas
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;