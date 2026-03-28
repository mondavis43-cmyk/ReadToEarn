import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Home } from '../pages/Home';
import { Login } from '../pages/Login';
import { Signup } from '../pages/Signup';
import { Quiz } from '../pages/Quiz';
import { Profile } from '../pages/Profile';
import { Cashout } from '../pages/Cashout';
import { Admin } from '../pages/Admin';
import { BookPage } from '../pages/BookPage';
import { Waitlist } from '../pages/Waitlist';
import { ResetPassword } from '../pages/ResetPassword';
import { RequestBook } from '../pages/RequestBook';
import { Refer } from '../pages/Refer';
import { Authors } from '../pages/Authors';
import { FAQ } from '../pages/FAQ';
import { NavBar } from '../components/NavBar';

const WAITLIST_MODE = true;

export const Router = () => {
  const { user, loading } = useAuth();
  const [route, setRoute] = useState(window.location.pathname);

  useEffect(() => {
    const handleRouteChange = () => setRoute(window.location.pathname);
    window.addEventListener('popstate', handleRouteChange);
    return () => window.removeEventListener('popstate', handleRouteChange);
  }, []);

  useEffect(() => {
    if (!loading && !user && route !== '/login' && route !== '/signup' && route !== '/admin' && route !== '/reset-password') {
      if (!WAITLIST_MODE) {
        window.history.pushState({}, '', '/login');
        setRoute('/login');
      }
    }
  }, [user, loading, route]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  // Always accessible, no NavBar
  if (route === '/admin') return <Admin />;
  if (route === '/reset-password') return <ResetPassword />;

  // Waitlist mode - no NavBar
  if (WAITLIST_MODE && !user) return <Waitlist />;

  // Auth pages - no NavBar
  if (!user && route === '/signup') return <Signup />;
  if (!user) return <Login />;

  // Authenticated routes - all get NavBar
  return (
    <>
      <NavBar />
      {route === '/profile' && <Profile />}
      {route === '/cashout' && <Cashout />}
      {route === '/refer' && <Refer />}
      {route === '/request-book' && <RequestBook />}
      {route === '/authors' && <Authors />}
      {route === '/faq' && <FAQ />}
      {route.startsWith('/quiz/') && <Quiz bookId={route.split('/')[2]} />}
      {route.startsWith('/book/') && <BookPage />}
      {![ '/profile', '/cashout', '/refer', '/request-book', '/authors', '/faq' ].includes(route) &&
        !route.startsWith('/quiz/') &&
        !route.startsWith('/book/') && <Home />}
    </>
  );
};

two things to note:

    NavBar moved here from App.tsx - this is the right place since it needs to know auth state and route context. you can clean up the NavBar import from App.tsx since it's no longer used there
    App.tsx - also remove the RequestBook, Refer, Authors, and FAQ imports from it since they're now imported here instead. your App.tsx should go back to just being:

import { AuthProvider } from './contexts/AuthContext';
import { Router } from './components/Router';

function App() {
  return (
    <AuthProvider>
      <Router />
    </AuthProvider>
  );
}

export default App;
