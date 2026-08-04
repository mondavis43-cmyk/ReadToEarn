import { useState } from 'react';
import { FEATURES } from '../config/features';
import type { ReactNode } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface FAQItem {
  q: string;
  a: string | ReactNode;
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
        a: 'ReadToEarn is a reader research marketplace. Authors pay for reader feedback — quick tasks, surveys, beta panels, sensitivity reads, and quiz-pass bounties. Readers earn real money by sharing their opinions and proving they read. No entry fees, no competitions.',
      },
      {
        q: 'Who can join?',
        a: 'Anyone 13 and older. Users 13–17 must have verifiable parental consent at signup. Parent email consent is verified through phone. Gift cards only for under 18. Cash transfers (PayPal and Wise) available for 18+.',
      },
      {
        q: 'What countries are supported?',
        a: 'Argentina, Australia, Austria, Bangladesh, Belgium, Bolivia, Brazil, Bulgaria, Canada, Chile, Colombia, Costa Rica, Croatia, Cyprus, Czech Republic, Denmark, Ecuador, Egypt, Estonia, Finland, France, Georgia, Germany, Ghana, Greece, Hong Kong, Hungary, India, Indonesia, Ireland, Israel, Italy, Japan, Kenya, Latvia, Lithuania, Luxembourg, Malaysia, Malta, Mexico, Morocco, Nepal, Netherlands, New Zealand, Nigeria, Norway, Pakistan, Peru, Philippines, Poland, Portugal, Romania, Singapore, Slovakia, Slovenia, South Africa, South Korea, Spain, Sri Lanka, Sweden, Switzerland, Tanzania, Thailand, Turkey, Uganda, Ukraine, United Arab Emirates, United Kingdom, United States, Uruguay, Vietnam, Zimbabwe.',
      },
      {
        q: 'Can I have more than one account?',
        a: 'No. One account per person. Accounts are verified by phone number and email. Multiple accounts result in a ban and forfeiture of earnings from fraudulent activity.',
      },
      {
        q: 'Is ReadToEarn free to join?',
        a: "Yes. Creating an account is free. You only pay for an optional subscription ($4.99/mo) that unlocks ad-free browsing, priority access to limited-earning opportunities, and monthly subscriber bonus draws. Taking quizzes, earning from bounties, surveys, quick tasks, beta and sensitivity reader panels are all free to readers.",
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
        q: 'Why take a quiz?',
        a: 'Quizzes are the way readers prove they read a book. When a book has an active bounty, passing the quiz earns you a cash payout. Even without a bounty, the quiz is available for fun — browse the library, read, and test your knowledge.',
      },
      {
        q: 'What if I had a technical problem during a quiz?',
        a: 'Technical failures are reviewed case-by-case within 72 hours. Contact info@joinreadtoearn.com with details to open a review.',
      },
      {
        q: 'What if a quiz question is wrong?',
        a: 'Flag the question. Our team reviews it. If the dispute is valid, you receive a retroactive pass or credit.',
      },
      {
        q: 'Can I retake a quiz and still earn?',
        a: 'No. Each reader gets one attempt per book. If you already took the quiz, you cannot earn from that book again. Make your attempt count.',
      },
    ],
  },
  {
    label: 'Bounties',
    items: [
      {
        q: 'What is a bounty?',
        a: 'An author funds a prize pool and sets a per-reader payout. When you pass that book\'s quiz during an active bounty, you earn the per-pass amount directly from the pool. No entry fee required — bounties are always free to readers.',
      },
      {
        q: 'How do I find books with active bounties?',
        a: 'Books with active bounties show a "$X/pass" badge in the library. Simply browse, pick one, read the book, and take the quiz.',
      },
      {
        q: 'What happens when the pool runs out?',
        a: 'The bounty ends and the book returns to fun-quiz-only mode. The author can fund a new pool at any time.',
      },
      {
        q: 'Can I earn from a quiz if there\'s no bounty?',
        a: 'No — without an active bounty, the quiz is just for fun. You can still take it to test your knowledge, but no payout is available.',
      },
    ],
  },
  {
    label: 'Earning & Payouts',
    items: [
      {
        q: 'What is the minimum to cash out?',
        a: '$10 for free users and $5 for paid subscribers.',
      },
      {
        q: 'How do I get paid?',
        a: 'Wise (international) or bank transfer. PayPal is temporarily unavailable.',
      },
      {
        q: 'What about taxes?',
        a: (
          <span>
            If you earn $500+ in a year, you\'ll be notified that we\'ll need your tax info (SSN for a 1099) before releasing further payouts past $600. Payout requests pause at $599 until we have your info — you can still earn in the meantime.
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
        q: 'How can I earn?',
        a: (
          <span>
            There are several ways to earn on ReadToEarn:
            <br /><br />
            <strong>Bounties</strong> — Pass a quiz while a bounty is active and earn per-pass payouts.
            <br /><br />
            <strong>Quick Tasks</strong> — Get paid for 1–3 minute tasks like cover voting, title testing, and blurb feedback.
            <br /><br />
            <strong>Surveys</strong> — Earn $1.00 per survey for detailed feedback on blurbs, tropes, hooks, and positioning.
            <br /><br />
            <strong>Beta Reader Panels</strong> — Read a first chapter and answer structured questions for a payout.
            <br /><br />
            <strong>Sensitivity Reader Panels</strong> — Provide feedback from your lived experience and earn $10 per panel.
          </span>
        ),
      },
    ],
  },
  {
    label: 'For Authors',
    items: [
      {
        q: 'Do I have to pay to list my book?',
        a: 'Yes. Standard Listing starts at $7/book and gives your book a permanent quiz and home in the library. Volume pricing is available for multiple titles.',
      },
      {
        q: 'What is a bounty?',
        a: 'You fund a pool and set a per-reader payout. We distribute to readers who pass your book\'s quiz. You only pay per verified pass. We keep 20%. Unused funds can be refunded after one year. Bounties are available for Wide books only — KU-enrolled books are not eligible.',
      },
      {
        q: 'Can I create my own quiz?',
        a: 'Yes. When you purchase a Standard Listing, you submit your own quiz questions for your book.',
      },
      {
        q: 'What research services do you offer?',
        a: (
          <span>
            Beyond standard listings and bounties, we offer:
            <br /><br />
            <strong>Quick Tasks</strong> — Pay readers to complete short tasks like cover voting, title testing, blurb testing, and hook testing. Results in hours.
            <br /><br />
            <strong>Reader Feedback Surveys</strong> — Collect structured feedback from readers on your blurbs, tropes, hooks, comp titles, and positioning. Readers earn $1.00 flat.
            <br /><br />
            <strong>Beta Reader Panels</strong> — Upload the first chapter of your unpublished book. Readers read it, answer structured questions, and optionally leave their email for full beta work off-platform.
            <br /><br />
            <strong>Sensitivity Reader Panels</strong> — Have an excerpt reviewed by readers with lived experience in the identities or topics you\'re writing about. Recruit your favorites for ongoing work.
            <br /><br />
            Visit the Authors page to explore all services.
          </span>
        ),
      },
      {
        q: 'How do I know my book is reaching the right readers?',
        a: 'Books are tagged by genre and trope. Readers browse and filter by what they already love. Your listing puts your book in front of readers who are actively looking for it, not a general audience.',
      },
    ],
  },
  {
    label: 'Subscriptions',
    items: [
      {
        q: 'What does the subscription include?',
        a: 'For $4.99/mo, you get ad-free browsing, priority access to limited-earning opportunities (like surveys and beta panels with capped reader counts), monthly subscriber bonus draws, and a reduced $5 cashout minimum.',
      },
      {
        q: 'What happens if I cancel mid-month?',
        a: 'Your subscriber benefits are honored through the end of your current billing period.',
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
