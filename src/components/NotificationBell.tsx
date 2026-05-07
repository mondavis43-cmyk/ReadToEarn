import { useState } from 'react';
import { Bell } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';
import { useTheme } from '../contexts/ThemeContext';

interface Props {
  userId: string | null;
}

export const NotificationBell = ({ userId }: Props) => {
  const { isDark } = useTheme();
  const { notifications, unreadCount, markAllRead, markOneRead } = useNotifications(userId);
  const [open, setOpen] = useState(false);

  const cardBg = isDark ? 'bg-[#1a2235]' : 'bg-white';
  const textPrimary = isDark ? 'text-white' : 'text-[#1B2A4A]';
  const textMuted = isDark ? 'text-gray-400' : 'text-gray-500';
  const border = isDark ? 'border-gray-700' : 'border-gray-200';

  return (
    <div className="relative">
      <button
        onClick={() => { setOpen(!open); if (unreadCount > 0) markAllRead(); }}
        className="relative p-2 rounded-full hover:bg-gray-500/10 transition-colors"
      >
        <Bell size={20} className={textPrimary} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          {/* Dropdown */}
          <div
            className={`absolute right-0 top-10 w-80 ${cardBg} border ${border} rounded-xl shadow-xl z-50 overflow-hidden`}
          >
            <div className={`px-4 py-3 border-b ${border} flex items-center justify-between`}>
              <p className={`text-sm font-bold ${textPrimary}`}>Notifications</p>
              {notifications.length > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-[#D4A843] hover:underline"
                >
                  Mark all read
                </button>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className={`px-4 py-8 text-center text-sm ${textMuted}`}>
                  No notifications yet
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => markOneRead(n.id)}
                    className={`px-4 py-3 border-b ${border} cursor-pointer hover:${isDark ? 'bg-[#0f1623]' : 'bg-gray-50'} transition-colors ${
                      !n.read ? (isDark ? 'bg-blue-900/10' : 'bg-blue-50/50') : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className={`text-sm font-semibold ${textPrimary}`}>{n.title}</p>
                        <p className={`text-xs ${textMuted} mt-0.5`}>{n.body}</p>
                        <p className={`text-xs ${textMuted} mt-1`}>
                          {new Date(n.created_at).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                      {!n.read && (
                        <span className="w-2 h-2 rounded-full bg-blue-400 mt-1 flex-shrink-0" />
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
