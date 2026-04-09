import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const faqs = [
  {
    question: 'How do I earn money?',
    answer: 'Pick a book from the library, read it, then take a 10-question quiz. Score 8 or higher and the bounty is added to your balance instantly. Each book shows its bounty upfront so you always know what you are earning before you start.',
  },
  {
    question: 'How much can I earn per book?',
    answer: 'Bounties are calculated at $0.0085 per page. A 200-page book pays $1.70, a 300-page book pays $2.55. The exact amount is shown on every book in the library. Monthly earning caps apply based on your subscription tier.',
  },
  {
    question: 'What are the subscription tiers?',
    answer: 'There are four tiers. Free: earn up to $5 per month. Casual Reader ($5.99/mo): earn up to $20 per month. Avid Reader ($10.99/mo): earn up to $55 per month. Voracious Reader ($24.99/mo): earn up to $120 per month. Higher tiers also unlock referral bonuses and streak rewards.',
  },
  {
    question: 'Can I take the same quiz more than once?',
    answer: 'You can retake a quiz if you fail, but retake limits vary by tier. Each book can only be completed once -- once you pass and earn the bounty, that book is marked complete and will not pay out again.',
  },
  {
    question: 'How long do I have to complete the quiz?',
    answer: 'You have 8 minutes once the quiz starts. The timer is shown in the top right corner and turns yellow at 1 minute and red at 30 seconds. If time runs out, whatever you have answered gets submitted automatically.',
  },
  {
    question: 'What is the minimum to cash out?',
    answer: 'The minimum cashout amount is $10.00. Once your balance hits $10, you can request a payout from your profile page.',
  },
  {
    question: 'How do I cash out?',
    answer: 'Go to your Profile page and click the Cash Out button. Enter the amount you would like to withdraw (minimum $10) and submit the request. Payouts are sent via PayPal, Venmo, or Giftogram gift cards.',
  },
  {
    question: 'What is a reading streak?',
    answer: 'A streak tracks how many consecutive days you have passed at least one quiz. Streak bonuses are available on Avid Reader and Voracious Reader plans. Hit 7 days in a row and earn a $0.10 bonus. Hit 30 days in a row and earn another $0.10 bonus. Miss a day and your streak resets to 1.',
  },
  {
    question: 'How does the referral program work?',
    answer: 'Referral bonuses are available on paid plans. When someone signs up through your unique referral link and passes their first quiz, you earn a bonus based on your tier: $1 on Casual Reader, $2 on Avid Reader, and $3 on Voracious Reader. There is no limit to how many friends you can refer.',
  },
  {
    question: 'What kinds of books are available?',
    answer: 'The library includes classic literature, popular fiction, non-fiction, and indie author titles. We add new books regularly. If you do not see a book you have read, use the Request a Book page to suggest it.',
  },
  {
    question: 'Can I request a book that is not in the library?',
    answer: 'Absolutely. Head to the Request a Book page, enter the title and author, and optionally submit quiz questions to help us add it faster. We review all requests and prioritize the most-requested titles.',
  },
  {
    question: 'I am an author. Can I list my book?',
    answer: 'Yes! Visit the For Authors page to learn how it works and submit your book.',
  },
  {
    question: 'What are the tax requirements?',
    answer: 'If you earn $600 or more in a calendar year, we are required to collect your SSN for 1099 tax reporting. You will receive a warning at $500 and again at $550. Cashout requests pause until your tax info is verified. Unverified accounts with held earnings exceeding $600 forfeit those funds after 180 days of inactivity.',
  },
  {
    question: 'Is this available outside the US?',
    answer: 'Currently payouts are processed via PayPal, Venmo, and Giftogram gift cards. Availability may vary by region. Sign up and reach out if you have questions about your specific location.',
  },
  {
    question: 'Do I get a birthday bonus?',
    answer: 'Yes! Add your birthday in your Profile settings and you will receive a $0.25 bonus every year on your birthday no matter what tier you are on.',
  },

const FAQItem = ({ question, answer }: { question: string; answer: string }) => {
  const [open, setOpen] = useState(false);
  const { isDark } = useTheme();

  return (
    <div className={`border-b ${isDark ? 'border-[#F5F0E8]/10' : 'border-[#1B2A4A]/10'}`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-5 text-left gap-4"
      >
        <span className={`font-medium ${isDark ? 'text-[#F5F0E8]' : 'text-[#1B2A4A]'}`}>
          {question}
        </span>
        <ChevronDown
          className={`w-4 h-4 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''} ${
            isDark ? 'text-[#F5F0E8]/40' : 'text-[#1B2A4A]/40'
          }`}
        />
      </button>
      {open && (
        <p className={`text-sm leading-relaxed pb-5 ${isDark ? 'text-[#F5F0E8]/60' : 'text-[#1B2A4A]/60'}`}>
          {answer}
        </p>
      )}
    </div>
  );
};

export const FAQ = () => {
  const { isDark } = useTheme();

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-[#1B2A4A]' : 'bg-[#F5F0E8]'}`}>
      <div className="max-w-2xl mx-auto px-4 py-12">

        {/* Header */}
        <div className="mb-10">
          <h1 className={`font-serif text-3xl mb-2 ${isDark ? 'text-[#F5F0E8]' : 'text-[#1B2A4A]'}`}>
            FAQ
          </h1>
          <p className={isDark ? 'text-[#F5F0E8]/60' : 'text-[#1B2A4A]/60'}>
            Everything you need to know about Read to Earn.
          </p>
        </div>

        {/* FAQ List */}
        <div>
          {faqs.map((faq) => (
            <FAQItem key={faq.question} question={faq.question} answer={faq.answer} />
          ))}
        </div>

      </div>
    </div>
  );
};
