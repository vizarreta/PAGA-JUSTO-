import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { authApi } from '../services/api';
import { Wallet, Shield, Zap, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { formatAddress } from '../types';

export function Login() {
  const navigate = useNavigate();
  const { isAuthenticated, isConnecting, connectWallet, checkNetwork, network } = useAuthStore();
  const [step, setStep] = useState<'idle' | 'connecting' | 'challenge' | 'signing' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [challenge, setChallenge] = useState<{ nonce: string; message: string; expiresAt: string } | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const handleConnect = async () => {
    setStep('connecting');
    setError(null);
    try {
      await connectWallet();
      await checkNetwork();
      const { freighter } = useAuthStore.getState();
      const publicKey = await freighter.getPublicKey();
      const res = await authApi.challenge(publicKey);
      const nonce: string = res.data?.nonce ?? 'login';
      setChallenge({
        nonce,
        message: `PagaJusto login\nNonce: ${nonce}\nAddress: ${publicKey}`,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      });
      setStep('challenge');
    } catch (err) {
      setError('No se pudo conectar la wallet. Asegúrate de tener Freighter instalado.');
      setStep('error');
    }
  };

  const handleSign = async () => {
    const { freighter } = useAuthStore.getState();
    if (!freighter || !challenge) return;

    setStep('signing');
    try {
      const publicKey = await freighter.getPublicKey();
      const signedMessage = await freighter.signMessage(challenge.message, publicKey);
      
      // Verify with backend
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: publicKey,
          signature: signedMessage,
          message: challenge.message,
        }),
      });

      if (!response.ok) throw new Error('Firma inválida');
      
      const { token, user } = await response.json();
      
      // Store auth
      localStorage.setItem('pagajusto-auth', JSON.stringify({
        state: { user: { ...user, token }, isAuthenticated: true }
      }));
      
      setStep('success');
      setTimeout(() => navigate('/'), 1000);
    } catch (err) {
      setError('Error al verificar la firma');
      setStep('error');
    }
  };

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <svg className="w-8 h-8 text-primary" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="url(#grad)"/>
              <path d="M8 16 L14 22 L24 10" stroke="white" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
              <defs>
                <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#06b6d4"/>
                  <stop offset="100%" stopColor="#3b82f6"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-text-primary mb-2">Bienvenido a PagaJusto</h1>
          <p className="text-text-secondary">Conecta tu wallet para empezar a proteger tus pagos freelance</p>
        </div>

        <div className="card animate-in">
          {step === 'idle' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-bg-dark rounded-lg border border-border">
                <Wallet className="w-6 h-6 text-primary" />
                <div>
                  <p className="font-medium text-text-primary">Freighter Wallet</p>
                  <p className="text-sm text-text-muted">Extensión para navegador Stellar</p>
                </div>
              </div>
              
              <button
                onClick={handleConnect}
                disabled={isConnecting}
                className="btn-primary w-full py-3 text-lg"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Conectando...
                  </>
                ) : (
                  <>
                    <Wallet className="w-5 h-5" />
                    Conectar Freighter
                  </>
                )}
              </button>

              <p className="text-center text-sm text-text-muted">
                ¿No tienes Freighter?{' '}
                <a href="https://freighter.app" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  Instalar desde freighter.app
                </a>
              </p>
            </div>
          )}

          {step === 'challenge' && challenge && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-success/10 rounded-lg border border-success/20">
                <CheckCircle className="w-6 h-6 text-success" />
                <div>
                  <p className="font-medium text-text-primary">Wallet conectada</p>
                  <p className="text-sm text-text-secondary font-mono">{formatAddress(challenge.message.split('\n')[1])}</p>
                </div>
              </div>

              <div className="p-4 bg-bg-dark rounded-lg border border-border">
                <p className="text-sm text-text-muted mb-2">Firma este mensaje para autenticarte:</p>
                <pre className="text-xs text-text-secondary overflow-x-auto max-h-40 p-2 bg-bg-card rounded whitespace-pre-wrap">
                  {challenge.message}
                </pre>
              </div>

              <button
                onClick={handleSign}
                className="btn-primary w-full py-3"
              >
                <Zap className="w-5 h-5" />
                Firmar y entrar
              </button>
            </div>
          )}

          {step === 'signing' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
              <p className="text-text-secondary">Firmando mensaje en Freighter...</p>
            </div>
          )}

          {step === 'success' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-success" />
              </div>
              <p className="text-text-primary font-medium">¡Autenticación exitosa!</p>
              <p className="text-text-muted text-sm">Redirigiendo...</p>
            </div>
          )}

          {step === 'error' && (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <AlertCircle className="w-10 h-10 text-danger" />
              <p className="text-text-danger font-medium">Error</p>
              <p className="text-text-secondary">{error}</p>
              <button onClick={() => setStep('idle')} className="btn-outline">
                Volver a intentar
              </button>
            </div>
          )}

          {network !== 'testnet' && step !== 'idle' && (
            <div className="mt-4 p-3 bg-accent/10 border border-accent/20 rounded-lg">
              <p className="text-sm text-accent flex items-center justify-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <strong>Red incorrecta:</strong> PagaJusto MVP funciona en Stellar Testnet. 
                Cambia la red en Freighter o usa el botón de la barra de navegación.
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-text-muted">
            <Shield className="w-4 h-4 inline mr-1" />
            Tu trabajo vale. Tu pago se protege.
          </p>
        </div>
      </div>
    </div>
  );
}