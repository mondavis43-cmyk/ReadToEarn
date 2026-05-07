import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { NotificationBell } from './NotificationBell';
import {
Home, BookOpen, Trophy, Users, User,
ChevronDown, Menu, X, Zap, DollarSign,
BarChart2, Gift, MessageSquare, Settings, LogOut,
FileText, BookMarked, Eye
} from 'lucide-react';

const navigate = (path: string) => {
window.history.pushState({}, '', path);
window.dispatchEvent(new PopStateEvent('popstate'));
};

type NavGroup = {
label: string;
icon: React.ReactNode;
items: { label: string; path: string; icon: React.ReactNode }[];
};

const NAV_GROUPS: NavGroup[] = [
{
  label: 'Earn',
  icon: <DollarSign size={16} />,
  items: [
    { label: 'How It Works', path: '/how-it-works', icon: <MessageSquare size={15} /> },
    { label: 'Ways to Earn', path: '/earn', icon: <DollarSign size={15} /> },
    { label: 'Library', path: '/library', icon: <BookOpen size={15} /> },
    { label: 'Sprints', path: '/sprints', icon: <Zap size={15} /> },
    { label: 'Readathon', path: '/readathon', icon: <BookOpen size={15} /> },
    { label: 'Elimination', path: '/elimination', icon: <Trophy size={15} /> },
    { label: 'Leaderboard', path: '/leaderboard', icon: <BarChart2 size={15} /> },
    { label: 'Time Boosts', path: '/time-boosts', icon: <Zap size={15} /> },
    { label: 'Quick Tasks', path: '/quick-tasks', icon: <Users size={15} /> },
    { label: 'Author Surveys', path: '/surveys', icon: <FileText size={15} /> },
    { label: 'Beta Reader Panels', path: '/beta-reader-panels', icon: <BookMarked size={15} /> },
    { label: 'Sensitivity Reader Panels', path: '/sensitivity-reader-panels', icon: <Eye size={15} /> },
  ],
},
{
  label: 'Authors',
  icon: <Users size={16} />,
  items: [
    { label: 'Author Hub', path: '/authors', icon: <Users size={15} /> },
    { label: 'Dashboard', path: '/author-dashboard', icon: <BarChart2 size={15} /> },
    { label: 'Submit Book', path: '/author-submit', icon: <BookOpen size={15} /> },
    { label: 'Post Bounty', path: '/author-bounty', icon: <DollarSign size={15} /> },
    { label: 'Competition', path: '/author-competition', icon: <Trophy size={15} /> },
    { label: 'Quick Tasks', path: '/author-quick-tasks', icon: <Zap size={15} /> },
    { label: 'Survey', path: '/author-survey', icon: <MessageSquare size={15} /> },
    { label: 'Beta Readers', path: '/author-beta-readers', icon: <Users size={15} /> },
    { label: 'Sensitivity Readers', path: '/author-sensitivity-readers', icon: <Users size={15} /> },
  ],
},
{
  label: 'Community',
  icon: <MessageSquare size={16} />,
  items: [
    { label: 'Bulletin Board', path: '/bulletin-board', icon: <MessageSquare size={15} /> },
    { label: 'AMA Sessions', path: '/ama', icon: <MessageSquare size={15} /> },
    { label: 'Refer & Earn', path: '/refer', icon: <Gift size={15} /> },
    { label: 'Request a Book', path: '/request-book', icon: <BookOpen size={15} /> },
    { label: 'FAQ', path: '/faq', icon: <MessageSquare size={15} /> },
  ],
},
];

const ACCOUNT_ITEMS = [
{ label: 'Profile', path: '/profile', icon: <User size={15} /> },
{ label: 'Cashout', path: '/cashout', icon: <DollarSign size={15} /> },
{ label: 'Account Settings', path: '/account-settings', icon: <Settings size={15} /> },
{ label: 'Tournaments', path: '/tournaments/create', icon: <Trophy size={15} /> },
];

export const NavBar = () => {
const { user, signOut } = useAuth();
const [openGroup, setOpenGroup] = useState<string | null>(null);
const [mobileOpen, setMobileOpen] = useState(false);
const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);
const navRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  const handler = (e: MouseEvent) => {
    if (navRef.current && !navRef.current.contains(e.target as Node)) {
      setOpenGroup(null);
    }
  };
  document.addEventListener('mousedown', handler);
  return () => document.removeEventListener('mousedown', handler);
}, []);

useEffect(() => {
  const handler = () => setMobileOpen(false);
  window.addEventListener('popstate', handler);
  return () => window.removeEventListener('popstate', handler);
}, []);

const handleNav = (path: string) => {
  navigate(path);
  setOpenGroup(null);
  setMobileOpen(false);
};

const currentPath = window.location.pathname;

