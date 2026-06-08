export type UiSettings = {
  themeMode: "light" | "dark" | "system";
  primaryColor?: string;
  secondaryColor?: string;
};

export function createDefaultUiSettings(): UiSettings {
  return {
    themeMode: "system",
  };
}