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

export const Router = () => {
  const { user, loading } = useAuth();
  const [route, setRoute] = useState(window.location.pathname);

  useEffect(() => {
    const handleRouteChange = () => {
      setRoute(window.location.pathname);
    };

    window.addEventListener('popstate', handleRouteChange);
    return () => window.removeEventListener('popstate', handleRouteChange);
  }, []);

  useEffect(() => {
    if (!loading && !user && route !== '/login' && route !== '/signup' && route !== '/admin') {
      window.history.pushState({}, '', '/login');
      setRoute('/login');
    }
  }, [user, loading, route]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!user && route === '/signup') return <Signup />;
  if (!user) return <Login />;
  if (route === '/profile') return <Profile />;
  if (route === '/cashout') return <Cashout />;
  if (route === '/admin') return <Admin />;
  if (route.startsWith('/quiz/')) {
    const bookId = route.split('/')[2];
    return <Quiz bookId={bookId} />;
  }
  if (route.startsWith('/book/')) return <BookPage />;

  return <Home />;
};
