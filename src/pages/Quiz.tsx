import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from '../hooks/useNavigate';
import { useTheme } from '../contexts/ThemeContext';
import { ArrowLeft, PartyPopper, Timer } from 'lucide-react';
import { calculatePayout, SubscriptionTier } from '../utils/calculatePayout';

// ... (Interfaces remain the same as your code)

export const Quiz = ({ bookId }: QuizProps) => {
  const { user } = useAuth();
  const { navigateTo } = useNavigate();
  const { isDark } = useTheme();
  
  // ... (All your useState/useRef hooks)
  const [book, setBook] = useState<Book | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [shuffledOptions, setShuffledOptions] = useState<Record<string, string[]>>({});
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [passed, setPassed] = useState(false);
  const [alreadyCompleted, setAlreadyCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(QUIZ_DURATION);
  const [timedOut, setTimedOut] = useState(false);
  const [streakBonus, setStreakBonus] = useState<number | null>(null);
  const [earnedAmount, setEarnedAmount] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ... (Your useEffects and loadQuiz function remain here)

  const handleSubmit = async (fromTimer = false) => {
    // ... (Your logic remains the same)
  };

  // ... (Theme tokens and loading state)

  return (
    <div className={`min-h-screen ${bg} transition-colors duration-300`}>
      {/* Header */}
      <div className={`border-b ${dividerColor} px-4 py-4 sticky top-0 z-10 ${isDark ? 'bg-[#1B2A4A]' : 'bg-[#F5F0E8]'}`}>
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
           {/* ... (Header content) */}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* FIXED: Moved this check inside the JSX return */}
        {alreadyCompleted && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6 text-yellow-300 text-sm">
            You have already used your one attempt for this book.
          </div>
        )}

        {submitted ? (
          /* Results Screen JSX */
          <div className={`${cardBg} rounded-lg p-8 border ${cardBorder}`}>
             {/* ... (Results content) */}
          </div>
        ) : (
          /* Questions JSX */
          <div className="space-y-6">
            {questions.map((question, index) => (
              <div key={question.id} className={`${cardBg} rounded-lg p-6 border ${cardBorder}`}>
                 {/* ... (Question mapping) */}
              </div>
            ))}
            {/* ... (Submit button) */}
          </div>
        )}
      </div>
    </div>
  );
};
