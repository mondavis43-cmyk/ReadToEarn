import { supabase } from './supabase';

export const assignReferralCode = async (userId: string) => {
  const code = Math.random().toString(36).substring(2, 10).toUpperCase();
  await supabase.from('profiles').update({ referral_code: code }).eq('id', userId);
  return code;
};