return (
  <>
    <nav
      ref={navRef}
      className="hidden md:flex fixed top-0 left-0 right-0 z-50 items-center justify-between px-6 h-14 bg-[#1B2A4A]/95 backdrop-blur-sm border-b border-white/10"
    >
      <button
        onClick={() => handleNav('/')}
        className="text-[#D4A843] font-bold text-lg tracking-tight hover:opacity-80 transition"
      >
        ReadToEarn
      </button>

      <div className="flex items-center gap-1">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="relative">
            <button
              onClick={() => setOpenGroup(openGroup === group.label ? null : group.label)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition
                ${openGroup === group.label
                  ? 'bg-white/10 text-white'
                  : 'text-white/70 hover:text-white hover:bg-white/5'
                }`}
            >
              {group.icon}
              {group.label}
              <ChevronDown
                size={13}
                className={`transition-transform duration-200 ${openGroup === group.label ? 'rotate-180' : ''}`}
              />
            </button>

            {openGroup === group.label && (
              <div className="absolute top-full left-0 mt-1.5 w-52 bg-[#1B2A4A] border border-white/10 rounded-xl shadow-xl overflow-hidden z-50">
                {group.items.map((item) => (
                  <button
                    key={item.path}
                    onClick={() => handleNav(item.path)}
                    className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition
                      ${currentPath === item.path
                        ? 'bg-[#D4A843]/15 text-[#D4A843]'
                        : 'text-white/70 hover:bg-white/5 hover:text-white'
                      }`}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <NotificationBell userId={user?.id ?? null} />
      
      <div className="relative">
        <button
          onClick={() => setOpenGroup(openGroup === 'account' ? null : 'account')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition
            ${openGroup === 'account'
              ? 'bg-white/10 text-white'
              : 'text-white/70 hover:text-white hover:bg-white/5'
            }`}
        >
          <User size={16} />
          Account
          <ChevronDown
            size={13}
            className={`transition-transform duration-200 ${openGroup === 'account' ? 'rotate-180' : ''}`}
          />
        </button>

        {openGroup === 'account' && (
          <div className="absolute top-full right-0 mt-1.5 w-52 bg-[#1B2A4A] border border-white/10 rounded-xl shadow-xl overflow-hidden z-50">
            {ACCOUNT_ITEMS.map((item) => (
              <button
                key={item.path}
                onClick={() => handleNav(item.path)}
                className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition
                  ${currentPath === item.path
                    ? 'bg-[#D4A843]/15 text-[#D4A843]'
                    : 'text-white/70 hover:bg-white/5 hover:text-white'
                  }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
            <div className="border-t border-white/10">
              <button
                onClick={() => { signOut(); setOpenGroup(null); }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-400 hover:bg-white/5 transition"
              >
                <LogOut size={15} />
                Sign Out
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>

    <nav className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 h-14 bg-[#1B2A4A]/95 backdrop-blur-sm border-b border-white/10">
      <button
        onClick={() => handleNav('/')}
        className="text-[#D4A843] font-bold text-base tracking-tight"
      >
        ReadToEarn
      </button>

<div className="flex items-center gap-2">
    <NotificationBell userId={user?.id ?? null} />
    <button
      onClick={() => setMobileOpen(!mobileOpen)}
      className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/5 transition"
    >
      {mobileOpen ? <X size={20} /> : <Menu size={20} />}
    </button>
  </div>

</nav>
      
    {mobileOpen && (
      <div className="md:hidden fixed inset-0 z-40 pt-14">
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />

        <div className="relative h-full w-72 bg-[#1B2A4A] border-r border-white/10 overflow-y-auto">
          <div className="p-3 space-y-1">

            <button
              onClick={() => handleNav('/')}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-white/70 hover:text-white hover:bg-white/5 transition"
            >
              <Home size={15} />
              Home
            </button>

            {NAV_GROUPS.map((group) => (
              <div key={group.label}>
                <button
                  onClick={() => setMobileExpanded(mobileExpanded === group.label ? null : group.label)}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-white/80 hover:bg-white/5 transition"
                >
                  <span className="flex items-center gap-2.5">
                    {group.icon}
                    {group.label}
                  </span>
                  <ChevronDown
                    size={13}
                    className={`transition-transform duration-200 ${mobileExpanded === group.label ? 'rotate-180' : ''}`}
                  />
                </button>

                {mobileExpanded === group.label && (
                  <div className="ml-4 mt-0.5 space-y-0.5 border-l border-white/10 pl-3">
                    {group.items.map((item) => (
                      <button
                        key={item.path}
                        onClick={() => handleNav(item.path)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition
                          ${currentPath === item.path
                            ? 'text-[#D4A843] bg-[#D4A843]/10'
                            : 'text-white/60 hover:text-white hover:bg-white/5'
                          }`}
                      >
                        {item.icon}
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            <div className="border-t border-white/10 pt-2 mt-2">
              <p className="px-3 py-1 text-xs text-white/30 uppercase tracking-wider">Account</p>
              {ACCOUNT_ITEMS.map((item) => (
                <button
                  key={item.path}
                  onClick={() => handleNav(item.path)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition
                    ${currentPath === item.path
                      ? 'text-[#D4A843] bg-[#D4A843]/10'
                      : 'text-white/70 hover:text-white hover:bg-white/5'
                    }`}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
              <button
                onClick={() => { signOut(); setMobileOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-red-400 hover:bg-white/5 transition"
              >
                <LogOut size={15} />
                Sign Out
              </button>
            </div>

          </div>
        </div>
      </div>
    )}

    <div className="h-14" />
  </>
);
};
