import { useAppState, updateAppState, type UiSettings } from '../storage/localStore';
import { getSystemMode, type ThemeMode } from '../app/theme';

/**
 * Hook pour gérer le thème de l'application (clair/sombre/système)
 * 
 * @returns {Object} - Objet avec le mode actuel, fonctions pour le modifier
 * @returns {ThemeMode} mode - Le mode de thème actuel
 * @returns {Function} setMode - Fonction pour définir un mode spécifique
 * @returns {Function} toggle - Fonction pour basculer entre les modes
 */
export function useTheme() {
  const state = useAppState();
  const uiSettings: UiSettings = state.uiSettings;

  /**
   * Définir le mode de thème
   * @param mode - Le mode à définir ('light', 'dark', 'system')
   */
  const setMode = (mode: ThemeMode): void => {
    if (uiSettings.themeMode === mode) return;
    
    // Mettre à jour le state global
    updateAppState((current) => ({
      ...current,
      uiSettings: {
        ...current.uiSettings,
        themeMode: mode,
      },
    }));
  };

  /**
   * Basculer entre les modes de thème (light -> dark -> system -> light)
   */
  const toggle = (): void => {
    const modes: ThemeMode[] = ['light', 'dark', 'system'];
    const currentIndex = modes.indexOf(uiSettings.themeMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setMode(modes[nextIndex]);
  };

  /**
   * Détecter si le mode système est actif et correspond au dark
   */
  const isSystemDark = (): boolean => {
    return uiSettings.themeMode === 'system' && getSystemMode() === 'dark';
  };

  /**
   * Obtenir le mode effectif (résout 'system' en 'light' ou 'dark')
   */
  const effectiveMode: ThemeMode = (
    uiSettings.themeMode === 'system' ? getSystemMode() : uiSettings.themeMode
  );

  return {
    mode: uiSettings.themeMode,
    effectiveMode,
    setMode,
    toggle,
    isDark: effectiveMode === 'dark',
    isLight: effectiveMode === 'light',
    isSystem: uiSettings.themeMode === 'system',
    isSystemDark,
  };
}
