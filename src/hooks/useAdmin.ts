import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

/**
 * Whether the signed-in user is an admin, read from `profiles.role`.
 *
 * This drives what the UI *shows*. It is not what makes the app secure —
 * the RLS policies do that, so a user who fakes this flag still cannot write
 * anything. Treat a false value as "hide the controls", not "the data is safe".
 */
export function useAdmin(): { isAdmin: boolean; isLoading: boolean } {
  const { user, isLoading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    if (authLoading) return;
    if (!user) {
      setIsAdmin(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setIsAdmin((data as { role?: string } | null)?.role === 'admin');
        setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [user, authLoading]);

  return { isAdmin, isLoading };
}
