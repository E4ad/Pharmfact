import { describe, expect, it } from 'vitest';
import {
  brandColors,
  componentBorderRadius,
  lightThemeColors,
  spacingScalePx,
  typographyScale,
} from './tokens/index';

describe('design tokens', () => {
  it('preserves the Pharmfact primary brand color', () => {
    expect(brandColors.primary[600]).toBe('#2563eb');
  });

  it('keeps the base typography accessible', () => {
    expect(typographyScale.base).toBe(16);
    expect(typographyScale.sm).toBeGreaterThanOrEqual(14);
  });

  it('uses a 4px spacing foundation', () => {
    expect(spacingScalePx['2xs']).toBe(4);
    expect(spacingScalePx.md).toBe(16);
    expect(spacingScalePx['3xl']).toBe(48);
  });

  it('uses 1px border radius as default for sharp corners', () => {
    // Card and surface components use 1px for sharp corners
    expect(componentBorderRadius.card).toBe(1);
    expect(componentBorderRadius.hero).toBe(1);
    expect(componentBorderRadius.dashboardCard).toBe(1);
    expect(componentBorderRadius.settingsCard).toBe(1);
    
    // Buttons use 1px for sharp corners
    expect(componentBorderRadius.button.default).toBe(1);
    expect(componentBorderRadius.button.square).toBe(0);
    
    // Inputs use 1px for sharp corners
    expect(componentBorderRadius.input).toBe(1);
    expect(componentBorderRadius.select).toBe(1);
    expect(componentBorderRadius.textarea).toBe(1);
    
    // Chips, badges, avatars use full rounding (pill shape)
    expect(componentBorderRadius.chip).toBe(9999);
    expect(componentBorderRadius.badge).toBe(9999);
    expect(componentBorderRadius.avatar).toBe(9999);
    expect(componentBorderRadius.status).toBe(9999);
  });

  it('keeps light theme text and paper colors stable', () => {
    expect(lightThemeColors.background.paper).toBe('#ffffff');
    expect(lightThemeColors.text.primary).toBe('#202124');
  });
});
