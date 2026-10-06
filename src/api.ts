import axios from 'axios';
import { io } from 'socket.io-client';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export const api = axios.create({
  baseURL: API_BASE_URL ? `${API_BASE_URL}/api` : '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

export const socket = io(API_BASE_URL || undefined, {
  transports: ['websocket', 'polling'],
  autoConnect: true
});
