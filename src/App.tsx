import { AuthProvider } from './contexts/AuthContext';
import { Router } from './components/Router';
import { TermsOfService } from './pages/TermsOfService';
import { PrivacyPolicy } from './pages/PrivacyPolicy';

// inside your routes:
<Route path="/terms" element={<TermsOfService />} />
<Route path="/privacy" element={<PrivacyPolicy />} />

function App() {
  return (
    <AuthProvider>
      <Router />
    </AuthProvider>
  );
}

export default App;
