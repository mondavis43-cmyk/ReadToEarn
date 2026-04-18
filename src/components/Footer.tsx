import { useTheme } from '../contexts/ThemeContext';
import { useNavigate } from '../hooks/useNavigate';

export const Footer = () => {
  const { isDark } = useTheme();
  const { navigateTo } = useNavigate();

  const textMuted = isDark ? '#64748b' : '#9ca3af';
  const borderColor = isDark ? '#1e293b' : '#e2d9c8';
  const hoverColor = '#D4A843';

  return (
    <footer
      className="w-full py-6 px-4 mt-auto border-t"
      style={{ borderColor }}
    >
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-xs" style={{ color: textMuted }}>
          © {new Date().getFullYear()} ReadToEarn. All rights reserved.
        </p>
        <div className="flex items-center gap-6">
          <button
            onClick={() => navigateTo('/terms')}
            className="text-xs transition-colors hover:underline underline-offset-2"
            style={{ color: textMuted }}
            onMouseEnter={e => (e.currentTarget.style.color = hoverColor)}
            onMouseLeave={e => (e.currentTarget.style.color = textMuted)}
          >
            Terms of Service
          </button>
          <button
            onClick={() => navigateTo('/privacy')}
            className="text-xs transition-colors hover:underline underline-offset-2"
            style={{ color: textMuted }}
            onMouseEnter={e => (e.currentTarget.style.color = hoverColor)}
            onMouseLeave={e => (e.currentTarget.style.color = textMuted)}
          >
            Privacy Policy
          </button>
        </div>
      </div>
    </footer>
  );
};
