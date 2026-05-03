import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from '../hooks/useNavigate';
import { useTheme } from '../contexts/ThemeContext';
import { ArrowLeft, Sun, Moon } from 'lucide-react';

import { AdminBooks }           from './admin/AdminBooks';
import { AdminBounties }        from './admin/AdminBounties';
import { AdminCompetitions }    from './admin/AdminCompetitions';
import { AdminPayouts }         from './admin/AdminPayouts';
import { AdminWaitlist }        from './admin/AdminWaitlist';
import { AdminTropes }          from './admin/AdminTropes';
import { AdminReports }         from './admin/AdminReports';
import { AdminTrivia }          from './admin/AdminTrivia';
import { AdminTournaments }     from './admin/AdminTournaments';
import { AdminEarning }         from './admin/AdminEarning';
import { AdminAMA }             from './admin/AdminAMA';
import { AdminSubmissions }     from './admin/AdminSubmissions';
import { AdminSponsoredPins }   from './admin/AdminSponsoredPins';
import { AdminGiveaway }        from './admin/AdminGiveaway';
import { AdminFraudDashboard }  from './admin/AdminFraudDashboard';
import { AdminReadathon }       from './admin/AdminReadathon';

export const GENRES = [
'Action & Adventure', 'Biography & Memoir', 'Business', "Children's", 'Chick Lit',
'Comics / Graphic Novels / Manga', 'Cozy Mystery', 'Dark Romance', 'Dystopian', 'Erotica',
'Fantasy', 'Fiction', 'Gothic', 'Health & Wellness', 'Historical Fiction', 'History',
'Horror', 'LGBTQIA+', 'Literary Fiction', 'Magical Realism', 'Mystery', 'Noir',
'Non-Fiction', 'Paranormal', 'Poetry', 'Religious', 'Romance', 'Romantasy / Romantic Fantasy',
'Satire', 'Science Fiction', 'Self-Help', 'Short Stories', 'Space Opera', 'Sports',
'Spy', 'Suspense', 'Thriller', 'True Crime', 'War & Military', 'Western', "Women's Fiction", 'Young Adult',
];

const ADMIN_EMAIL = 'mondavis43@gmail.com';

type Tab =
| 'books'
| 'bounties'
| 'competitions'
| 'payouts'
| 'waitlist'
| 'tropes'
| 'reports'
| 'trivia'
| 'tournaments'
| 'earning'
| 'ama'
| 'submissions'
| 'giveaway'
| 'sponsored_pins'
| 'readathon'
| 'fraud';

const TABS: { key: Tab; label: string }[] = [
{ key: 'books',          label: 'Books & Questions' },
{ key: 'bounties',       label: 'Bounties'          },
{ key: 'competitions',   label: 'Competitions'      },
{ key: 'readathon',      label: 'Readathons'        },
{ key: 'payouts',        label: 'Payouts'           },
{ key: 'reports',        label: 'Reports'           },
{ key: 'trivia',         label: 'Daily Trivia'      },
{ key: 'tournaments',    label: 'Tournaments'       },
{ key: 'earning',        label: 'Earning Tasks'     },
{ key: 'submissions',    label: 'Submissions'       },
{ key: 'sponsored_pins', label: 'Sponsored Pins'    },
{ key: 'waitlist',       label: 'Waitlist'          },
{ key: 'tropes',         label: 'Tropes'            },
{ key: 'giveaway',       label: 'Giveaway'          },
{ key: 'ama',            label: 'AMA'               },
{ key: 'fraud',          label: '🚨 Fraud'          },
];

export function Admin() {
const { user }               = useAuth();
const { navigateTo }         = useNavigate();
const { theme, toggleTheme } = useTheme();
const [activeTab, setActiveTab] = useState<Tab>('books');

useEffect(() => {
  if (user && user.email !== ADMIN_EMAIL) navigateTo('/');
}, [user]);

if (!user || user.email !== ADMIN_EMAIL) return null;

const isDark = theme === 'dark';

return (
  <div className="min-h-screen bg-[#F5F0E8] dark:bg-gray-900 pb-16">

    {/* Header */}
    <div className="bg-white dark:bg-gray-800 border-b border-[#e8e0d5] dark:border-gray-700 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigateTo('/')}
          className="text-[#6B7280] hover:text-[#1B2A4A] dark:hover:text-[#F5F0E8]"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-semibold text-[#1B2A4A] dark:text-[#F5F0E8]">
          Admin Panel
        </h1>
      </div>
      <button
        onClick={toggleTheme}
        className="text-[#6B7280] hover:text-[#1B2A4A] dark:hover:text-[#F5F0E8]"
      >
        {isDark ? <Sun size={20} /> : <Moon size={20} />}
      </button>
    </div>

    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

      {/* Tab nav */}
      <div className="flex flex-wrap gap-2">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === key
                ? 'bg-[#1B2A4A] text-white dark:text-[#1B2A4A] dark:bg-[#D4A843]'
                : 'bg-white dark:bg-gray-800 text-[#6B7280] dark:text-gray-400 hover:text-[#1B2A4A] dark:hover:text-[#F5F0E8]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Active tab content */}
      {activeTab === 'books'          && <AdminBooks />}
      {activeTab === 'bounties'       && <AdminBounties />}
      {activeTab === 'competitions'   && <AdminCompetitions />}
      {activeTab === 'readathon'      && <AdminReadathon />}
      {activeTab === 'payouts'        && <AdminPayouts />}
      {activeTab === 'waitlist'       && <AdminWaitlist />}
      {activeTab === 'tropes'         && <AdminTropes />}
      {activeTab === 'reports'        && <AdminReports />}
      {activeTab === 'trivia'         && <AdminTrivia />}
      {activeTab === 'tournaments'    && <AdminTournaments />}
      {activeTab === 'earning'        && <AdminEarning />}
      {activeTab === 'ama'            && <AdminAMA />}
      {activeTab === 'submissions'    && <AdminSubmissions />}
      {activeTab === 'sponsored_pins' && <AdminSponsoredPins />}
      {activeTab === 'giveaway'       && <AdminGiveaway />}
      {activeTab === 'fraud'          && <AdminFraudDashboard />}

    </div>
  </div>
);
}