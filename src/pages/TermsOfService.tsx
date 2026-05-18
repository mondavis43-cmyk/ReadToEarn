import { useTheme } from '../contexts/ThemeContext';
import { FEATURES } from '../config/features';

export const TermsOfService = () => {
  const { isDark } = useTheme();

  const bg            = isDark ? '#0f172a' : '#F5F0E8';
  const cardBg        = isDark ? '#1e293b' : '#ffffff';
  const cardBorder    = isDark ? '#334155' : '#e2d9c8';
  const textPrimary   = isDark ? '#F5F0E8' : '#1B2A4A';
  const textSecondary = isDark ? '#94a3b8' : '#6b7280';
  const accent        = '#D4A843';

  const sections = [
    {
      title: '1. Acceptance of Terms',
      body: `By creating an account or using ReadToEarn ("the Platform"), you agree to these Terms of Service. If you do not agree, do not use the Platform. We reserve the right to update these terms at any time. Continued use after changes constitutes acceptance.`,
    },
    {
      title: '2. Eligibility',
      body: `You must be at least 18 years old to use ReadToEarn. Users under 18 are not permitted on the Platform and any such accounts will be terminated immediately upon discovery.

By creating an account, you represent that you meet this age requirement and that all information you provide is accurate. We reserve the right to terminate accounts that do not comply.`,
    },
    {
      title: '3. Account Registration & Identity Verification',
      body: `You must provide a valid email address, date of birth, phone number, and country of residence to create an account. Phone number verification via one-time passcode (OTP) is required at signup.

Each phone number may only be associated with one ReadToEarn account. Creating multiple accounts using different phone numbers or email addresses is a violation of these Terms and will result in permanent termination of all associated accounts and forfeiture of any pending earnings.

You are responsible for maintaining the security of your account credentials. ReadToEarn is not liable for any loss resulting from unauthorized access to your account.`,
    },
    {
      title: '4. Earning & Cashouts',
      body: `ReadToEarn allows users to earn rewards through the following activities: passing book quizzes (bounties and competitions), completing quick tasks, completing surveys, participating as a beta reader or sensitivity reader, and earning affiliate referral credits.

Earnings are subject to the following rules:
• Minimum cashout threshold: $10
• Payment methods: PayPal (US residents), Wise (international)
• Earnings are credited only after verification and approval
• We reserve the right to withhold or reverse earnings obtained through fraudulent activity, cheating, or abuse of the Platform

Tax compliance:
• At $500 in cumulative earnings, you will be notified to provide your Social Security Number (SSN) or equivalent tax identification number
• A second notice is sent at $550
• At $600 or more in earnings, tax identification is required to continue earning
• Accounts that do not provide tax information within 180 days of reaching the $600 threshold will have held earnings forfeited
• Earnings from flagged or fraudulent activity are forfeited. Legitimate earnings prior to a ban are reviewed and paid within 30 days if no fraud is found`,
    },
    {
      title: '5. Bounties',
      body: `Authors may fund a bounty pool to pay readers for passing a book's quiz. The platform retains 20% of the bounty pool as a distribution fee; 80% is distributed to readers who pass the quiz.

The minimum bounty pool is $25. Authors set the pool size and the per-pass payout amount. Bounty pools are non-refundable once activated. Readers are paid only for verified quiz passes during the active bounty period. The quiz for a book is only unlocked when a bounty or competition is active for that book.`,
    },
    {
      title: '6. Competitions',
      body: `ReadToEarn hosts reader competitions${FEATURES.readathon || FEATURES.elimination ? ' in three formats: Sprint, Read-A-Thon, and Elimination Bracket' : ' in one format: Sprint'}. Competitions may be platform-run (funded by reader entry fees) or author-sponsored.

Platform-run competitions: 75% of entry fees go to the winner(s); 25% is retained by the platform.

Author-sponsored competitions: Authors pay a sponsorship fee to make their book the required read. Sponsorship tiers range from $60 (Spark) to $500+ (Grand). The platform retains a percentage of the sponsorship fee based on tier; the remainder funds the prize pool.

Entry fees are charged within a 48-hour pre-registration window before a competition launches. Failure to complete payment within this window forfeits your registration spot. Entry fees are non-refundable once a competition has launched.

${FEATURES.tournaments ? 'User-created tournaments require a minimum of 10 participants for prize pool payouts. The platform retains 25% of user-created tournament entry fees.' : ''}`,
    },
    {
      title: '7. Quick Tasks, Surveys, Beta Reading & Sensitivity Reading',
      body: `Authors may purchase reader tasks including cover art voting, title testing, blurb testing, surveys, beta reader acquisition, and sensitivity reader sessions. Readers who complete these tasks earn the stated per-completion amount.

Task and survey completions are verified before earnings are credited. Readers must meet any eligibility criteria specified by the author (e.g., identity criteria for sensitivity reading). Submitting false or misleading responses to tasks or surveys is a violation of these Terms and may result in account termination and forfeiture of earnings.

Author fees for tasks and surveys are non-refundable once a task has been activated and completions have begun.`,
    },
    {
      title: '8. Subscriptions',
      body: `Reader subscriptions are available at $4.99/month or $49.90/year. Subscription benefits include an ad-free experience, priority survey queue, early competition registration, profile customization, one monthly competition entry at 30% off, and access to subscribers-only mini-competitions.

Subscriptions are billed in advance. Cancellation takes effect at the end of the current billing period — benefits are honored through that date. No partial refunds are issued for mid-period cancellations.

Referral codes are generated only for active paid subscribers. Referral earnings ($0.50/month per referred subscriber) begin after the referred user has maintained an active paid subscription for 30 days and continue monthly as long as the referred user remains subscribed.`,
    },
    {
      title: '9. Affiliate & Ambassador Programs',
      body: `Reader Affiliate Program: Available to paid subscribers only. Earn $0.50/month for each friend who subscribes using your referral link and remains an active paid subscriber. A 30-day fraud protection hold applies before the first credit is issued. Earnings stop when the referred user cancels. There is no cap on referrals.

Author Ambassador Program: Authors earn 25% of a referred author's first listing purchase. Credits are applied after the referred author completes their first purchase.

Referral earnings obtained through fraudulent means (e.g., self-referral, fake accounts) will be forfeited and may result in account termination.`,
    },
    {
      title: '10. Author Listings',
      body: `Authors may submit books for listing on the Platform subject to applicable fees:
• Single book: $7 | Trilogy (3): $18 | Series (5): $30 | Catalog (10): $50 | Imprint (25): $100

Listing fees are non-refundable once a listing is approved and published. A listing grants the book a permanent page on the Platform, quiz eligibility, competition eligibility, and community visibility. ReadToEarn reserves the right to remove any listing that violates our content policies. Authors are responsible for ensuring they hold all rights to any content they submit.

By submitting a listing, authors acknowledge that their books may be included in platform-run competitions${FEATURES.tournaments ? ' and user-created tournaments' : ''} as permitted by these Terms.`,
    },
    {
      title: '11. Bulletin Board & Author AMAs',
      body: `Authors may post free promotional content to the Bulletin Board. Sponsored pinned posts are available for $50/month flat fee. Bulletin Board posts are subject to content review and may be removed for policy violations.

Author AMAs (Ask Me Anything sessions) are free and open to all listed authors. AMA content is public and subject to our community guidelines.`,
    },
    {
      title: '12. Prohibited Conduct',
      body: `You agree not to:
• Use bots, scripts, AI tools, or automated methods to complete quizzes, tasks, or surveys
• Create multiple accounts to circumvent earning limits or verification requirements
• Use another person's phone number or identity to create or verify an account
• Submit false, misleading, or fabricated responses to any task, survey, or quiz
• Upload content you do not own or have rights to
• Attempt to reverse-engineer, exploit, or interfere with the Platform
• Engage in any activity designed to manipulate competition outcomes or referral earnings

Violations may result in immediate account termination, forfeiture of all pending earnings, and reporting to relevant authorities where applicable.`,
    },
    {
      title: '14. Intellectual Property',
      body: `All content on ReadToEarn, including but not limited to the name, logo, design, and software, is the property of ReadToEarn and protected by applicable intellectual property laws. Book content, quizzes, and author-submitted materials remain the property of the respective authors. By submitting content to the Platform, authors grant ReadToEarn a non-exclusive license to display that content on the Platform for the purpose of operating the service.`,
    },
    {
      title: '15. Termination',
      body: `We reserve the right to suspend or terminate your account at any time for violation of these Terms, fraudulent activity, or any other reason at our sole discretion.

Upon termination:
• Earnings from fraudulent or policy-violating activity are forfeited immediately
• Legitimate earnings prior to termination are reviewed within 30 days — if no fraud is found, they will be paid out
• Accounts terminated for tax non-compliance after the 180-day hold period forfeit all held earnings
• Author listing fees are non-refundable upon termination`,
    },
    {
      title: '16. Disclaimer of Warranties',
      body: `ReadToEarn is provided "as is" without warranties of any kind. We do not guarantee uninterrupted access, error-free operation, or that earnings will meet any particular amount. Technical failures are reviewed case-by-case within 72 hours. Use of the Platform is at your own risk.`,
    },
    {
      title: '17. Limitation of Liability',
      body: `To the fullest extent permitted by law, ReadToEarn shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Platform, including but not limited to lost earnings, data loss, or service interruptions.`,
    },
    {
      title: '18. Governing Law',
      body: `These Terms are governed by the laws of the State of Tennessee, without regard to conflict of law principles. Any disputes shall be resolved in the courts of Shelby County, Tennessee.`,
    },
    {
      title: '19. Contact',
      body: `Questions about these Terms? Contact us at info@joinreadtoearn.com.`,
    },
  ];

  return (
    <div className="min-h-screen px-4 py-12" style={{ backgroundColor: bg }}>
      <div className="max-w-3xl mx-auto">
        <h1 className="font-serif text-4xl mb-2 text-center" style={{ color: textPrimary }}>
          Terms of Service
        </h1>
        <p className="text-center text-sm mb-10" style={{ color: textSecondary }}>
          Last updated: April 24, 2026
        </p>

        <div
          className="rounded-lg border p-8 space-y-8"
          style={{ backgroundColor: cardBg, borderColor: cardBorder }}
        >
          {sections.map(({ title, body }) => (
            <div key={title}>
              <h2 className="text-lg font-semibold mb-2" style={{ color: accent }}>
                {title}
              </h2>
              <p
                className="text-sm leading-relaxed whitespace-pre-line"
                style={{ color: textSecondary }}
              >
                {body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
