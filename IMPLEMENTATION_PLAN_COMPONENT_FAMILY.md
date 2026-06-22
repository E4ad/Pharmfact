# Component Family Consistency - Implementation Plan

## Executive Summary

**Goal**: Ensure all interactive components share the same visual DNA by replacing hardcoded values with design tokens throughout the codebase.

**Current State**: The project has a well-structured design system in `src/design-system/` with tokens for colors, typography, spacing, border-radius, shadows, and components. However, there are numerous hardcoded values that bypass these tokens, leading to visual inconsistency.

**Issues Identified**:
1. Hardcoded `borderRadius: 9999` (should use `borderRadiusScale.full`)
2. Hardcoded `borderRadius: 0` (should use `borderRadiusScale.none`)
3. Hardcoded `1px` border widths (should use `borderWidth.thin`)
4. Inconsistent shadow usage
5. Tile/card shadow issue on homepage (SurfaceCard with both border and shadow)

## Design System Analysis

### Current Token Structure

```
src/design-system/tokens/
├── borderRadius.ts    # borderRadiusScale: none(0), sm(6), md(12), lg(18), xl(24), 2xl(32), full(9999)
├── colors.ts          # brandColors, neutralColors, semanticColors, lightThemeColors, darkThemeColors
├── component.ts       # componentHeight, borderWidth, componentBorderRadiusMap, componentPadding
├── shadows.ts         # lightShadows, darkShadows, componentShadows
├── spacing.ts         # spacingScalePx, spacingScale, contextSpacing
├── typography.ts      # typographyScale, fontWeights, lineHeights, letterSpacings, fontFamilies
├── zIndex.ts          # zIndexScale
└── animation.ts       # animationTokens
```

### Token Mapping (What Should Be Used)

| Purpose | Token | Value |
|---------|-------|-------|
| Border Radius - Full/Pill | `borderRadiusScale.full` | 9999 |
| Border Radius - None | `borderRadiusScale.none` | 0 |
| Border Radius - Small | `borderRadiusScale.sm` | 6px |
| Border Radius - Medium | `borderRadiusScale.md` | 12px |
| Border Radius - Large | `borderRadiusScale.lg` | 18px |
| Border Width - Thin | `borderWidth.thin` | 1 |
| Border Width - Thick | `borderWidth.thick` | 4 |
| Component Height - MD | `componentHeight.md` | 40 |
| Component Height - SM | `componentHeight.sm` | 32 |
| Component Height - LG | `componentHeight.lg` | 48 |
| Shadows | `componentShadows.card.light/dark` | varies |

## Component Family Consistency Checklist

### Border Radius
- [x] Buttons: Use `componentBorderRadius.button.default` (md: 12) or `.pill` (full: 9999)
- [x] Inputs/Selects: Use `componentBorderRadius.input` (sm: 6)
- [x] Cards: Use `componentBorderRadius.card` (lg: 18)
- [x] Chips/Badges: Use `componentBorderRadius.chip` (full: 9999)
- [ ] **ISSUE**: Hardcoded `9999` in multiple button components
- [ ] **ISSUE**: Hardcoded `0` in MissionsPage

### Border Width
- [x] Tokens defined: `borderWidth.thin` (1px), `borderWidth.thick` (4px)
- [ ] **ISSUE**: Hardcoded `1px` in SurfaceCard, ActionCard, OptionActionCard, etc.
- [ ] **ISSUE**: Should use `borderWidth.thin` token

### Component Heights
- [x] Tokens defined: `componentHeight.sm` (32), `.md` (40), `.lg` (48)
- [x] Buttons in theme.ts use `componentHeight.md`
- [ ] **ISSUE**: Need to verify all buttons match input heights

### Shadows
- [x] Tokens defined: `componentShadows.card`, `.button`, `.modal`, `.dropdown`, `.tooltip`
- [ ] **ISSUE**: SurfaceCard uses hardcoded border + shadow combination

