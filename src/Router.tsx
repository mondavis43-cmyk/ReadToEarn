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
import { AdminFraudDashboard } from '../pages/admin/AdminFraudDashboard';
import { BookPage } from '../pages/BookPage';
import { Waitlist } from '../pages/Waitlist';
import { ResetPassword } from '../pages/ResetPassword';
import { RequestBook } from '../pages/RequestBook';
import { Refer } from '../pages/Refer';
import { Authors } from '../pages/Authors';
import { AuthorDashboard } from '../pages/AuthorDashboard';
import { AuthorSubmit } from '../pages/AuthorSubmit';
import { AuthorBounty } from '../pages/AuthorBounty';
import { AuthorCompetition } from '../pages/AuthorCompetition';
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
import { Competitions } from '../pages/Competitions';
import { Earn } from '../pages/Earn';
import { AuthorAMA } from '../pages/AuthorAMA';
import { AMASession } from '../pages/AMASession';
import Checkout from '../pages/Checkout';
import { CompetitionDetail } from '../pages/CompetitionDetail';
import { TimeBoosts } from '../pages/TimeBoosts';
import { Leaderboard } from '../pages/Leaderboard';
import { AccountSettings } from '../pages/AccountSettings';
import { Tournaments } from '../pages/Tournaments';
import { TournamentDetail } from '../pages/TournamentDetail';
import { AMARequest } from '../pages/AMARequest';
import { AdminRoute } from './AdminRoute';

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
    route !== '/admin/fraud' &&
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
if (route === '/admin/fraud') return <AdminRoute><AdminFraudDashboard /></AdminRoute>;
if (route === '/reset-password') return <ResetPassword />;
if (route === '/terms') return <TermsOfService />;
if (route === '/privacy') return <PrivacyPolicy />;

if (route === '/ama') return <AuthorAMA />;
if (route === '/ama-request') return <AMARequest />;
if (route.startsWith('/ama/')) {
  const sessionId = route.replace('/ama/', '');
  return <AMASession sessionId={sessionId} />;
}

if (route === '/pricing') return <Pricing />;

if (WAITLIST_MODE && !user) return <Waitlist />;

if (!user && route === '/signup') return <Signup />;
if (!user) return <Login />;

// Dynamic routes — no NavBar
if (route.startsWith('/competition/')) {
  const competitionId = route.replace('/competition/', '');
  return <CompetitionDetail competitionId={competitionId} />;
}

if (route.startsWith('/tournament/')) {
  const tournamentId = route.replace('/tournament/', '');
  return <TournamentDetail tournamentId={tournamentId} />;
}

if (route === '/tournaments/create') return <Tournaments />;

const KNOWN_ROUTES = [
  '/',
  '/home',
  '/library',
  '/how-it-works',
  '/competitions',
  '/earn',
  '/pricing',
  '/profile',
  '/cashout',
  '/refer',
  '/request-book',
  '/authors',
  '/author-submit',
  '/author-bounty',
  '/author-competition',
  '/author-quick-tasks',
  '/author-survey',
  '/author-beta-readers',
  '/author-sensitivity-readers',
  '/bulletin-board',
  '/bulletin-submit',
  '/faq',
  '/checkout',
  '/time-boosts',
  '/leaderboard',
  '/account-settings',
  '/tournaments/create',
  '/ama-request',
  '/author-dashboard',
];

const isKnownRoute =
  KNOWN_ROUTES.includes(route) ||
  route.startsWith('/quiz/') ||
  route.startsWith('/book/') ||
  route.startsWith('/competition/') ||
  route.startsWith('/tournament/');

return (
  <>
    <NavBar />
    {(route === '/' || route === '/home') && <Home />}
    {route === '/library' && <Library />}
    {route === '/how-it-works' && <HowItWorks />}
    {route === '/competitions' && <Competitions />}
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
    {route === '/author-competition' && <AuthorCompetition />}
    {route === '/author-quick-tasks' && <AuthorQuickTasks />}
    {route === '/author-survey' && <AuthorSurvey />}
    {route === '/author-beta-readers' && <AuthorBetaReaders />}
    {route === '/author-sensitivity-readers' && <AuthorSensitivityReaders />}
    {route === '/time-boosts' && <TimeBoosts />}
    {route === '/leaderboard' && <Leaderboard />}
    {route === '/bulletin-board' && <BulletinBoard />}
    {route === '/bulletin-submit' && <BulletinSubmit />}
    {route === '/account-settings' && <AccountSettings />}
    {route === '/checkout' && <Checkout />}
    {route.startsWith('/quiz/') && (() => {
      const bookId = route.split('/')[2]?.split('?')[0];
      const params = new URLSearchParams(window.location.search);
      const competitionId = params.get('competition') ?? undefined;
      const competitionRound = params.get('round') ? Number(params.get('round')) : undefined;
      return <Quiz bookId={bookId} competitionId={competitionId} competitionRound={competitionRound} />;
    })()}
    {route.startsWith('/book/') && <BookPage />}
    {!isKnownRoute && <Home />}
  </>
);
};
