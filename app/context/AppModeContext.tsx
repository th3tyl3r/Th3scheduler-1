'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../../lib/supabase';

export type AppMode = 'personal' | 'crew';

interface AppModeContextValue {
  mode: AppMode;
  teamId: number | null;
  setMode: (mode: AppMode) => void;
  toggleMode: () => void;
}

const AppModeContext = createContext<AppModeContextValue>({
  mode: 'personal',
  teamId: null,
  setMode: () => {},
  toggleMode: () => {},
});

export function AppModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<AppMode>('personal');
  const [teamId, setTeamId] = useState<number | null>(null);

  useEffect(() => {
    const cached = localStorage.getItem('appMode') as AppMode | null;
    if (cached === 'crew' || cached === 'personal') setModeState(cached);

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let { data: team } = await supabase
        .from('teams')
        .select('id, mode')
        .eq('owner_id', user.id)
        .maybeSingle();

      if (!team) {
        const { data: newTeam } = await supabase
          .from('teams')
          .insert({ owner_id: user.id, name: 'My Team', mode: 'personal' })
          .select('id, mode')
          .single();
        team = newTeam;
      }

      if (team) {
        setTeamId(team.id);
        const dbMode = team.mode as AppMode;
        setModeState(dbMode);
        localStorage.setItem('appMode', dbMode);
      }
    };

    init();
  }, []);

  const setMode = async (newMode: AppMode) => {
    setModeState(newMode);
    localStorage.setItem('appMode', newMode);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('teams').update({ mode: newMode }).eq('owner_id', user.id);
  };

  const toggleMode = () => setMode(mode === 'personal' ? 'crew' : 'personal');

  return (
    <AppModeContext.Provider value={{ mode, teamId, toggleMode, setMode }}>
      {children}
    </AppModeContext.Provider>
  );
}

export const useAppMode = () => useContext(AppModeContext);