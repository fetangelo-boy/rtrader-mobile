export const themeColors: {
  primary:     { light: string; dark: string };
  accent:      { light: string; dark: string };
  neonPink:    { light: string; dark: string };
  neonGreen:   { light: string; dark: string };
  neonGold:    { light: string; dark: string };
  neonOrange:  { light: string; dark: string };
  background:  { light: string; dark: string };
  surface:     { light: string; dark: string };
  surfaceHigh: { light: string; dark: string };
  foreground:  { light: string; dark: string };
  muted:       { light: string; dark: string };
  border:      { light: string; dark: string };
  borderGlow:  { light: string; dark: string };
  success:     { light: string; dark: string };
  warning:     { light: string; dark: string };
  error:       { light: string; dark: string };
  tint:        { light: string; dark: string };
};

declare const themeConfig: {
  themeColors: typeof themeColors;
};

export default themeConfig;
