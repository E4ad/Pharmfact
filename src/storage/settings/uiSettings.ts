export type RuntimeShadowIntensity = 'none' | 'soft' | 'elevated';

export type RuntimeDesignTokenOverrides = {
  surfaceRadius?: number;
  controlRadius?: number;
  iconRadius?: number;
  borderWidth?: number;
  primaryHue?: number;
  shadowIntensity?: RuntimeShadowIntensity;
};

export type UiSettings = {
  themeMode: "light" | "dark" | "system";
  primaryColor?: string;
  secondaryColor?: string;
  designTokenOverrides?: RuntimeDesignTokenOverrides;
};

export function createDefaultUiSettings(): UiSettings {
  return {
    themeMode: "system",
  };
}
