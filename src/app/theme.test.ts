import { describe, expect, it } from 'vitest';
import { brandColors, componentBorderRadius } from '../design-system';
import { darkTheme, lightTheme } from './theme';

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
    expect(lightTheme.shape.borderRadius).toBe(componentBorderRadius.container);
  });
});
