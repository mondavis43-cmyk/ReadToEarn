import { AuthProvider } from './contexts/AuthContext';
import { Router } from './components/Router';
import { NavBar } from './components/NavBar';
import { RequestBook } from './pages/RequestBook';
import { Refer } from './pages/Refer';
import { Authors } from './pages/Authors';
import { FAQ } from './pages/FAQ';

function App() {
  return (
    <AuthProvider>
      <Router />
    </AuthProvider>
  );
}

export default App;
