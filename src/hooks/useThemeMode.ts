import { useMemo } from 'react';
import { useThemeContext } from '../contexts/ThemeContext';
import type { ThemeMode } from '../types/common';

/**
 * Hook personnalisé pour accéder et gérer le mode de thème
 * 
 * @returns Objet avec le mode de thème, le mode effectif, et les helpers
 * 
 * @example
 * ```tsx
 * const { mode, setMode, isDark, isLight, effectiveMode } = useThemeMode();
 * 
 * // Changer le thème
 * <Button onClick={() => setMode('dark')}>Dark Mode</Button>
 * 
 * // Conditionnel basé sur le thème
 * {isDark ? <DarkIcon /> : <LightIcon />}
 * ```
 */
export function useThemeMode(): {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  effectiveMode: 'light' | 'dark';
  isDark: boolean;
  isLight: boolean;
} {
  const { mode, setMode, effectiveMode, isDark, isLight } = useThemeContext();

  // Mémoïser pour éviter les re-rendus inutiles
  return useMemo(() => ({
    mode,
    setMode,
    effectiveMode,
    isDark,
    isLight,
  }), [mode, setMode, effectiveMode, isDark, isLight]);
}

export default useThemeMode;
