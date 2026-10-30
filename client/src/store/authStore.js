import { create } from 'zustand';
import api from '../services/api';

const useAuthStore = create((set, get) => ({
  user: JSON.parse(localStorage.getItem('aicms_user') || 'null'),
  token: localStorage.getItem('aicms_token') || null,
  isLoading: false,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.post('/auth/login', { email, password });
      const { token, data: user } = data;
      localStorage.setItem('aicms_token', token);
      localStorage.setItem('aicms_user', JSON.stringify(user));
      set({ user, token, isLoading: false });
      return { success: true };
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed';
      set({ error: msg, isLoading: false });
      return { success: false, message: msg };
    }
  },

  logout: () => {
    localStorage.removeItem('aicms_token');
    localStorage.removeItem('aicms_user');
    set({ user: null, token: null });
  },

  updateUser: (user) => {
    localStorage.setItem('aicms_user', JSON.stringify(user));
    set({ user });
  },
}));

export default useAuthStore;

