import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const AuthorBetaReaders: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [betaReaders, setBetaReaders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchBetaReaders();
  }, [user]);

  const fetchBetaReaders = async () => {
    try {
      const { data, error } = await supabase
        .from('beta_reader_applications')
        .select(`
          *,
          books (title),
          profiles (username, avatar_url)
        `)
        .eq('author_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBetaReaders(data || []);
    } catch (error) {
      console.error('Error fetching beta readers:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateApplicationStatus = async (applicationId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('beta_reader_applications')
        .update({ status })
        .eq('id', applicationId);

      if (error) throw error;
      fetchBetaReaders();
    } catch (error) {
      console.error('Error updating application:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Beta Reader Applications</h1>

      {betaReaders.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No beta reader applications yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {betaReaders.map((application) => (
            <div key={application.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {application.profiles?.username || 'Unknown User'}
                  </h3>
                  <p className="text-gray-600">Book: {application.books?.title || 'Unknown Book'}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Applied: {new Date(application.created_at).toLocaleDateString()}
                  </p>
                  {application.message && (
                    <p className="text-gray-700 mt-2">{application.message}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    application.status === 'approved' ? 'bg-green-100 text-green-800' :
                    application.status === 'rejected' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {application.status || 'pending'}
                  </span>
                  {application.status === 'pending' && (
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => updateApplicationStatus(application.id, 'approved')}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => updateApplicationStatus(application.id, 'rejected')}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export { AuthorBetaReaders };
export default AuthorBetaReaders;
