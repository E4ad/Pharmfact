import { describe, expect, it } from 'vitest';
import {
  brandColors,
  componentBorderRadius,
  lightThemeColors,
  spacingScalePx,
  typographyScale,
} from './tokens';

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

  it('keeps pills fully rounded and cards larger than inputs', () => {
    expect(componentBorderRadius.chip).toBeGreaterThan(1000);
    expect(componentBorderRadius.card).toBeGreaterThan(componentBorderRadius.input);
  });

  it('keeps light theme text and paper colors stable', () => {
    expect(lightThemeColors.background.paper).toBe('#ffffff');
    expect(lightThemeColors.text.primary).toBe('#202124');
  });
});
