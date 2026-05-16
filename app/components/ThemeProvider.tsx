// components/ThemeProvider.tsx
'use client';

import { useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { loadTheme, applyTheme } from '../../lib/theme';

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const color = await loadTheme(user.id);
      applyTheme(color);
    };
    init();
  }, []);

  return <>{children}</>;
}