import { useTheme } from '../contexts/ThemeContext';

export const TermsOfService = () => {
  const { isDark } = useTheme();

  const bg           = isDark ? '#0f172a' : '#F5F0E8';
  const cardBg       = isDark ? '#1e293b' : '#ffffff';
  const cardBorder   = isDark ? '#334155' : '#e2d9c8';
  const textPrimary  = isDark ? '#F5F0E8' : '#1B2A4A';
  const textSecondary = isDark ? '#94a3b8' : '#6b7280';
  const accent       = '#D4A843';

  return (
    <div className="min-h-screen px-4 py-12" style={{ backgroundColor: bg }}>
      <div className="max-w-3xl mx-auto">
        <h1 className="font-serif text-4xl mb-2 text-center" style={{ color: textPrimary }}>
          Terms of Service
        </h1>
        <p className="text-center text-sm mb-10" style={{ color: textSecondary }}>
          Last updated: June 1, 2025
        </p>

        <div className="rounded-lg border p-8 space-y-8" style={{ backgroundColor: cardBg, borderColor: cardBorder }}>

          {[
            {
              title: '1. Acceptance of Terms',
              body: `By creating an account or using ReadToEarn ("the Platform"), you agree to these Terms of Service. If you do not agree, do not use the Platform. We reserve the right to update these terms at any time. Continued use after changes constitutes acceptance.`,
            },
            {
              title: '2. Eligibility',
              body: `You must be at least 13 years old to use ReadToEarn. Users under 18 must have parental or guardian consent. By using the Platform, you represent that you meet these requirements. We reserve the right to terminate accounts that do not comply.`,
            },
            {
              title: '3. Earning and Cashouts',
              body: `ReadToEarn allows users to earn rewards by completing reading activities and quizzes. Earnings are subject to verification and approval. We reserve the right to withhold or reverse earnings obtained through fraudulent activity, cheating, or abuse of the Platform. Cashout requests are processed at our discretion and may require identity or tax verification. Earnings over $600 in a calendar year may require a 1099 tax form.`,
            },
            {
              title: '4. Author Listings',
              body: `Authors may submit books for listing on the Platform subject to applicable fees. Listing fees are non-refundable once a listing is approved and published. ReadToEarn reserves the right to remove any listing that violates our content policies. Authors are responsible for ensuring they hold the rights to any content they submit.`,
            },
            {
              title: '5. Prohibited Conduct',
              body: `You agree not to: use bots, scripts, or automated tools to complete quizzes or earn rewards; create multiple accounts to circumvent earning limits; submit false or misleading information; upload content you do not own or have rights to; attempt to reverse-engineer or exploit the Platform in any way.`,
            },
            {
              title: '6. Intellectual Property',
              body: `All content on ReadToEarn, including but not limited to the name, logo, design, and software, is the property of ReadToEarn and protected by applicable intellectual property laws. Book content submitted by authors remains the property of the respective authors.`,
            },
            {
              title: '7. Termination',
              body: `We reserve the right to suspend or terminate your account at any time for violation of these terms, fraudulent activity, or any other reason at our sole discretion. Upon termination, any pending earnings may be forfeited.`,
            },
            {
              title: '8. Disclaimer of Warranties',
              body: `ReadToEarn is provided "as is" without warranties of any kind. We do not guarantee uninterrupted access, error-free operation, or that earnings will meet any particular amount. Use of the Platform is at your own risk.`,
            },
            {
              title: '9. Limitation of Liability',
              body: `To the fullest extent permitted by law, ReadToEarn shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Platform, including but not limited to lost earnings, data loss, or service interruptions.`,
            },
            {
              title: '10. Governing Law',
              body: `These Terms are governed by the laws of the State of Tennessee, without regard to conflict of law principles. Any disputes shall be resolved in the courts of Shelby County, Tennessee.`,
            },
            {
              title: '11. Contact',
              body: `Questions about these Terms? Contact us at support@readtoearn.com.`,
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
