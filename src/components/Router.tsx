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
import { AuthorSubmit } from '../pages/AuthorSubmit';
import { AuthorBounty } from '../pages/AuthorBounty';
import { AuthorCompetition } from '../pages/AuthorCompetition';
import { AuthorQuickTasks } from '../pages/AuthorQuickTasks';
import { AuthorSurvey } from '../pages/AuthorSurvey';
import { AuthorBetaReaders } from '../pages/AuthorBetaReaders';
import { FAQ } from '../pages/FAQ';
import { Pricing } from '../pages/Pricing';
import { NavBar } from '../components/NavBar';
import { TermsOfService } from '../pages/TermsOfService';
import { PrivacyPolicy } from '../pages/PrivacyPolicy';
import { BulletinBoard } from '../pages/BulletinBoard';
import { BulletinSubmit } from '../pages/BulletinSubmit';

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
    // Added bulletin routes to the "allowed" list for unauthenticated/reset checks if needed
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

  if (route === '/admin') return <Admin />;
  if (route === '/reset-password') return <ResetPassword />;
  if (route === '/terms') return <TermsOfService />;
  if (route === '/privacy') return <PrivacyPolicy />;

  if (WAITLIST_MODE && !user) return <Waitlist />;

  if (!user && route === '/signup') return <Signup />;
  if (!user) return <Login />;

  return (
    <>
      <NavBar />
      {route === '/pricing' && <Pricing />}
      {route === '/profile' && <Profile />}
      {route === '/cashout' && <Cashout />}
      {route === '/refer' && <Refer />}
      {route === '/request-book' && <RequestBook />}
      {route === '/authors' && <Authors />}
      {route === '/author-submit' && <AuthorSubmit />}
      {route === '/bulletin-board' && <BulletinBoard />}
      {route === '/bulletin-submit' && <BulletinSubmit />}
      {route === '/faq' && <FAQ />}
      {route.startsWith('/quiz/') && <Quiz bookId={route.split('/')[2]} />}
      {route.startsWith('/book/') && <BookPage />}
      
      {/* Updated the exclusion list to include bulletin routes. 
          If the route doesn't match any of these, show Home.
      */}
      {![ 
        '/pricing', 
        '/profile', 
        '/cashout', 
        '/refer', 
        '/request-book', 
        '/authors', 
        '/faq', 
        '/author-submit',
        '/author-bounty',
        '/author-competition',
        '/author-quick-tasks',
        '/author-survey',
        '/author-beta-readers',
        '/author-sensitivity-readers',
        '/bulletin-board',
        '/bulletin-submit'
      ].includes(route) &&
      !route.startsWith('/quiz/') &&
      !route.startsWith('/book/') && <Home />}
    </>
  );
};
