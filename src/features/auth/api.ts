import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/api/supabase';

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  role: string;
  department: string;
  title: string;
}

export const useUserProfiles = () => {
  return useQuery({
    queryKey: ['user-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, full_name, email, role, department, title')
        .order('role', { ascending: true }); // Just sort by role or whatever

      if (error) {
        console.error('[Supabase RLS/Fetch] Fetch User Profiles Error:', error);
        // Fallback dön, crash olmasın
        return [];
      }
      
      return (data as UserProfile[]) || [];
    },
    staleTime: 5 * 60 * 1000, // 5 mins
  });
};
