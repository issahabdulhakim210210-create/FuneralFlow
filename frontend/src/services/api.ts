import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
const baseURL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000/api';
export const api = axios.create({ baseURL, timeout: 30000 });
api.interceptors.request.use(async config => { const token = await AsyncStorage.getItem('token'); if(token) config.headers.Authorization = `Bearer ${token}`; return config; });
api.interceptors.response.use(r => r, e => Promise.reject(e.response?.data || e));
