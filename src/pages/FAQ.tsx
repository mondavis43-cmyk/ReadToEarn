import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const faqs = [
  {
    question: 'How do I earn money?',
    answer: 'Pick a book from the library, read it, then take a 10-question quiz. Score 8 or higher and the bounty is added to your balance instantly. Each book has its bounty listed upfront so you always know what you\'re earning before you start.',
  },
  {
    question: 'How much can I earn per book?',
    answer: 'Bounties are calculated at $0.0085 per page. A 200-page book pays $1.70, a 300-page book pays $2.55. The exact amount is shown on every book in the library.',
  },
  {
    question: 'Can I take the same quiz more than once?',
    answer: 'You can retake a quiz if you fail, but each book can only be completed once. Once you pass and earn the bounty, that book is marked complete and won\'t pay out again.',
  },
  {
    question: 'How long do I have to complete the quiz?',
    answer: 'You have 8 minutes once the quiz starts. The timer is shown in the top right corner and turns yellow at 1 minute and red at 30 seconds. If time runs out, whatever you\'ve answered gets submitted automatically.',
  },
  {
    question: 'What is the minimum to cash out?',
    answer: 'The minimum cashout amount is $5.00. Once your balance hits $5, you can request a payout from your profile page. Payouts are processed manually and typically sent within 2-3 business days.',
  },
  {
    question: 'How do I cash out?',
    answer: 'Go to your Profile page and click the Cash Out button. Enter the amount you\'d like to withdraw (minimum $10) and submit the request. Our team will process it and send payment within 3-5 business days.',
  },
  {
    question: 'What is a reading streak?',
    answer: 'A streak tracks how many consecutive days you\'ve passed at least one quiz. Pass a quiz today and tomorrow and you\'re on a 2-day streak. Miss a day and it resets to 1. Hit 7 days in a row and earn a $0.05 bonus. Hit 30 days and earn a $0.25 bonus. Milestones repeat — every 7th and 30th day keeps paying.',
  },
  {
    question: 'How does the referral program work?',
    answer: 'Every account has a unique referral link on the Refer page. Share it with a friend. When they sign up through your link and pass their first quiz, you automatically earn $0.50. There\'s no limit to how many friends you can refer.',
  },
  {
    question: 'Do I get a birthday bonus?',
    answer: 'Yes! Add your birthday in your Profile settings and you\'ll receive a $0.25 bonus for every year on your birthday.',
  },
  {
    question: 'What kinds of books are available?',
    answer: 'The library includes classic literature, popular fiction, non-fiction, and indie author titles. We\'re adding new books regularly. If you don\'t see a book you\'ve read, use the Request a Book page to suggest it.',
  },
  {
    question: 'Can I request a book that isn\'t in the library?',
    answer: 'Absolutely. Head to the Request a Book page, enter the title and author, and optionally submit quiz questions to help us add it faster. We review all requests and prioritize the most-requested titles.',
  },
  {
    question: 'I\'m an author. Can I list my book?',
    answer: 'Yes! Visit the For Authors page to learn how it works and submit your book.',
  },
  {
    question: 'Is this available outside the US?',
    answer: 'Currently payouts are processed manually and availability may vary by region. Sign up and reach out if you have questions about your specific location.',
  },
];

const FAQItem = ({ question, answer }: { question: string; answer: string }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gray-800">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-5 text-left gap-4"
      >
        <span className="text-white font-medium">{question}</span>
        <ChevronDown className={`w-4 h-4 text-gray-500 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <p className="text-gray-400 text-sm leading-relaxed pb-5">{answer}</p>
      )}
    </div>
  );
};

export const FAQ = () => {
  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="mb-10">
          <h1 className="font-serif text-3xl text-white mb-2">FAQ</h1>
          <p className="text-gray-400">Everything you need to know about Read to Earn.</p>
        </div>
        <div>
          {faqs.map((faq) => (
            <FAQItem key={faq.question} question={faq.question} answer={faq.answer} />
          ))}
        </div>
      </div>
    </div>
  );
};
