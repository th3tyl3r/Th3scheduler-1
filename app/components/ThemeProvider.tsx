'use client';
 
import { useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { loadTheme, applyTheme, DEFAULT_ACCENT } from '../../lib/theme';
 
export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const color = user ? await loadTheme(user.id) : DEFAULT_ACCENT;
      applyTheme(color);
    };
    init();
  }, []);
 
  return <>{children}</>;
}
 