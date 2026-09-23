import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { AuthProvider } from './components/AuthProvider';
import { Home } from './pages/Home';
import { CreateAgreement } from './pages/CreateAgreement';
import { AgreementDetail } from './pages/AgreementDetail';
import { MilestoneReview } from './pages/MilestoneReview';
import { Resolution } from './pages/Resolution';
import { Login } from './pages/Login';
import { useAuthStore } from './stores/authStore';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isConnecting } = useAuthStore();
  
  if (isConnecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-dark">
        <div className="animate-pulse-slow text-primary text-lg">Conectando wallet...</div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

export function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route path="/" element={<Home />} />
          <Route path="/create" element={<CreateAgreement />} />
          <Route path="/agreement/:id" element={<AgreementDetail />} />
          <Route path="/agreement/:id/milestone/:index" element={<MilestoneReview />} />
          <Route path="/agreement/:id/resolution" element={<Resolution />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}