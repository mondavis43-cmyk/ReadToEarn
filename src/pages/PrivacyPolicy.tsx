import { useTheme } from '../contexts/ThemeContext';

export const PrivacyPolicy = () => {
  const { isDark } = useTheme();

  const bg            = isDark ? '#0f172a' : '#F5F0E8';
  const cardBg        = isDark ? '#1e293b' : '#ffffff';
  const cardBorder    = isDark ? '#334155' : '#e2d9c8';
  const textPrimary   = isDark ? '#F5F0E8' : '#1B2A4A';
  const textSecondary = isDark ? '#94a3b8' : '#6b7280';
  const accent        = '#D4A843';

  return (
    <div className="min-h-screen px-4 py-12" style={{ backgroundColor: bg }}>
      <div className="max-w-3xl mx-auto">
        <h1 className="font-serif text-4xl mb-2 text-center" style={{ color: textPrimary }}>
          Privacy Policy
        </h1>
        <p className="text-center text-sm mb-10" style={{ color: textSecondary }}>
          Last updated: June 1, 2025
        </p>

        <div className="rounded-lg border p-8 space-y-8" style={{ backgroundColor: cardBg, borderColor: cardBorder }}>

          {[
            {
              title: '1. Information We Collect',
              body: `We collect information you provide directly, including your name, email address, date of birth, and payment information when you register or request a cashout. We also collect usage data such as quiz activity, reading history, and referral activity automatically when you use the Platform.`,
            },
            {
              title: '2. How We Use Your Information',
              body: `We use your information to operate and improve the Platform, process earnings and cashout requests, verify eligibility and prevent fraud, communicate with you about your account, and comply with legal obligations including tax reporting requirements.`,
            },
            {
              title: '3. Children\'s Privacy (COPPA)',
              body: `ReadToEarn is intended for users 13 and older. We do not knowingly collect personal information from children under 13 without verifiable parental consent. If you believe a child under 13 has provided us with personal information without consent, please contact us immediately at support@readtoearn.com and we will delete that information promptly.`,
            },
            {
              title: '4. Sharing Your Information',
              body: `We do not sell your personal information. We may share your information with third-party service providers who assist us in operating the Platform (such as payment processors and hosting providers), and as required by law, including for tax reporting purposes (e.g., IRS 1099 reporting for earnings over $600).`,
            },
            {
              title: '5. Data Retention',
              body: `We retain your personal information for as long as your account is active or as needed to provide services, comply with legal obligations, resolve disputes, and enforce our agreements. You may request deletion of your account and associated data at any time by contacting us.`,
            },
            {
              title: '6. Security',
              body: `We implement reasonable technical and organizational measures to protect your personal information. However, no method of transmission over the internet or electronic storage is 100% secure. We cannot guarantee absolute security of your data.`,
            },
            {
              title: '7. Your Rights',
              body: `You have the right to access, correct, or delete your personal information. You may also request that we restrict processing of your data or object to certain uses. To exercise these rights, contact us at support@readtoearn.com. We will respond within 30 days.`,
            },
            {
              title: '8. Cookies',
              body: `We use cookies and similar technologies to maintain your session, remember your preferences, and analyze Platform usage. You can control cookie settings through your browser, though disabling cookies may affect Platform functionality.`,
            },
            {
              title: '9. Changes to This Policy',
              body: `We may update this Privacy Policy from time to time. We will notify you of significant changes by posting the new policy on this page with an updated date. Continued use of the Platform after changes constitutes acceptance of the updated policy.`,
            },
            {
              title: '10. Contact Us',
              body: `If you have questions about this Privacy Policy or how we handle your data, contact us at support@readtoearn.com.`,
            },
          ].map(({ title, body }) => (
            <div key={title}>
              <h2 className="text-lg font-semibold mb-2" style={{ color: accent }}>
                {title}
              </h2>
              <p className="text-sm leading-relaxed" style={{ color: textSecondary }}>
                {body}
              </p>
            </div>
          ))}

        </div>
      </div>
    </div>
  );
};
