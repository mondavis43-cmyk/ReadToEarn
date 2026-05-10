import { useTheme } from '../contexts/ThemeContext';

export const PrivacyPolicy = () => {
  const { isDark } = useTheme();

  const bg            = isDark ? '#0f172a' : '#F5F0E8';
  const cardBg        = isDark ? '#1e293b' : '#ffffff';
  const cardBorder    = isDark ? '#334155' : '#e2d9c8';
  const textPrimary   = isDark ? '#F5F0E8' : '#1B2A4A';
  const textSecondary = isDark ? '#94a3b8' : '#6b7280';
  const accent        = '#D4A843';

  const sections = [
    {
      title: '1. Information We Collect',
      body: `We collect information you provide directly when you register or use the Platform, including:

• Name and email address
• Date of birth (required for age verification and COPPA compliance)
• Phone number (required for identity verification; one account per number)
• Country of residence (required for payout eligibility)
• Payment information when you request a cashout
• Parent or guardian phone number, if you are between 13 and 17 years old
• Tax identification number (SSN or equivalent) when your cumulative earnings reach $500

We also collect usage data automatically, including quiz activity, reading history, competition participation, referral activity, survey and task completions, and session data.`,
    },
    {
      title: '2. How We Use Your Information',
      body: `We use your information to:

• Operate and improve the Platform
• Verify your identity and prevent fraud, including multi-account detection via phone and email
• Determine payout eligibility based on your country
• Process earnings and cashout requests via PayPal, Wise, or gift cards
• Enforce the 8-minute quiz timer and other anti-cheating measures
• Comply with legal obligations, including IRS 1099 tax reporting for users earning $600 or more in a calendar year
• Communicate with you about your account, earnings, competitions, and platform updates
• Administer parental consent for users aged 13–17`,
    },
    {
      title: '3. Children\'s Privacy (COPPA)',
      body: `ReadToEarn is open to users aged 13 and older. We do not knowingly collect personal information from children under 13. Any user found to be under 13 will have their account immediately terminated and their data deleted.

For users aged 13–17 (minors):
• A parent or guardian must verify their phone number at signup via SMS one-time passcode
• The parent or guardian must complete a consent checkbox with a logged timestamp before the account is created
• Both the minor's and parent's verified phone numbers are stored on the account
• Minors are eligible for gift card payouts only. Cash transfers (PayPal and Wise) are available to users 18 and older
• If you believe a child under 13 has created an account, contact us immediately at info@joinreadtoearn.com and we will delete that information promptly`,
    },
    {
      title: '4. Phone Number Verification & Fraud Prevention',
      body: `Phone number verification is required at signup and is our primary measure against multi-accounting. Each phone number may only be associated with one ReadToEarn account. Attempting to create multiple accounts using different phone numbers or emails is a violation of our Terms of Service and will result in permanent account termination and forfeiture of any pending earnings.

Additional fraud prevention measures include:
• Email verification required before account activation
• 8-minute quiz timer to prevent AI-assisted or automated quiz completion
• 48-hour pre-registration window before competition entry fees are charged
• 30-day fraud review hold before first affiliate payout credit
• Technical failures reviewed case-by-case within 72 hours`,
    },
    {
      title: '5. Earnings, Payouts & Tax Compliance',
      body: `Earnings are subject to the following rules:

• Minimum cashout threshold: $10 for all users
• Payment methods: PayPal (US, 18+), Wise (international, 18+), gift cards (all ages)
• Earnings from bounties represent 80% of the author's pool; the platform retains 20%
• Competition prize pools are funded by reader entry fees (75% to winners, 25% to platform) or by author sponsorship fees
• Affiliate earnings ($0.50/month per referred subscriber) are available to paid subscribers only and begin after the referred user has been active for 30 days

Tax compliance:
• At $500 in cumulative earnings, you will be notified to provide your SSN or tax identification number
• A second notice is sent at $550
• At $600 or more in earnings, tax identification is required to continue earning
• Accounts that do not provide tax information within 180 days of the $600 threshold will have held earnings forfeited
• Earnings from flagged or fraudulent activity are forfeited. Legitimate earnings prior to a ban are reviewed and paid within 30 days if no fraud is found`,
    },
    {
      title: '6. Sharing Your Information',
      body: `We do not sell your personal information. We may share your information with:

• Payment processors (PayPal, Wise, Giftogram) to fulfill cashout requests
• Hosting and infrastructure providers necessary to operate the Platform
• The IRS or equivalent tax authority, as required by law for 1099 reporting
• Law enforcement or regulatory bodies when required by applicable law

We do not share your reading history, quiz results, or survey responses with authors or third parties in a personally identifiable form.`,
    },
    {
      title: '7. Country Eligibility & Geographic Restrictions',
      body: `Payout eligibility is limited to countries supported by Wise for international transfers. Your country of residence is collected at signup and determines whether you are eligible to earn and withdraw funds. Users in unsupported countries may browse the Platform but cannot participate in paid activities (bounties, competitions, surveys, quick tasks, beta reading, sensitivity reading, or affiliate programs).

A full list of supported countries is available at signup.`,
    },
    {
      title: '8. Subscriptions & Referrals',
      body: `Reader subscriptions ($4.99/month or $49.90/year) are processed through our payment provider. Subscription benefits are honored through the end of the current billing period upon cancellation.

Referral codes are generated only for active paid subscribers. Referral earnings ($0.50/month per referred subscriber) are credited after the referred user has maintained an active paid subscription for 30 days. Referral credits stop when the referred user cancels. There is no cap on the number of referrals.

Author Ambassador referral earnings (5% of a referred author's first listing purchase) are credited after the referred author completes their first purchase.`,
    },
    {
      title: '9. Data Retention',
      body: `We retain your personal information for as long as your account is active or as needed to:

• Provide Platform services
• Comply with legal and tax obligations (including IRS record-keeping requirements)
• Resolve disputes and enforce our Terms of Service

You may request deletion of your account and associated data at any time by contacting info@joinreadtoearn.com. Note that earnings records and tax-related data may be retained beyond account deletion as required by law.`,
    },
    {
      title: '10. Security',
      body: `We implement reasonable technical and organizational measures to protect your personal information, including phone-based identity verification, encrypted data transmission, and access controls. However, no method of transmission over the internet or electronic storage is 100% secure. We cannot guarantee absolute security of your data.

If you believe your account has been compromised, contact us immediately at info@joinreadtoearn.com.`,
    },
    {
      title: '11. Your Rights',
      body: `You have the right to:

• Access the personal information we hold about you
• Correct inaccurate or incomplete information
• Request deletion of your account and personal data
• Restrict or object to certain uses of your data
• Withdraw consent where processing is based on consent

To exercise any of these rights, contact us at info@joinreadtoearn.com. We will respond within 30 days.`,
    },
    {
      title: '12. Cookies',
      body: `We use cookies and similar technologies to maintain your session, remember your preferences (including theme settings), and analyze Platform usage. You can control cookie settings through your browser, though disabling cookies may affect Platform functionality such as staying logged in or maintaining filter preferences.`,
    },
    {
      title: '13. Changes to This Policy',
      body: `We may update this Privacy Policy from time to time to reflect changes in our practices or legal requirements. We will notify you of significant changes by posting the updated policy on this page with a revised date. Continued use of the Platform after changes are posted constitutes acceptance of the updated policy.`,
    },
    {
      title: '14. Contact Us',
      body: `If you have questions about this Privacy Policy or how we handle your data, contact us at info@joinreadtoearn.com.`,
    },
  ];

  return (
    <div className="min-h-screen px-4 py-12" style={{ backgroundColor: bg }}>
      <div className="max-w-3xl mx-auto">
        <h1 className="font-serif text-4xl mb-2 text-center" style={{ color: textPrimary }}>
          Privacy Policy
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
