import { describe, expect, it } from 'vitest';
import { brandColors, componentBorderRadius, normalizeRuntimeDesignTokenOverrides } from '../design-system';
import { darkTheme, getTheme, lightTheme } from './theme';

describe('application theme', () => {
  it('uses design tokens for the light primary palette', () => {
    expect(lightTheme.palette.primary.main).toBe(brandColors.primary[600]);
    expect(lightTheme.palette.primary.dark).toBe(brandColors.primary[700]);
  });

  it('keeps the existing dark primary color for contrast', () => {
    expect(darkTheme.palette.primary.main).toBe('#90caf9');
    expect(darkTheme.palette.primary.contrastText).toBe('#000000');
  });

  it('uses the component radius token as the default shape radius', () => {
    expect(lightTheme.shape.borderRadius).toBe(componentBorderRadius.card);
  });

  it('applies safe runtime token overrides to the theme', () => {
    const theme = getTheme('light', { surfaceRadius: 12, controlRadius: 8, iconRadius: 6, borderWidth: 1.5, primaryHue: 210, shadowIntensity: 'elevated' });
    const expected = normalizeRuntimeDesignTokenOverrides({ surfaceRadius: 12, controlRadius: 8, iconRadius: 6, borderWidth: 1.5, primaryHue: 210, shadowIntensity: 'elevated' });

    expect(theme.runtimeTokens.surfaceRadius).toBe(expected.surfaceRadius);
    expect(theme.runtimeTokens.controlRadius).toBe(expected.controlRadius);
    expect(theme.runtimeTokens.iconRadius).toBe(expected.iconRadius);
    expect(theme.runtimeTokens.borderWidth).toBe(expected.borderWidth);
    expect(theme.runtimeTokens.primaryHue).toBe(expected.primaryHue);
    expect(theme.runtimeTokens.shadowIntensity).toBe(expected.shadowIntensity);
    expect(theme.palette.primary.main).toBe(expected.primary.light.main);
  });

  it('clamps unsafe runtime token overrides', () => {
    const theme = getTheme('light', { surfaceRadius: 99, controlRadius: -4, iconRadius: 50, borderWidth: 10, primaryHue: 360, shadowIntensity: 'invalid' as never });

    expect(theme.runtimeTokens.surfaceRadius).toBe(24);
    expect(theme.runtimeTokens.controlRadius).toBe(0);
    expect(theme.runtimeTokens.iconRadius).toBe(12);
    expect(theme.runtimeTokens.borderWidth).toBe(2);
    expect(theme.runtimeTokens.primaryHue).toBe(359);
    expect(theme.runtimeTokens.shadowIntensity).toBe('soft');
  });
});
