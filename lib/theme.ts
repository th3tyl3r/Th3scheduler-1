import { supabase } from './supabase';

export const DEFAULT_ACCENT = '#06b6d4';

// Converts hex to individual R G B values for use in rgba()
const hexToRgb = (hex: string) => {
  const clean = hex.replace('#', '');
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
};

// Applies the accent color as CSS variables on the document root
export const applyTheme = (color: string) => {
  const { r, g, b } = hexToRgb(color);
  const root = document.documentElement;
  root.style.setProperty('--accent', color);
  root.style.setProperty('--accent-r', r.toString());
  root.style.setProperty('--accent-g', g.toString());
  root.style.setProperty('--accent-b', b.toString());
};

// Loads accent color from Supabase profiles table
export const loadTheme = async (userId: string): Promise<string> => {
  try {
    const { data } = await supabase
      .from('profiles')
      .select('accent_color')
      .eq('id', userId)
      .single();
    return data?.accent_color || DEFAULT_ACCENT;
  } catch {
    return DEFAULT_ACCENT;
  }
};

// Saves accent color to Supabase profiles table
export const saveTheme = async (userId: string, color: string): Promise<void> => {
  await supabase
    .from('profiles')
    .upsert({ id: userId, accent_color: color, updated_at: new Date().toISOString() });
};

// Loads display name from Supabase profiles table
export const loadDisplayName = async (userId: string): Promise<string | null> => {
  try {
    const { data } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', userId)
      .single();
    return data?.display_name || null;
  } catch {
    return null;
  }
};

// Saves display name to Supabase profiles table
export const saveDisplayName = async (userId: string, name: string): Promise<void> => {
  await supabase
    .from('profiles')
    .upsert({ id: userId, display_name: name, updated_at: new Date().toISOString() });
};