import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Home } from '../pages/Home';
import { Library } from '../pages/Library';
import { Login } from '../pages/Login';
import { Signup } from '../pages/Signup';
import { Quiz } from '../pages/Quiz';
import { Profile } from '../pages/Profile';
import { Cashout } from '../pages/Cashout';
import { Admin } from '../pages/Admin';
import { AdminSubmissions } from '../pages/admin/AdminSubmissions';
import { AdminBookListings } from '../pages/admin/AdminBookListings';
import { BookPage } from '../pages/BookPage';
import { Waitlist } from '../pages/Waitlist';
import { ResetPassword } from '../pages/ResetPassword';
import { RequestBook } from '../pages/RequestBook';
import { Refer } from '../pages/Refer';
import { Authors } from '../pages/Authors';
import { AuthorDashboard } from '../pages/AuthorDashboard';
import { AuthorSubmit } from '../pages/AuthorSubmit';
import { AuthorBounty } from '../pages/AuthorBounty';
import { AuthorQuickTasks } from '../pages/AuthorQuickTasks';
import { AuthorSurvey } from '../pages/AuthorSurvey';
import { AuthorBetaReaders } from '../pages/AuthorBetaReaders';
import { AuthorSensitivityReaders } from '../pages/AuthorSensitivityReaders';
import { FAQ } from '../pages/FAQ';
import { Pricing } from '../pages/Pricing';
import { NavBar } from '../components/NavBar';
import { TermsOfService } from '../pages/TermsOfService';
import { PrivacyPolicy } from '../pages/PrivacyPolicy';
import { BulletinBoard } from '../pages/BulletinBoard';
import { BulletinSubmit } from '../pages/BulletinSubmit';
import { HowItWorks } from '../pages/HowItWorks';
import { Earn } from '../pages/Earn';
import { AuthorAMA } from '../pages/AuthorAMA';
import { AMASession } from '../pages/AMASession';
import { Checkout } from '../pages/Checkout';
import { AccountSettings } from '../pages/AccountSettings';
import { AMARequest } from '../pages/AMARequest';
import { AdminRoute } from './AdminRoute';
import { FEATURES } from '../config/features';
import QuickTasks from '../pages/QuickTasks';
import SurveyFeed from '../pages/SurveyFeed';
import BetaReaderPanel from '../pages/BetaReaderPanel';
import SensitivityReaderPanel from '../pages/SensitivityReaderPanel';
import { AdminFraudDashboard } from '../pages/admin/AdminFraudDashboard';
import { CheckoutSuccess } from '../pages/CheckoutSuccess';

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
    if (
      !loading &&
      !user &&
      route !== '/login' &&
      route !== '/signup' &&
      route !== '/admin' &&
      route !== '/admin/submissions' &&
      route !== '/admin/book-listings' &&
      route !== '/reset-password'
    ) {
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

  // Public routes — no NavBar, no auth required
  if (route === '/admin') return <AdminRoute><Admin /></AdminRoute>;
  if (route === '/admin/submissions') return <AdminRoute><AdminSubmissions /></AdminRoute>;
  if (route === '/admin/book-listings') return <AdminRoute><AdminBookListings /></AdminRoute>;
  if (route === '/reset-password') return <ResetPassword />;
  if (route === '/terms') return <TermsOfService />;
  if (route === '/privacy') return <PrivacyPolicy />;
  if (route === '/checkout-success') return <CheckoutSuccess />;

  if (route === '/ama') return <AuthorAMA />;
  if (route === '/ama-request') return <AMARequest />;
  if (route.startsWith('/ama/')) {
    const sessionId = route.replace('/ama/', '');
    return <AMASession sessionId={sessionId} />;
  }

  if (WAITLIST_MODE && !user) return <Waitlist />;

  if (!user && route === '/signup') return <Signup />;
  if (!user) return <Login />;

  // Checkout — no NavBar, requires auth
  if (route === '/checkout') return <Checkout />;

  // Dynamic routes — no NavBar
  if (route === '/admin/fraud-dashboard') return <AdminRoute><AdminFraudDashboard /></AdminRoute>;
  if (route === '/admin/book-listings') return <AdminRoute><AdminBookListings /></AdminRoute>;

  const KNOWN_ROUTES = [
    '/',
    '/home',
    '/library',
    '/how-it-works',
    '/earn',
    '/pricing',
    '/profile',
    '/cashout',
    '/refer',
    '/request-book',
    '/authors',
    '/author-submit',
    '/author-bounty',
    '/author-quick-tasks',
    '/author-survey',
    '/author-beta-readers',
    '/author-sensitivity-readers',
    '/bulletin-board',
    '/bulletin-submit',
    '/faq',
    '/checkout',
    '/checkout-success',
    '/account-settings',
    '/ama-request',
    '/author-dashboard',
    '/quick-tasks',
    '/surveys',
    '/beta-reader-panels',
    '/sensitivity-reader-panels',
  ];

  const isKnownRoute =
    KNOWN_ROUTES.includes(route) ||
    route.startsWith('/quiz/') ||
    route.startsWith('/book/');

  return (
    <>
      <NavBar />
      {(route === '/' || route === '/home') && <Home />}
      {route === '/library' && <Library />}
      {route === '/how-it-works' && <HowItWorks />}
      {route === '/earn' && <Earn />}
      {route === '/profile' && <Profile />}
      {route === '/cashout' && <Cashout />}
      {route === '/refer' && <Refer />}
      {route === '/request-book' && <RequestBook />}
      {route === '/faq' && <FAQ />}
      {route === '/authors' && <Authors />}
      {route === '/author-dashboard' && <AuthorDashboard />}
      {route === '/author-submit' && <AuthorSubmit />}
      {route === '/author-bounty' && <AuthorBounty />}
      {route === '/author-quick-tasks' && <AuthorQuickTasks />}
      {route === '/author-survey' && <AuthorSurvey />}
      {route === '/author-beta-readers' && <AuthorBetaReaders />}
      {route === '/author-sensitivity-readers' && <AuthorSensitivityReaders />}
      {route === '/bulletin-board' && <BulletinBoard />}
      {route === '/bulletin-submit' && <BulletinSubmit />}
      {route === '/account-settings' && <AccountSettings />}
      {route === '/quick-tasks' && <QuickTasks />}
      {route === '/surveys' && <SurveyFeed />}
      {route === '/beta-reader-panels' && <BetaReaderPanel />}
      {route === '/sensitivity-reader-panels' && <SensitivityReaderPanel />}
      {route === '/pricing' && <Pricing />}
      {route.startsWith('/quiz/') && <Quiz />}
      {route.startsWith('/book/') && <BookPage />}
      {!isKnownRoute && <Home />}
    </>
  );
};
