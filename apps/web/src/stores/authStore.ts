import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '../types';
import { TESTNET_PASSPHRASE } from '@pagajusto/shared';
import { postAuth, walletErrorMessage } from '../lib/authRequest';

export type LoginStage = 'preparing' | 'signing' | 'verifying';

// ─── Freighter API v6 — funciones individuales ────────────────────────────────
// Importación dinámica para evitar SSR issues
async function freighter() {
  return import('@stellar/freighter-api');
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isConnecting: boolean;
  publicKey: string | null;
  network: 'testnet' | 'unknown';

  connectWallet: () => Promise<string>;   // retorna publicKey
  signAndLogin: (publicKey: string, onStage?: (stage: LoginStage) => void) => Promise<void>;
  disconnectWallet: () => void;
  checkNetwork: () => Promise<void>;
  setUser: (user: User, token: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, _get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isConnecting: false,
      publicKey: null,
      network: 'unknown',

      // ── Paso 1: conectar wallet y obtener dirección ──────────────────────
      connectWallet: async () => {
        set({ isConnecting: true });
        try {
          const api = await freighter();

          // Verificar que Freighter esté instalado
          const { isConnected } = await api.isConnected();
          if (!isConnected) {
            throw new Error('Freighter no está instalado. Descárgalo en freighter.app');
          }

          // Solicitar acceso
          const access = await api.requestAccess();
          if (access.error) throw new Error(walletErrorMessage(access.error, 'No se autorizó el acceso a Freighter.'));

          // Obtener dirección pública (v6 usa getAddress, no getPublicKey)
          const { address, error } = await api.getAddress();
          if (error || !address) {
            throw new Error(walletErrorMessage(error, 'No se pudo obtener la dirección de la wallet'));
          }

          // Verificar red
          const networkDetails = await api.getNetworkDetails();
          const isTestnet = !networkDetails.error && networkDetails.networkPassphrase === TESTNET_PASSPHRASE;
          const network = isTestnet ? 'testnet' : 'unknown';
          if (!isTestnet) {
            set({ network: 'unknown' });
            throw new Error('Selecciona Testnet en Freighter y vuelve a conectar.');
          }

          set({ publicKey: address, network, isConnecting: false });
          return address;
        } catch (err) {
          set({ isConnecting: false });
          throw err;
        }
      },

      // ── Paso 2: firmar challenge y autenticar ────────────────────────────
      signAndLogin: async (publicKey: string, onStage) => {
        onStage?.('preparing');
        const api = await freighter();
        const details = await api.getNetworkDetails();
        const current = await api.getAddress();
        if (details.error || current.error || details.networkPassphrase !== TESTNET_PASSPHRASE || current.address !== publicKey)
          throw new Error('Verifica la wallet y selecciona Testnet en Freighter.');

        const { nonce, message } = await postAuth<{ nonce: string; message: string }>('challenge', { publicKey });
        if (typeof nonce !== 'string' || !/^[a-f0-9]{64}$/.test(nonce) || typeof message !== 'string' || !message) {
          throw new Error('No se pudo preparar la firma. Vuelve a intentarlo.');
        }

        onStage?.('signing');
        const signResult = await api.signMessage(message, {
          address: publicKey,
          networkPassphrase: TESTNET_PASSPHRASE,
        });

        const { signedMessage, error: signError } = signResult;

        if (signError || !signedMessage) {
          throw new Error(walletErrorMessage(signError, 'Firma cancelada o fallida'));
        }

        onStage?.('verifying');
        const { token, user } = await postAuth<{ token: string; user: User }>('verify', {
          publicKey, signature: signedMessage, nonce,
        });
        if (typeof token !== 'string' || !token || !user?.id || user.address !== publicKey) {
          throw new Error('No se pudo crear la sesión. Vuelve a intentarlo.');
        }
        set({ user, token, isAuthenticated: true, publicKey });
      },

      // ── Desconectar ──────────────────────────────────────────────────────
      disconnectWallet: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          publicKey: null,
          network: 'unknown',
        });
      },

      // ── Verificar red ────────────────────────────────────────────────────
      checkNetwork: async () => {
        try {
          const api = await freighter();
          const details = await api.getNetworkDetails();
          const isTestnet = !details.error && details.networkPassphrase === TESTNET_PASSPHRASE;
          const current = await api.getAddress();
          if (_get().isAuthenticated && current.address !== _get().publicKey) {
            _get().disconnectWallet();
            return;
          }
          set({ network: isTestnet ? 'testnet' : 'unknown' });
        } catch {
          set({ network: 'unknown' });
        }
      },

      setUser: (user, token) => {
        set({ user, token, isAuthenticated: true });
      },
    }),
    {
      name: 'pagajusto-auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        publicKey: state.publicKey,
        network: state.network,
      }),
    }
  )
);

export const useAuth = () => {
  const { user, token, isAuthenticated, isConnecting, publicKey, setUser, disconnectWallet } =
    useAuthStore();
  return { user, token, isAuthenticated, isConnecting, publicKey, setUser, disconnectWallet };
};

export const useNetwork = () => {
  const { network, checkNetwork } = useAuthStore();
  return { network, checkNetwork };
};