## P0 Issues (Critical - Breaking Visual Consistency)

### 1. Hardcoded borderRadius: 9999
**Files affected:**
- `src/features/options/OptionsPage.tsx` (lines 981, 984)
- `src/features/pharmaciens/PharmacienFormModal.tsx` (lines 267, 270)
- `src/features/financial/FinancialPage.tsx` (lines 561, 609)
- `src/features/missions/MissionFormPage.tsx` (lines 419, 515, 936)
- `src/features/pharmacies/PharmacieFormModal.tsx` (lines 237, 240)

**Fix**: Replace `borderRadius: 9999` with `borderRadius: borderRadiusScale.full`

**Impact**: High - These are pill buttons that should use the full radius token

### 2. Hardcoded borderRadius: 0
**Files affected:**
- `src/features/missions/MissionsPage.tsx` (line 477)

**Fix**: Replace `borderRadius: 0` with `borderRadius: borderRadiusScale.none`

**Impact**: Medium - Consistency issue

### 3. SurfaceCard Shadow Issue (Homepage Tiles)
**Problem**: SurfaceCard has both `border: '1px solid'` and `boxShadow`, which can create visual artifacts. The border adds to the element's dimensions, potentially causing shadow clipping or odd visual effects.

**Current code** (SurfaceCard.tsx:17-21):
```tsx
border: '1px solid',
borderColor: theme.palette.divider,
borderRadius: componentBorderRadius.card,
bgcolor: 'background.paper',
boxShadow: theme.palette.mode === 'dark' ? componentShadows.card.dark : componentShadows.card.light,
```

**Issue**: The border is adding 1px to each side, which means the shadow is effectively inset by 1px on all sides. This can make shadows look "cut off" or too tight.

**Fix Options**:
1. Remove the border and rely only on shadow for elevation (recommended for card components)
2. Use `outline` instead of `border` to avoid affecting layout
3. Adjust shadow spread to account for border width

**Recommendation**: For cards, the modern approach is to use shadow-only elevation without borders. The border can be kept for dark mode if needed, but should be consistent.

**Impact**: High - This affects the visual appearance of all tiles/cards on the homepage

### 4. Hardcoded Border Width
**Files affected:**
- `src/components/SurfaceCard.tsx` (line 17): `border: '1px solid'`
- `src/components/ActionCard.tsx` (line 30): `border: '1px solid'`
- `src/components/OptionActionCard.tsx` (line 69): `border: '1px solid'`
- `src/components/EmptyState.tsx` (lines 19, 36)
- `src/components/PageHeader.tsx` (line 70)
- `src/features/activity/ActivityPage.tsx` (line 34)
- `src/features/missions/MissionsPage.tsx` (lines 542, 556)

**Fix**: Replace `1px` with `borderWidth.thin` and use proper token for border color

**Note**: The border color should use theme tokens: `theme.palette.divider` is correct for light mode, but needs dark mode equivalent.

## P1 Issues (Should Fix for Consistency)

### 1. Hardcoded spacing values
Many components use numeric spacing (p: 2, p: 3, gap: 2, etc.) instead of spacing tokens.

**Recommendation**: Create a migration plan to replace numeric spacing with `spacingScale` tokens where it makes sense, but this is lower priority than the P0 issues.

### 2. Focus ring consistency
Some components use hardcoded focus ring values.

**Current**: `outline: 3px solid #2563eb` in globals.css
**Theme tokens**: Uses `brandColors.primary[600]` which is `#2563eb`

**Status**: Actually consistent, but should use token reference.

## Implementation Plan

### Phase 1: P0 Fixes (Immediate - Prevents Breaking Changes)

#### Task 1: Fix hardcoded borderRadius values
- Create a codemod or manual find/replace for `borderRadius: 9999` → `borderRadius: borderRadiusScale.full`
- Fix `borderRadius: 0` → `borderRadius: borderRadiusScale.none`
- Files: 7 files, ~13 occurrences

