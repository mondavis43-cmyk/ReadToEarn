import { supabase } from './supabase';

export const assignReferralCode = async (userId: string) => {
  const code = Math.random().toString(36).substring(2, 10).toUpperCase();
  await supabase.from('profiles').update({ referral_code: code }).eq('id', userId);
  return code;
};

export const assignAuthorReferralCode = async (userId: string) => {
  // Author codes start with A- to distinguish from reader codes
  const code = 'A-' + Math.random().toString(36).substring(2, 8).toUpperCase();
  await supabase.from('profiles').update({ author_referral_code: code }).eq('id', userId);
  return code;
};
