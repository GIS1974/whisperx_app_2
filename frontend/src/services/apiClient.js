// frontend/src/services/apiClient.js
import axios from 'axios';

// Determine API base URL from environment variables (Vite specific)
// In development, this might be http://localhost:5000/api
// In production, this would be your deployed backend API URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Optional: Add interceptors for request/response handling (e.g., auth tokens)
// apiClient.interceptors.request.use(config => {
//   const token = localStorage.getItem('token');
//   if (token) {
//     config.headers.Authorization = `Bearer ${token}`;
//   }
//   return config;
// });

// apiClient.interceptors.response.use(response => response, error => {
//   // Handle global errors, e.g., 401 Unauthorized
//   if (error.response && error.response.status === 401) {
//     // localStorage.removeItem('token');
//     // window.location.href = '/login'; // Redirect to login
//   }
//   return Promise.reject(error);
// });

export default apiClient;
