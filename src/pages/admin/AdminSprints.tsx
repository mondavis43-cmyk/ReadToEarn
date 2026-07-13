import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from '../hooks/useNavigate';

export const AdminSprints = () => {
  const { user } = useAuth();
  const { navigateTo } = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sprints, setSprints] = useState<any[]>([]);

  useEffect(() => {
    checkAdminAccess();
  }, [user]);

  // SECURITY FIX #17: Check admin authorization before loading data
  const checkAdminAccess = async () => {
    if (!user) {
      navigateTo('/login');
      return;
    }

    try {
      // Query profiles to check admin role
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (error || profile?.role !== 'admin') {
        console.warn('[AdminSprints] Unauthorized access attempt by user:', user.id);
        navigateTo('/');
        return;
      }

      setIsAdmin(true);
      loadData();
    } catch (err) {
      console.error('[AdminSprints] Error checking admin access:', err);
      navigateTo('/');
    }
  };

  const loadData = async () => {
    try {
      const { data: sprintsData } = await supabase
        .from('sprints')
        .select('*')
        .order('start_date', { ascending: true });
      
      setSprints(sprintsData || []);
    } catch (err) {
      console.error('[AdminSprints] Error loading sprints:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-gray-400">Admin privileges required.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      <header className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="font-serif text-3xl text-white">Admin: Sprints</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-12">
        <div className="space-y-4">
          {sprints.map((sprint) => (
            <div key={sprint.id} className="bg-[#1a1a1a] rounded-lg p-6 border border-gray-800">
              <h3 className="text-lg font-semibold text-white">{sprint.title}</h3>
              <p className="text-gray-400 text-sm mt-1">Status: {sprint.status}</p>
              <p className="text-gray-400 text-sm">Entry Fee: ${sprint.entry_fee}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};