#### Task 2: Fix SurfaceCard shadow/border issue
- Update SurfaceCard to use consistent elevation approach
- Option A: Remove border, use shadow only
- Option B: Use outline instead of border
- Option C: Adjust shadow to account for border

**Recommendation**: Option A - Remove border from SurfaceCard and rely on shadow for elevation. This is the most modern approach and fixes the tile shadow issue.

#### Task 3: Standardize border width usage
- Replace hardcoded `1px` with `borderWidth.thin`
- Ensure border colors use theme tokens properly

### Phase 2: P1 Improvements (Consistency)

#### Task 4: Audit all component heights
- Verify buttons and inputs share same heights
- Check form layouts for height mismatches

#### Task 5: Shadow token usage
- Ensure all shadows use `componentShadows` tokens
- Remove any hardcoded shadow strings

### Phase 3: Verification

#### Task 6: Theme consistency check
- Verify light and dark mode use same tokens
- Check that all color references use theme palette

#### Task 7: Visual regression testing
- Test homepage tiles for shadow appearance
- Verify all buttons have consistent radii
- Check all form components for visual consistency

## File-by-File Fixes

### High Priority (P0)

1. **SurfaceCard.tsx**
   - Issue: Border + shadow combination causing visual artifacts
   - Fix: Remove border or adjust shadow
   - Line: 17

2. **OptionsPage.tsx**
   - Issue: Hardcoded `borderRadius: 9999`
   - Fix: Use `borderRadiusScale.full`
   - Lines: 981, 984

3. **PharmacienFormModal.tsx**
   - Issue: Hardcoded `borderRadius: 9999`
   - Fix: Use `borderRadiusScale.full`
   - Lines: 267, 270

4. **FinancialPage.tsx**
   - Issue: Hardcoded `borderRadius: 9999`
   - Fix: Use `borderRadiusScale.full`
   - Lines: 561, 609

5. **MissionFormPage.tsx**
   - Issue: Hardcoded `borderRadius: 9999`
   - Fix: Use `borderRadiusScale.full`
   - Lines: 419, 515, 936

6. **PharmacieFormModal.tsx**
   - Issue: Hardcoded `borderRadius: 9999`
   - Fix: Use `borderRadiusScale.full`
   - Lines: 237, 240

7. **MissionsPage.tsx**
   - Issue: Hardcoded `borderRadius: 0`
   - Fix: Use `borderRadiusScale.none`
   - Line: 477

### Medium Priority (P1)

1. **All components with borders**
   - Replace `1px` with `borderWidth.thin`
   - Ensure border colors use theme tokens

## Testing Strategy

1. **Visual Testing**: 
   - Check homepage tiles for shadow appearance
   - Verify button radii consistency
   - Test light and dark modes

2. **Automated Testing**:
   - Run existing tests to ensure no regressions
   - Add snapshot tests for critical components

3. **Code Review**:
   - Ensure all changes use tokens from design-system
   - No new hardcoded values introduced

## Success Criteria

- [ ] No hardcoded `9999` for border radius
- [ ] No hardcoded `0` for border radius
- [ ] No hardcoded `1px` for border width (use tokens)
- [ ] SurfaceCard tiles have correct shadow appearance
- [ ] All components use design system tokens
- [ ] Light and dark modes work correctly
- [ ] No visual regressions in existing functionality

## Risk Mitigation

1. **Breaking Changes**: All changes are visual only, no functional changes
2. **Rollback Plan**: Git commits for each logical change, easy to revert
3. **Testing**: Comprehensive visual testing before merge
4. **Staged Rollout**: Fix P0 issues first, then P1

## Next Steps

1. Implement P0 fixes (hardcoded values)
2. Fix SurfaceCard shadow issue
3. Verify with senior UX architect
4. Implement P1 improvements
5. Final testing and documentation
