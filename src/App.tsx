import { AuthProvider } from './contexts/AuthContext';
import { Router } from './components/Router';
import { Footer } from './components/Footer';
import { TermsOfService } from './pages/TermsOfService';
import { PrivacyPolicy } from './pages/PrivacyPolicy';

function App() {
  return (
    <AuthProvider>
      <div className="flex flex-col min-h-screen">
        <Router />
        <Footer />
      </div>
    </AuthProvider>
  );
}

export default App;
