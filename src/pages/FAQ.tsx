import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface FAQItem {
  q: string;
  a: string | React.ReactNode;
}

interface FAQSection {
  label: string;
  items: FAQItem[];
}

const sections: FAQSection[] = [
  {
    label: 'General',
    items: [
      {
        q: 'What is ReadToEarn?',
        a: 'ReadToEarn is a reading competition platform. You read books, take quizzes, and earn real money. Prize pools are funded by reader entry fees or authors who sponsor competitions. We keep our cut. You earn yours.',
      },
      {
        q: 'Who can join?',
        a: 'Anyone 13 and older. Users 13–17 must have verifiable parental consent at signup — parent email is verified and consent is logged with a timestamp. Gift cards only for under 18. Cash transfers (PayPal, Venmo, Wise) available for 18+.',
      },
      {
        q: 'What countries are supported?',
        a: 'We explicitly list which countries are eligible at signup so there\'s no surprise. See the country eligibility page for the full list.',
      },
      {
        q: 'Can I have more than one account?',
        a: 'No. One account per person. Accounts are verified by phone number and email. Multiple accounts result in a ban and forfeiture of earnings from fraudulent activity.',
      },
      {
        q: 'Is ReadToEarn free to join?',
        a: 'Yes. Creating an account is free. You only pay when you enter a reader-funded competition or purchase optional add-ons like Time Boosts. Daily Trivia, browsing books, and taking quizzes during active bounties are all free.',
      },
    ],
  },
  {
    label: 'Competitions',
    items: [
      {
        q: 'How do competitions work?',
        a: 'A book is announced. A quiz window opens. You take a 10-question quiz in 8 minutes or less. Your score and speed determine your rank. Top performers earn from the prize pool.',
      },
      {
        q: 'What are the different competition formats?',
        a: (
          <span>
            There are three formats:
            <br /><br />
            <strong>Sprint</strong> — Single quiz on one book. Score + speed determine rank. Fast and focused.
            <br /><br />
            <strong>Read-A-Thon</strong> — Multi-book event. Readers earn points across any eligible books on the platform. More books read = more points = higher rank.
            <br /><br />
            <strong>Elimination Bracket</strong> — Multi-round tournament. Readers advance by passing each round's quiz. Final round is a Master Quiz. Last reader standing wins.
          </span>
        ),
      },
      {
        q: 'Do I have to read the book during the competition?',
        a: 'No. Whether you read it last year or last week doesn\'t matter. The quiz is the only thing that counts. Prior knowledge is your advantage.',
      },
      {
        q: 'What if not enough people sign up?',
        a: 'Competitions have a pre-registration window (up to 4 weeks before launch). If demand is too low, the competition is canceled before anyone pays. If the minimum is met, the competition runs as planned and the prize pool is based on actual participants. No refunds are needed if it\'s canceled — pre-registration is always free.',
      },
      {
        q: 'What is pre-registration?',
        a: 'A free way to lock in your interest before a competition goes live. When the competition opens, pre-registrants are notified and get 48 hours to pay the entry fee before it launches to the general public.',
      },
      {
        q: 'Can the same book appear in multiple competitions?',
        a: 'The same book cannot appear in the same format within 90 days, but it can appear across different formats (e.g., Sprint and Read-A-Thon).',
      },
      {
        q: 'What happens if there\'s a tie?',
        a: 'Sprint: same score + same time → prize split equally. Read-A-Thon: same page count → that place\'s prize is split. Elimination finals: same Master Quiz score → first place is split.',
      },
      {
        q: 'When do I get paid?',
        a: 'There is a 24–48 hour review window after a competition closes. After review, winnings are released to your account for cashout.',
      },
    ],
  },
  {
    label: 'Quizzes',
    items: [
      {
        q: 'How long are quizzes?',
        a: '10 questions. 8-minute timer. Auto-submits when time runs out.',
      },
      {
        q: 'Why is the quiz locked on some books?',
        a: 'Quizzes are only active when a book is part of a live competition or has an active author bounty. When neither is running, the quiz is locked — but the book page stays live so you can browse, read the description, and save it for later. You can tap "Notify Me" to get an alert when that book enters a competition or bounty.',
      },
      {
        q: 'What if I had a technical problem during a quiz?',
        a: 'Technical failures are reviewed case-by-case within 72 hours. Contact support with details.',
      },
      {
        q: 'What if a quiz question is wrong?',
        a: 'Flag the question. Our team reviews it. If the dispute is valid, you receive a retroactive pass or credit.',
      },
      {
        q: 'Can I buy more time for a quiz?',
        a: 'Yes. Time Boosts add 2 extra minutes to a quiz. One boost per book. Single $0.99 | 6-pack $4.99 | 15-pack $9.99',
      },
      {
        q: 'Can I retake a quiz?',
        a: 'No. Each reader gets one attempt per book per competition or bounty window. This keeps the competition fair and results meaningful.',
      },
    ],
  },
  {
    label: 'Earning & Payouts',
    items: [
      {
        q: 'What is the minimum to cash out?',
        a: '$10 across all tiers and earning types.',
      },
      {
        q: 'How do I get paid?',
        a: 'PayPal, Venmo, Wise (for international users), or gift cards via Giftogram. Select your preferred method in your account settings.',
      },
      {
        q: 'What about taxes?',
        a: (
          <span>
            If you earn $500+ in a year, you\'ll be notified (in-app and via email) that we\'ll need your tax info (SSN for a 1099) before releasing further payouts past $600. Payout requests pause at $599 until we have your info — you can still earn in the meantime.
            <br /><br />
            Warning at $500: "To keep earning past $600, we\'ll need your tax info soon."
            <br />
            Warning at $550: Final reminder.
            <br /><br />
            If you do not provide your SSN, earnings over $600 will be forfeited after 180 days of inactivity on the tax info request.
          </span>
        ),
      },
      {
        q: 'What is Daily Trivia?',
        a: 'One book trivia question per day. Answer correctly = $0.10 in site credit. Site credit can be used for competition entry discounts, time boosts, and more. Not redeemable for cash or subscription fees.',
      },
      {
        q: 'What is a bounty and how do I earn from one?',
        a: 'An author funds a prize pool and sets a per-reader payout. When you pass that book\'s quiz during an active bounty, you earn the per-pass amount directly from the pool. No entry fee required — bounties are always free to readers. Payouts are released after a 24–48 hour review.',
      },
    ],
  },
  {
    label: 'For Authors',
    items: [
      {
        q: 'Do I have to pay to list my book?',
        a: 'Yes. Standard Listing starts at $7/book and gives your book a permanent home on the platform. Volume pricing is available for multiple titles.',
      },
      {
        q: 'What does a bounty mean?',
        a: 'You fund a pool and set a per-reader payout. We distribute to readers who pass your book\'s quiz. You only pay per verified pass. We keep 20%. Unused bounty funds can be refunded after one year.',
      },
      {
        q: 'What if I sponsor a competition — do readers pay too?',
        a: 'Author-sponsored competitions are free to readers. Entry fees only apply to reader-funded competitions. Hybrid competitions exist where the author funds the base pool and readers also pay entry fees.',
      },
      {
        q: 'Can I create my own quiz for my book?',
        a: 'Yes. When you purchase a Standard Listing, you can submit your own quiz questions for your book. This also grants us permission to use minimal text from your book where necessary for the quiz.',
      },
      {
        q: 'What other services do you offer authors?',
        a: (
          <span>
            Beyond standard listings and bounties, we offer:
            <br /><br />
            <strong>Quick Tasks</strong> — Pay readers to complete short tasks like leaving a review, following your author page, or sharing your book.
            <br /><br />
            <strong>Reader Feedback Surveys</strong> — Collect structured feedback from real readers on covers, blurbs, tropes, and more.
            <br /><br />
            <strong>Beta Readers</strong> — Get early manuscript feedback from readers matched to your genre.
            <br /><br />
            <strong>Sensitivity Readers</strong> — Have your manuscript reviewed by readers with lived experience in the identities or topics you\'re writing about.
            <br /><br />
            Visit the Authors page to explore all services.
          </span>
        ),
      },
      {
        q: 'How do I know my book is reaching the right readers?',
        a: 'Books are tagged by genre and trope. Readers browse and filter by what they already love. Your listing puts your book in front of readers who are actively looking for it — not a general audience.',
      },
    ],
  },
  {
    label: 'Subscriptions',
    items: [
      {
        q: 'What happens if I cancel mid-month?',
        a: 'Your subscriber benefits are honored through the end of your current billing period.',
      },
      {
        q: 'Can I use site credit toward my subscription?',
        a: 'No. Site credit from Daily Trivia is for entry discounts, time boosts, and future eligible purchases only — not subscription fees.',
      },
    ],
  },
  {
    label: 'User-Created Tournaments',
    items: [
      {
        q: 'Can I run my own tournament?',
        a: 'Yes. Any reader can create a public or private tournament. Set the book, format, and entry fee. Invite your community. Platform keeps 25%. Minimum 10 participants before a user-created tournament pays out.',
      },
    ],
  },
  {
    label: 'Account',
    items: [
      {
        q: 'What happens to my earnings if my account is banned?',
        a: 'Earnings from flagged or fraudulent activity are forfeited. Legitimate earnings made prior to the ban are reviewed and paid out after 30 days.',
      },
      {
        q: 'How do I delete my account?',
        a: 'You can request account deletion from your Account Settings page. Any pending earnings will be reviewed and paid out within 30 days if eligible. Deleted accounts cannot be recovered.',
      },
    ],
  },
];

