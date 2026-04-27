import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

interface AdminRouteProps {
  children: React.ReactNode;
}

export const AdminRoute = ({ children }: AdminRouteProps) => {
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = '/login'; return; }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role === 'admin') {
        setIsAdmin(true);
      } else {
        window.location.href = '/';
      }
      setChecking(false);
    };
    check();
  }, []);

  if (checking) return null;
  if (!isAdmin) return null;
  return <>{children}</>;
};
