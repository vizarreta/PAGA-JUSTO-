import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isConnecting: boolean;
  freighter: any;
  network: 'testnet' | 'mainnet';
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  login: (address: string, signature: string, message: string) => Promise<void>;
  checkNetwork: () => Promise<void>;
  switchNetwork: (network: 'testnet' | 'mainnet') => Promise<void>;
  setUser: (user: User, token: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, _get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isConnecting: false,
      freighter: null,
      network: 'testnet',

      connectWallet: async () => {
        set({ isConnecting: true });
        try {
          const FreighterApi = (await import('@stellar/freighter-api')).default;
          
          set({
            freighter: FreighterApi,
            network: 'testnet',
            isConnecting: false,
          });
        } catch (error) {
          console.error('Failed to connect wallet:', error);
          set({ isConnecting: false });
          throw error;
        }
      },

      disconnectWallet: () => {
        localStorage.removeItem('paga-justo-token');
        localStorage.removeItem('paga-justo-user');
        set({ user: null, token: null, isAuthenticated: false, freighter: null });
      },

      login: async (address: string, signature: string, message: string) => {
        try {
          const response = await fetch('/api/auth/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address, signature, message }),
          });
          
          if (!response.ok) throw new Error('Firma inválida');
          
          const { token, user } = await response.json();

          set({
            user,
            token,
            isAuthenticated: true,
          });

          localStorage.setItem('paga-justo-token', token);
          localStorage.setItem('paga-justo-user', JSON.stringify(user));
        } catch (error) {
          console.error('Login failed:', error);
          throw error;
        }
      },

      checkNetwork: async () => {
        set({ network: 'testnet' });
      },

      switchNetwork: async (_network: 'testnet' | 'mainnet') => {
        console.warn('Network switching not supported in MVP');
      },

      setUser: (user, token) => {
        set({ user, token, isAuthenticated: true });
        localStorage.setItem('paga-justo-token', token);
        localStorage.setItem('paga-justo-user', JSON.stringify(user));
      },
    }),
    {
      name: 'pagajusto-auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        network: state.network,
      }),
    }
  )
);

export const useFreighter = () => {
  const { freighter, network, connectWallet, switchNetwork, checkNetwork } = useAuthStore();
  return { freighter, network, connectWallet, switchNetwork, checkNetwork };
};

export const useAuth = () => {
  const { user, token, isAuthenticated, isConnecting, setUser, disconnectWallet } = useAuthStore();
  return { user, token, isAuthenticated, isConnecting, setUser, disconnectWallet };
};