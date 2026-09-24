import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore, type LoginStage } from '../stores/authStore';
import { Wallet, Shield, Zap, CheckCircle, AlertCircle, Loader2, ExternalLink } from 'lucide-react';

export function Login() {
  const navigate = useNavigate();
  const { isAuthenticated, isConnecting, connectWallet, signAndLogin, checkNetwork, network, publicKey } =
    useAuthStore();
  const [step, setStep] = useState<'idle' | 'connecting' | 'challenge' | 'signing' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [loginStage, setLoginStage] = useState<LoginStage>('preparing');

  useEffect(() => {
    if (isAuthenticated) navigate('/');
  }, [isAuthenticated, navigate]);

  // Paso 1: conectar la wallet y obtener publicKey
  const handleConnect = async () => {
    setStep('connecting');
    setError(null);
    try {
      await connectWallet();
      await checkNetwork();
      setStep('challenge');
    } catch (err: any) {
      setError(err?.message ?? 'No se pudo conectar la wallet. Asegúrate de tener Freighter instalado.');
      setStep('error');
    }
  };

  // Paso 2: firmar el challenge y autenticarse
  const handleSign = async () => {
    const key = useAuthStore.getState().publicKey;
    if (!key) {
      setError('No se encontró la clave pública. Vuelve a conectar tu wallet.');
      setStep('error');
      return;
    }
    setStep('signing');
    setLoginStage('preparing');
    setError(null);
    try {
      await signAndLogin(key, setLoginStage);
      setStep('success');
      setTimeout(() => navigate('/'), 1000);
    } catch (err: any) {
      setError(err?.message ?? 'Error al verificar la firma. Intenta de nuevo.');
      setStep('error');
    }
  };

  const shortKey = publicKey ? `${publicKey.slice(0, 8)}...${publicKey.slice(-6)}` : '';

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-dark px-4">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <svg className="w-8 h-8" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="url(#grad)" />
              <path d="M8 16 L14 22 L24 10" stroke="white" strokeWidth="3" fill="none"
                strokeLinecap="round" strokeLinejoin="round" />
              <defs>
                <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#06b6d4" />
                  <stop offset="100%" stopColor="#3b82f6" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-text-primary mb-2">PagaJusto</h1>
          <p className="text-text-secondary">Tu trabajo vale. Tu pago se protege.</p>
          <Link to="/testnet-proof" className="inline-block text-primary underline mt-4">Ver la prueba ejecutada en Testnet</Link>
        </div>

        {/* Card */}
        <div className="card space-y-4">

          {/* Indicador Testnet */}
          <div className="flex items-center justify-center gap-2 text-xs font-medium text-primary bg-primary/10 rounded-lg py-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            Stellar Testnet — Solo XLM de prueba
          </div>

          {/* STEP: idle */}
          {step === 'idle' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-bg-dark rounded-lg border border-border">
                <Wallet className="w-6 h-6 text-primary shrink-0" />
                <div>
                  <p className="font-medium text-text-primary">Freighter Wallet</p>
                  <p className="text-sm text-text-muted">Extensión Stellar para Chrome / Brave</p>
                </div>
                <a
                  href="https://freighter.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto text-primary hover:text-primary/80"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>

              <button onClick={handleConnect} disabled={isConnecting} className="btn-primary w-full py-3 text-base">
                <Wallet className="w-5 h-5" />
                Conectar Freighter
              </button>
            </div>
          )}

          {/* STEP: connecting */}
          {step === 'connecting' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
              <p className="text-text-secondary">Conectando con Freighter...</p>
            </div>
          )}

          {/* STEP: challenge — wallet conectada, pide firma */}
          {step === 'challenge' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-success/10 rounded-lg border border-success/20">
                <CheckCircle className="w-5 h-5 text-success shrink-0" />
                <div>
                  <p className="font-medium text-text-primary">Wallet conectada</p>
                  <p className="text-sm font-mono text-text-muted">{shortKey}</p>
                </div>
              </div>

              {network !== 'testnet' && (
                <div className="flex items-start gap-2 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20 text-sm text-amber-400">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    <strong>Red incorrecta.</strong> Cambia a <strong>Testnet</strong> en Freighter antes de continuar.
                  </span>
                </div>
              )}

              <div className="p-4 bg-bg-dark rounded-lg border border-border text-sm text-text-muted">
                <p className="mb-1 font-medium text-text-secondary">¿Por qué firmar?</p>
                <p>La firma demuestra que eres el dueño de esta wallet sin revelar tu clave privada.</p>
              </div>

              <button
                onClick={handleSign}
                disabled={network !== 'testnet'}
                className="btn-primary w-full py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Zap className="w-5 h-5" />
                Firmar y entrar
              </button>
            </div>
          )}

          {/* STEP: signing */}
          {step === 'signing' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
              <p className="text-text-secondary" role="status">
                {loginStage === 'preparing' ? 'Preparando el inicio de sesión...' :
                  loginStage === 'signing' ? 'Esperando firma en Freighter...' : 'Verificando tu firma...'}
              </p>
              {loginStage === 'signing' && <p className="text-xs text-text-muted">Revisa la extensión en tu navegador</p>}
            </div>
          )}

          {/* STEP: success */}
          {step === 'success' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-success" />
              </div>
              <p className="text-text-primary font-semibold text-lg">¡Autenticación exitosa!</p>
              <p className="text-text-muted text-sm">Redirigiendo...</p>
            </div>
          )}

          {/* STEP: error */}
          {step === 'error' && (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <AlertCircle className="w-10 h-10 text-red-400" />
              <div>
                <p className="font-medium text-text-primary mb-1">No se pudo iniciar sesión</p>
                <p className="text-sm text-text-secondary" role="alert">{error}</p>
              </div>
              {publicKey && network === 'testnet' && (
                <button onClick={handleSign} className="btn-primary">Reintentar firma</button>
              )}
              <button onClick={() => { setStep('idle'); setError(null); }} className="btn-outline">
                {publicKey ? 'Volver a conectar wallet' : 'Volver a intentar'}
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-text-muted mt-6 flex items-center justify-center gap-1">
          <Shield className="w-3 h-3" />
          Construido sobre Stellar · Solo Testnet · Sin dinero real
        </p>
      </div>
    </div>
  );
}
