import { useCallback } from 'react';

export const useNavigate = () => {
  const navigateTo = useCallback((path: string) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, []);

  return { navigateTo };
};
