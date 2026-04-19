import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from '../hooks/useNavigate';
import { BookOpen, User, Gift, BookMarked, Pin, PenLine, HelpCircle, Tag, Menu, X } from 'lucide-react';
import { useState } from 'react';

const navLinks = [
  { label: 'Library', icon: BookOpen, page: '/' },
  { label: 'Pricing', icon: Tag, page: 'pricing' },
  { label: 'Profile', icon: User, page: 'profile' },
  { label: 'Bulletin Board', path: '/bulletin-board', icon: Pin },
  { label: 'Refer', icon: Gift, page: 'refer' },
  { label: 'Request a Book', icon: BookMarked, page: 'request-book' },
  { label: 'For Authors', icon: PenLine, page: 'authors' },
  { label: 'FAQ', icon: HelpCircle, page: 'faq' },
];

export const NavBar = () => {
  const { user } = useAuth();
  const { navigateTo } = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  if (!user) return null;

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0f0f0f] border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* Logo */}
          <button
            onClick={() => navigateTo('/')}
            className="font-serif text-white text-lg tracking-tight"
          >
            Read to Earn
          </button>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(({ label, icon: Icon, page }) => (
              <button
                key={page}
                onClick={() => navigateTo(page)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-md transition"
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden text-gray-400 hover:text-white transition"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile dropdown */}
        {menuOpen && (
          <div className="md:hidden border-t border-gray-800 bg-[#0f0f0f]">
            {navLinks.map(({ label, icon: Icon, page }) => (
              <button
                key={page}
                onClick={() => { navigateTo(page); setMenuOpen(false); }}
                className="flex items-center gap-3 w-full px-4 py-3 text-sm text-gray-400 hover:text-white hover:bg-white/5 transition"
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        )}
      </nav>
      <div className="h-14" />
    </>
  );
};