function FAQAccordion({ item }: { item: FAQItem }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-[#e8e0d5] dark:border-gray-700 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-4 py-4 text-left"
      >
        <span className="font-medium text-[#1B2A4A] dark:text-[#F5F0E8] text-sm leading-snug">
          {item.q}
        </span>
        {open
          ? <ChevronUp size={16} className="text-[#D4A843] shrink-0" />
          : <ChevronDown size={16} className="text-[#6B7280] shrink-0" />}
      </button>
      {open && (
        <div className="pb-4 text-sm text-[#6B7280] dark:text-gray-400 leading-relaxed">
          {item.a}
        </div>
      )}
    </div>
  );
}

export function FAQ() {
  const [activeSection, setActiveSection] = useState('General');

  return (
    <div className="min-h-screen bg-[#F5F0E8] dark:bg-[#1B2A4A]">
      <div className="max-w-3xl mx-auto px-4 py-12">

        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-[#1B2A4A] dark:text-[#F5F0E8]">
            Questions? We've Got Answers.
          </h1>
        </div>

        {/* Section tabs */}
        <div className="flex flex-wrap gap-2 mb-8 justify-center">
          {sections.map((s) => (
            <button
              key={s.label}
              onClick={() => setActiveSection(s.label)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                activeSection === s.label
                  ? 'bg-[#D4A843] text-[#1B2A4A]'
                  : 'bg-white dark:bg-gray-800 text-[#6B7280] dark:text-gray-400 border border-[#e8e0d5] dark:border-gray-700 hover:border-[#D4A843]'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* FAQ list */}
        {sections
          .filter((s) => s.label === activeSection)
          .map((s) => (
            <div
              key={s.label}
              className="bg-white dark:bg-gray-800 rounded-2xl border border-[#e8e0d5] dark:border-gray-700 px-6"
            >
              {s.items.map((item, i) => (
                <FAQAccordion key={i} item={item} />
              ))}
            </div>
          ))}
      </div>
    </div>
  );
}
