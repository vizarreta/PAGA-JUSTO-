import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { Wallet, LogOut, Menu, X, Shield, Zap, HelpCircle } from 'lucide-react';
import { cn, formatAddress } from '../utils/helpers';
import * as React from 'react';

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, disconnectWallet, network } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const handleLogout = () => {
    disconnectWallet();
    navigate('/login');
  };

  const handleNetworkSwitch = async () => {
    const { switchNetwork } = useAuthStore.getState();
    const targetNetwork = network === 'testnet' ? 'mainnet' : 'testnet';
    try {
      await switchNetwork(targetNetwork);
    } catch (error) {
      console.error('Failed to switch network:', error);
    }
  };

  const navItems = [
    { path: '/', label: 'Mis Acuerdos', icon: Shield },
    { path: '/create', label: 'Crear Acuerdo', icon: Zap },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-bg-dark">
      <header className="border-b border-border bg-bg-card/80 backdrop-blur-sm sticky top-0 z-40">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" aria-label="Navegación principal">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-8">
              <Link to="/" className="flex items-center gap-2" aria-label="PagaJusto - Inicio">
                <svg className="w-8 h-8" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect width="32" height="32" rx="8" fill="url(#grad)"/>
                  <path d="M8 16 L14 22 L24 10" stroke="white" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
                  <defs>
                    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#06b6d4"/>
                      <stop offset="100%" stopColor="#3b82f6"/>
                    </linearGradient>
                  </defs>
                </svg>
                <span className="font-bold text-xl text-text-primary hidden sm:block">PagaJusto</span>
              </Link>

              <div className="hidden md:flex items-center gap-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path || 
                    (item.path !== '/' && location.pathname.startsWith(item.path));
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-text-secondary hover:text-text-primary hover:bg-bg-card-hover'
                      )}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleNetworkSwitch}
                className="btn-outline text-xs px-3 py-1.5"
                aria-label={`Red actual: ${network}. Click para cambiar.`}
              >
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-primary" />
                  {network === 'testnet' ? 'Testnet' : 'Mainnet'}
                </span>
              </button>

              {isAuthenticated && user && (
                <div className="relative">
                  <button
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className="btn-ghost p-2"
                    aria-expanded={mobileMenuOpen}
                    aria-haspopup="true"
                    aria-label="Menú de usuario"
                  >
                    <Wallet className="w-5 h-5" />
                  </button>

                  {mobileMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 card animate-in z-50 py-2">
                      <div className="px-4 py-3 border-b border-border">
                        <p className="text-xs text-text-muted truncate">{formatAddress(user.address)}</p>
                        <p className="text-sm font-medium text-text-primary mt-1">
                          {network === 'testnet' ? 'Stellar Testnet' : 'Stellar Mainnet'}
                        </p>
                      </div>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-danger hover:bg-danger/10"
                      >
                        <LogOut className="w-4 h-4" />
                        Cerrar sesión
                      </button>
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden btn-ghost p-2"
                aria-expanded={mobileMenuOpen}
                aria-label="Menú móvil"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {mobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-border animate-in">
              <div className="flex flex-col gap-2">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium',
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-text-secondary hover:text-text-primary hover:bg-bg-card-hover'
                      )}
                    >
                      <Icon className="w-5 h-5" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </nav>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <Outlet />
      </main>

      <footer className="border-t border-border bg-bg-card/50 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-text-muted">
            <p>PagaJusto — Acuerdos claros. Pagos por hitos.</p>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-primary" />
                Stellar Testnet · XLM de prueba
              </span>
              <a href="#" className="hover:text-primary transition-colors flex items-center gap-1">
                <HelpCircle className="w-4 h-4" />
                Documentación
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}